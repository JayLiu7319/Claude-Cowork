import { shell } from "electron";
import { resolveFilePath } from "../util.js";
import { getSessionStore } from "../services/session-instance.js";
import type { ClientEvent } from "../types.js";

export function handleFileOpen(event: Extract<ClientEvent, { type: 'file.open' }>) {
    const sessions = getSessionStore();
    const session = sessions.getSession(event.payload.sessionId);
    if (session && session.cwd) {
        // Use resolveFilePath to handle both relative and absolute paths correctly
        const absolutePath = resolveFilePath(event.payload.path, session.cwd);
        shell.showItemInFolder(absolutePath);
    }
}
