import { BrowserWindow } from "electron";
import type { ServerEvent } from "../types.js";
import { getSessionStore } from "./session-instance.js";
import { scheduleRightPanelUpdate } from "./right-panel-aggregator.js";

function getSessions() {
    return getSessionStore();
}

export function broadcast(event: ServerEvent) {
    const payload = JSON.stringify(event);
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        win.webContents.send("server-event", payload);
    }
}

function hasLiveSession(sessionId: string): boolean {
    const sessions = getSessions();
    if (!sessions) return false;
    return Boolean(sessions.getSession(sessionId));
}

export function emit(event: ServerEvent) {
    const sessions = getSessions();

    // If a session was deleted, drop late events that would resurrect it in the UI.
    if (
        (event.type === "session.status" ||
            event.type === "stream.message" ||
            event.type === "stream.user_prompt" ||
            event.type === "permission.request") &&
        !hasLiveSession(event.payload.sessionId)
    ) {
        return;
    }

    if (event.type === "session.status") {
        sessions.updateSession(event.payload.sessionId, { status: event.payload.status });
    }
    if (event.type === "stream.message") {
        sessions.recordMessage(event.payload.sessionId, event.payload.message);

        // Schedule debounced right panel update instead of immediate aggregation.
        scheduleRightPanelUpdate(event.payload.sessionId);
    }
    if (event.type === "stream.user_prompt") {
        sessions.recordMessage(event.payload.sessionId, {
            type: "user_prompt",
            prompt: event.payload.prompt,
            displayPrompt: event.payload.displayPrompt,
            displayTokens: event.payload.displayTokens
        });
    }
    broadcast(event);
}
