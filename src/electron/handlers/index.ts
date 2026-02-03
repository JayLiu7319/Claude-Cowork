import log from 'electron-log';
import type { ClientEvent } from "../types.js";
import { initializeSessions } from "../services/session-instance.js";
import {
    handleListSessions,
    handleSessionHistory,
    handleSessionStart,
    handleSessionContinue,
    handleSessionStop,
    handleSessionDelete,
    handleSessionRename,
    handlePermissionResponse
} from "./session-handlers.js";
import { handleFileOpen } from "./file-handlers.js";

export function handleClientEvent(event: ClientEvent) {
    // Initialize sessions on first event
    initializeSessions();

    if (event.type !== "session.history" && event.type !== "session.list") {
        log.info(`[ClientEvent] ${event.type}`, event.type === 'session.start' || event.type === 'session.continue' ? event.payload : '');
    }

    switch (event.type) {
        case "session.list":
            handleListSessions();
            break;
        case "session.history":
            handleSessionHistory(event);
            break;
        case "session.start":
            handleSessionStart(event);
            break;
        case "session.continue":
            handleSessionContinue(event);
            break;
        case "session.stop":
            handleSessionStop(event);
            break;
        case "session.delete":
            handleSessionDelete(event);
            break;
        case "session.rename":
            handleSessionRename(event);
            break;
        case "permission.response":
            handlePermissionResponse(event);
            break;
        case "file.open":
            handleFileOpen(event);
            break;
        default:
            // Handle unknown events or ignore
            break;
    }
}
