import { app } from "electron";
import { join } from "path";
import log from 'electron-log';
import { SessionStore } from "../libs/session-store.js";
import type { RunnerHandle } from "../libs/runner.js";

let sessions: SessionStore;
const runnerHandles = new Map<string, RunnerHandle>();

export function initializeSessions(): SessionStore {
    if (!sessions) {
        const DB_PATH = join(app.getPath("userData"), "sessions.db");
        log.info(`Initializing SessionStore at ${DB_PATH}`);
        sessions = new SessionStore(DB_PATH);
    }
    return sessions;
}

export function getSessionStore(): SessionStore {
    return initializeSessions();
}

export function getRunnerHandles(): Map<string, RunnerHandle> {
    return runnerHandles;
}

export function cleanupSessions(): void {
    for (const [, handle] of runnerHandles) {
        handle.abort();
    }
    runnerHandles.clear();
    if (sessions) {
        sessions.close();
    }
}
