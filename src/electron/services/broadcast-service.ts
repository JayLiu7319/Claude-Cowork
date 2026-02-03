import { BrowserWindow } from "electron";
import type { ServerEvent } from "../types.js";

export function broadcast(event: ServerEvent) {
    const payload = JSON.stringify(event);
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        win.webContents.send("server-event", payload);
    }
}
