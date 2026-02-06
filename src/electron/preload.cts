import electron from "electron";
import type {
    EventPayloadMapping,
    IpcArgsMapping,
    Statistics,
    ClientEvent,
    ServerEvent,
    ApiConfig
} from "./types.js";

try {
    require('electron-log/preload');
} catch (e) {
    console.error('Failed to load electron-log/preload:', e);
}

electron.contextBridge.exposeInMainWorld("electron", {
    subscribeStatistics: (callback: (stats: Statistics) => void) =>
        ipcOn("statistics", stats => {
            callback(stats);
        }),
    getStaticData: () => ipcInvoke("getStaticData"),

    // Claude Agent IPC APIs
    sendClientEvent: (event: ClientEvent) => {
        electron.ipcRenderer.send("client-event", event);
    },
    onServerEvent: (callback: (event: ServerEvent) => void) => {
        const cb = (_: Electron.IpcRendererEvent, payload: string) => {
            try {
                const event = JSON.parse(payload) as ServerEvent;
                callback(event);
            } catch (error) {
                console.error("Failed to parse server event:", error);
            }
        };
        electron.ipcRenderer.on("server-event", cb);
        return () => electron.ipcRenderer.off("server-event", cb);
    },
    generateSessionTitle: (userInput: string | null) =>
        ipcInvoke("generate-session-title", userInput),
    getRecentCwds: (limit?: number) =>
        ipcInvoke("get-recent-cwds", limit),
    selectDirectory: () =>
        ipcInvoke("select-directory"),
    getApiConfig: () =>
        ipcInvoke("get-api-config"),
    saveApiConfig: (config: ApiConfig) =>
        ipcInvoke("save-api-config", config),
    checkApiConfig: () =>
        ipcInvoke("check-api-config"),
    getLanguage: () =>
        ipcInvoke("get-language"),
    setLanguage: (lang: string) =>
        ipcInvoke("set-language", lang),
    // New APIs for welcome page
    loadCommands: () =>
        ipcInvoke("load-commands"),
    readCommandContent: (filePath: string) =>
        ipcInvoke("read-command-content", filePath),
    loadSkills: () =>
        ipcInvoke("load-skills"),
    readSkillContent: (filePath: string) =>
        ipcInvoke("read-skill-content", filePath),
    listFiles: (dirPath: string) =>
        ipcInvoke("list-files", dirPath),
    getRecentFiles: (sessionId: string) =>
        ipcInvoke("get-recent-files", sessionId),
    addRecentFile: (filePath: string, sessionId: string) =>
        ipcInvoke("add-recent-file", filePath, sessionId),
    getDefaultCwd: () =>
        ipcInvoke("get-default-cwd"),
    setDefaultCwd: (cwd: string) =>
        ipcInvoke("set-default-cwd", cwd),
    readDirectoryTree: (dirPath: string, depth?: number) =>
        ipcInvoke("read-directory-tree", dirPath, depth),
    getBrandConfig: () =>
        ipcInvoke("get-brand-config"),
    getLogPath: () =>
        ipcInvoke("get-log-path")
})

/**
 * Type-safe IPC invoke helper.
 * Uses IpcArgsMapping to ensure correct parameter types for each channel.
 */
function ipcInvoke<K extends keyof EventPayloadMapping>(
    key: K,
    ...args: K extends keyof IpcArgsMapping ? IpcArgsMapping[K] : []
): Promise<EventPayloadMapping[K]> {
    return electron.ipcRenderer.invoke(key, ...args);
}

/**
 * Type-safe IPC subscription helper.
 */
function ipcOn<K extends keyof EventPayloadMapping>(
    key: K,
    callback: (payload: EventPayloadMapping[K]) => void
) {
    const cb = (_: Electron.IpcRendererEvent, payload: EventPayloadMapping[K]) => callback(payload);
    electron.ipcRenderer.on(key, cb);
    return () => electron.ipcRenderer.off(key, cb);
}
