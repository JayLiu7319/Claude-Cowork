import { ipcMain, dialog, IpcMainEvent, IpcMainInvokeEvent, BrowserWindow } from "electron";
import log from 'electron-log';
import { getStaticData, pollResources } from "./test.js";
import { handleClientEvent } from "./handlers/index.js";
import { getSessionStore } from "./libs/session/index.js";
import { generateSessionTitle, listFilesInDirectory, getRecentFiles, addRecentFile, readDirectoryTree } from "./libs/utils/index.js";
import { readFileForPreview } from "./libs/utils/filePreviewUtils.js";
import { saveApiConfig, loadDefaultCwd, saveDefaultCwd, type ApiConfig, getCurrentApiConfig, loadBrandConfig, loadAppConfig, saveAppConfig } from "./libs/config/index.js";
import { loadGlobalCommands, readCommandContent, loadGlobalSkills, readSkillContent } from "./libs/features/index.js";
import { getLanguage, changeLanguage } from "./i18n.js";
import { ClientEvent } from "./types.js";
import { setTitleBarOverlayMode } from "./window-manager.js";

export function registerAllIpcHandlers(mainWindow: BrowserWindow): void {
    const brandConfig = loadBrandConfig();

    // Initialize language from config or system default
    const appConfig = loadAppConfig();
    const initialLang = appConfig?.language;
    if (initialLang) {
        changeLanguage(initialLang);
    }

    pollResources(mainWindow);

    // ... existing code ...

    // Handle language request from renderer process
    ipcMainHandle("get-language", () => {
        // Try config first
        const config = loadAppConfig();
        if (config?.language) {
            return config.language;
        }
        return getLanguage();
    });

    // Handle changing language
    ipcMainHandle("set-language", (_: IpcMainInvokeEvent, language: string) => {
        try {
            // Update in-memory i18n
            changeLanguage(language);

            // Persist to config
            saveAppConfig({ language });

            return { success: true };
        } catch (error) {
            console.error("Failed to set language:", error);
            throw error;
        }
    });

    ipcMainHandle("getStaticData", () => {
        return getStaticData();
    });

    ipcMainHandle("get-log-path", () => {
        return log.transports.file.getFile().path; // Returns the full path to the log file
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
        return getSessionStore().listRecentCwds(boundedLimit);
    });

    // Handle directory selection
    ipcMainHandle("select-directory", async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
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


    // Handle brand config request from renderer process
    ipcMainHandle("get-brand-config", () => {
        return brandConfig;
    });

    // Handle slash commands loading
    ipcMainHandle("load-commands", async () => {
        return await loadGlobalCommands();
    });

    // Handle reading command content
    ipcMainHandle("read-command-content", async (_: IpcMainInvokeEvent, filePath: string) => {
        return await readCommandContent(filePath);
    });

    // Handle skills loading
    ipcMainHandle("load-skills", async () => {
        return await loadGlobalSkills();
    });

    // Handle reading skill content
    ipcMainHandle("read-skill-content", async (_: IpcMainInvokeEvent, filePath: string) => {
        return await readSkillContent(filePath);
    });

    // Handle file picker operations
    ipcMainHandle("list-files", async (_: IpcMainInvokeEvent, dirPath: string) => {
        return await listFilesInDirectory(dirPath);
    });

    ipcMainHandle("get-recent-files", async (_: IpcMainInvokeEvent, sessionId: string) => {
        return getRecentFiles(sessionId);
    });

    ipcMainHandle("add-recent-file", async (_: IpcMainInvokeEvent, filePath: string, sessionId: string) => {
        addRecentFile(filePath, sessionId);
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
        return await readDirectoryTree(dirPath, depth);
    });

    // Handle file preview (images and PDFs)
    ipcMainHandle("read-file-for-preview", (_: IpcMainInvokeEvent, filePath: string) => {
        return readFileForPreview(filePath);
    });

    ipcMainHandle("set-preview-titlebar-style", (_: IpcMainInvokeEvent, mode: "default" | "preview") => {
        setTitleBarOverlayMode(mode);
    });
}

// Helper to wrapping ipcMain.handle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ipcMainHandle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any) {
    ipcMain.handle(channel, listener);
}
