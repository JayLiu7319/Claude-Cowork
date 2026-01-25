import { ipcMain, WebContents, WebFrameMain, IpcMainInvokeEvent } from "electron";
import { getUIPath } from "./pathResolver.js";
import { pathToFileURL } from "url";
import path from "path";
import type { EventPayloadMapping } from "./types.js";
export const DEV_PORT = 5173;

// Checks if you are in development mode
export function isDev(): boolean {
    return process.env.NODE_ENV == "development";
}

/**
 * Resolves a file path to an absolute path, handling various path formats across platforms.
 *
 * Handles:
 * - Relative paths (e.g., "fibonacci-demo/simple_demo.py") - joined with basePath
 * - Unix-style absolute paths (e.g., "/home/user/file.txt") - used directly
 * - Windows absolute paths (e.g., "C:\Users\user\file.txt") - used directly
 * - Unix-style paths on Windows (e.g., "/d/projects/file.txt") - converted to "D:\projects\file.txt"
 *
 * @param filePath - The file path to resolve (can be relative or absolute)
 * @param basePath - The base directory to resolve relative paths against
 * @returns The normalized absolute path
 */
export function resolveFilePath(filePath: string, basePath: string): string {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Check if it's a Unix-style absolute path on Windows (e.g., /d/projects/...)
    // This format is sometimes used by WSL or Git Bash on Windows
    if (process.platform === 'win32' && /^\/[a-zA-Z]\//.test(normalizedPath)) {
        // Convert /d/projects/... to D:/projects/...
        const driveLetter = normalizedPath[1].toUpperCase();
        const pathWithoutDrive = normalizedPath.substring(2);
        const windowsPath = `${driveLetter}:${pathWithoutDrive}`;
        return path.normalize(windowsPath);
    }

    // Check if path is already absolute
    if (path.isAbsolute(filePath)) {
        return path.normalize(filePath);
    }

    // Relative path - join with base path
    return path.normalize(path.join(basePath, filePath));
}

// Making IPC Typesafe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ipcMainHandle<Key extends keyof EventPayloadMapping>(key: Key, handler: (event: IpcMainInvokeEvent, ...args: any[]) => EventPayloadMapping[Key] | Promise<EventPayloadMapping[Key]>) {
    ipcMain.handle(key, (event, ...args) => {
        if (event.senderFrame) validateEventFrame(event.senderFrame);

        return handler(event, ...args)
    });
}

export function ipcWebContentsSend<Key extends keyof EventPayloadMapping>(key: Key, webContents: WebContents, payload: EventPayloadMapping[Key]) {
    webContents.send(key, payload);
}

export function validateEventFrame(frame: WebFrameMain) {
    if (isDev() && new URL(frame.url).host === `localhost:${DEV_PORT}`) return;

    if (frame.url !== pathToFileURL(getUIPath()).toString()) throw new Error("Malicious event");
}
