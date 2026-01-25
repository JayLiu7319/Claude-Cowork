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
        const pids = new Set<number>();

        if (process.platform === "win32") {
            const output = execSync("netstat -ano -p tcp", { stdio: "pipe" }).toString();
            for (const line of output.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const parts = trimmed.split(/\s+/);
                if (parts.length < 4) continue;
                const localAddress = parts[1] || "";
                const pidValue = parts[parts.length - 1] || "";
                if (localAddress.endsWith(`:${DEV_PORT}`) || localAddress.includes(`]:${DEV_PORT}`)) {
                    const pid = Number(pidValue);
                    if (Number.isFinite(pid)) {
                        pids.add(pid);
                    }
                }
            }
        } else {
            const commands: Array<{ cmd: string; parser: (output: string) => number[] }> = [
                {
                    cmd: `lsof -ti:${DEV_PORT}`,
                    parser: (output) =>
                        output
                            .split(/\s+/)
                            .map((value) => Number(value))
                            .filter((value) => Number.isFinite(value))
                },
                {
                    cmd: `fuser ${DEV_PORT}/tcp`,
                    parser: (output) => {
                        const cleaned = output.replace(`${DEV_PORT}/tcp:`, "");
                        return cleaned
                            .split(/\s+/)
                            .map((value) => Number(value))
                            .filter((value) => Number.isFinite(value));
                    }
                },
                {
                    cmd: `ss -lptn "sport = :${DEV_PORT}"`,
                    parser: (output) => {
                        const matches = output.matchAll(/pid=(\d+)/g);
                        const ids: number[] = [];
                        for (const match of matches) {
                            const pid = Number(match[1]);
                            if (Number.isFinite(pid)) {
                                ids.push(pid);
                            }
                        }
                        return ids;
                    }
                }
            ];

            for (const { cmd, parser } of commands) {
                try {
                    const output = execSync(cmd, { stdio: "pipe" }).toString();
                    for (const pid of parser(output)) {
                        pids.add(pid);
                    }
                    if (pids.size > 0) break;
                } catch {
                    // Try next strategy
                }
            }
        }

        for (const pid of pids) {
            try {
                process.kill(pid);
            } catch {
                // Ignore permissions or already-exited processes
            }
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
        title: "观复君Cowork",
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
