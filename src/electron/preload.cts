import electron from "electron";
import type { EventPayloadMapping } from "./types.js";

electron.contextBridge.exposeInMainWorld("electron", {
    subscribeStatistics: (callback: any) =>
        ipcOn("statistics", stats => {
            callback(stats);
        }),
    getStaticData: () => ipcInvoke("getStaticData"),

    // Claude Agent IPC APIs
    sendClientEvent: (event: any) => {
        electron.ipcRenderer.send("client-event", event);
    },
    onServerEvent: (callback: (event: any) => void) => {
        const cb = (_: Electron.IpcRendererEvent, payload: string) => {
            try {
                const event = JSON.parse(payload);
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
    saveApiConfig: (config: any) =>
        ipcInvoke("save-api-config", config),
    checkApiConfig: () =>
        ipcInvoke("check-api-config"),
    getLanguage: () =>
        ipcInvoke("get-language"),
    // New APIs for welcome page
    loadCommands: () =>
        ipcInvoke("load-commands"),
    readCommandContent: (filePath: string) =>
        ipcInvoke("read-command-content", filePath),
    getDefaultCwd: () =>
        ipcInvoke("get-default-cwd"),
    setDefaultCwd: (cwd: string) =>
        ipcInvoke("set-default-cwd", cwd),
    readDirectoryTree: (dirPath: string, depth?: number) =>
        ipcInvoke("read-directory-tree", dirPath, depth),
    getBrandConfig: () =>
        ipcInvoke("get-brand-config")
})

function ipcInvoke<Key extends keyof EventPayloadMapping>(key: Key, ...args: any[]): Promise<EventPayloadMapping[Key]> {
    return electron.ipcRenderer.invoke(key, ...args);
}

function ipcOn<Key extends keyof EventPayloadMapping>(key: Key, callback: (payload: EventPayloadMapping[Key]) => void) {
    const cb = (_: Electron.IpcRendererEvent, payload: any) => callback(payload)
    electron.ipcRenderer.on(key, cb);
    return () => electron.ipcRenderer.off(key, cb)
}
