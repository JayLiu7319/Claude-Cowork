import { app, globalShortcut } from "electron";
import { stopPolling } from "./test.js";
import { cleanupSessions } from "./libs/session/index.js";
import { killViteDevServer } from "./dev-utils.js";

let cleanupComplete = false;

export function cleanup(): void {
    if (cleanupComplete) return;
    cleanupComplete = true;

    globalShortcut.unregisterAll();
    stopPolling();
    cleanupSessions();
    killViteDevServer();
}

export function handleShutdownSignals(): void {
    cleanup();
    app.quit();
}

export function registerAppEvents(): void {
    app.on("before-quit", cleanup);
    app.on("will-quit", cleanup);
    app.on("window-all-closed", () => {
        cleanup();
        app.quit();
    });

    process.on("SIGTERM", handleShutdownSignals);
    process.on("SIGINT", handleShutdownSignals);
    process.on("SIGHUP", handleShutdownSignals);
}
