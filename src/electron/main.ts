import { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu, IpcMainEvent, IpcMainInvokeEvent } from "electron"
import { execSync } from "child_process";
import { ipcMainHandle, isDev, DEV_PORT } from "./util.js";
import { getPreloadPath, getUIPath, getIconPath } from "./pathResolver.js";
import { getStaticData, pollResources, stopPolling } from "./test.js";
import { handleClientEvent, sessions, cleanupAllSessions } from "./ipc-handlers.js";
import { generateSessionTitle } from "./libs/util.js";
import { saveApiConfig, loadDefaultCwd, saveDefaultCwd } from "./libs/config-store.js";
import { getCurrentApiConfig } from "./libs/claude-settings.js";
import { loadGlobalCommands, readCommandContent } from "./libs/commands.js";
import { initI18n, getLanguage } from "./i18n.js";
import type { ClientEvent } from "./types.js";
import type { ApiConfig } from "./libs/config-store.js";
import "./libs/claude-settings.js";

let cleanupComplete = false;
let mainWindow: BrowserWindow | null = null;

function killViteDevServer(): void {
    if (!isDev()) return;
    try {
        if (process.platform === 'win32') {
            execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${DEV_PORT}') do taskkill /PID %a /F`, { stdio: 'ignore', shell: 'cmd.exe' });
        } else {
            execSync(`lsof -ti:${DEV_PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
        }
    } catch {
        // Process may already be dead
    }
}

function cleanup(): void {
    if (cleanupComplete) return;
    cleanupComplete = true;

    globalShortcut.unregisterAll();
    stopPolling();
    cleanupAllSessions();
    killViteDevServer();
}

function handleSignal(): void {
    cleanup();
    app.quit();
}

// Initialize everything when app is ready
app.on("ready", () => {
    // Initialize i18n for main process
    initI18n();

    Menu.setApplicationMenu(null);
    // Setup event handlers
    app.on("before-quit", cleanup);
    app.on("will-quit", cleanup);
    app.on("window-all-closed", () => {
        cleanup();
        app.quit();
    });

    process.on("SIGTERM", handleSignal);
    process.on("SIGINT", handleSignal);
    process.on("SIGHUP", handleSignal);

    // Create main window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: getPreloadPath(),
        },
        icon: getIconPath(),
        titleBarStyle: "hiddenInset",
        backgroundColor: "#FAF9F6",
        trafficLightPosition: { x: 15, y: 18 }
    });

    if (isDev()) {
        mainWindow.loadURL(`http://localhost:${DEV_PORT}`)
    } else {
        mainWindow.loadFile(getUIPath());
    }

    globalShortcut.register('CommandOrControl+Q', () => {
        cleanup();
        app.quit();
    });

    pollResources(mainWindow);

    ipcMainHandle("getStaticData", () => {
        return getStaticData();
    });

    // Handle client events
    ipcMain.on("client-event", (_: IpcMainEvent, event: ClientEvent) => {
        handleClientEvent(event);
    });

    // Handle session title generation
    ipcMainHandle("generate-session-title", async (_: IpcMainInvokeEvent, userInput: string | null) => {
        return await generateSessionTitle(userInput);
    });

    // Handle recent cwds request
    ipcMainHandle("get-recent-cwds", (_: IpcMainInvokeEvent, limit?: number) => {
        const boundedLimit = limit ? Math.min(Math.max(limit, 1), 20) : 8;
        return sessions.listRecentCwds(boundedLimit);
    });

    // Handle directory selection
    ipcMainHandle("select-directory", async () => {
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ['openDirectory']
        });

        if (result.canceled) {
            return null;
        }

        return result.filePaths[0];
    });

    // Handle API config
    ipcMainHandle("get-api-config", () => {
        return getCurrentApiConfig();
    });

    ipcMainHandle("check-api-config", () => {
        const config = getCurrentApiConfig();
        return { hasConfig: config !== null, config };
    });

    ipcMainHandle("save-api-config", (_: IpcMainInvokeEvent, config: ApiConfig) => {
        try {
            saveApiConfig(config);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    // Handle language request from renderer process
    ipcMainHandle("get-language", () => {
        return getLanguage();
    });

    // Handle slash commands loading
    ipcMainHandle("load-commands", async () => {
        return await loadGlobalCommands();
    });

    // Handle reading command content
    ipcMainHandle("read-command-content", async (_: IpcMainInvokeEvent, filePath: string) => {
        return await readCommandContent(filePath);
    });

    // Handle default cwd
    ipcMainHandle("get-default-cwd", () => {
        return loadDefaultCwd();
    });

    ipcMainHandle("set-default-cwd", (_: IpcMainInvokeEvent, cwd: string) => {
        saveDefaultCwd(cwd);
    });

    // Handle reading directory tree for right panel
    ipcMainHandle("read-directory-tree", async (_: IpcMainInvokeEvent, dirPath: string, depth: number = 2) => {
        const fs = await import("fs/promises");
        const path = await import("path");

        interface DirectoryEntry {
            name: string;
            path: string;
            isDirectory: boolean;
            children?: DirectoryEntry[];
        }

        // Patterns to ignore
        const ignorePatterns = [
            'node_modules',
            '.git',
            '.svn',
            '.hg',
            '__pycache__',
            '.DS_Store',
            'Thumbs.db',
            '.vscode',
            '.idea',
            'dist',
            'build',
            '.next',
            '.nuxt',
            'coverage',
            '.cache',
            '.turbo'
        ];

        async function readDir(currentPath: string, currentDepth: number): Promise<DirectoryEntry[]> {
            if (currentDepth <= 0) return [];

            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                const result: DirectoryEntry[] = [];

                for (const entry of entries) {
                    // Skip ignored patterns
                    if (ignorePatterns.includes(entry.name) || entry.name.startsWith('.')) {
                        continue;
                    }

                    const fullPath = path.join(currentPath, entry.name);
                    const isDir = entry.isDirectory();

                    const item: DirectoryEntry = {
                        name: entry.name,
                        path: fullPath,
                        isDirectory: isDir
                    };

                    if (isDir && currentDepth > 1) {
                        item.children = await readDir(fullPath, currentDepth - 1);
                    } else if (isDir) {
                        item.children = []; // Mark as directory but don't load children yet
                    }

                    result.push(item);
                }

                // Sort: directories first, then files, alphabetically
                result.sort((a, b) => {
                    if (a.isDirectory !== b.isDirectory) {
                        return a.isDirectory ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                });

                return result;
            } catch {
                return [];
            }
        }

        return await readDir(dirPath, depth);
    });
})
