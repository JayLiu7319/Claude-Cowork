import { app, Menu } from "electron";
import log from 'electron-log';
import { initI18n } from "./i18n.js";
import "./libs/claude-settings.js";
import { registerAppEvents } from "./lifecycle.js";
import { createMainWindow } from "./window-manager.js";
import { registerAllIpcHandlers } from "./ipc-registry.js";

// Initialize logging
log.initialize();
Object.assign(console, log.functions);

// Initialize everything when app is ready
app.on("ready", () => {
    // Initialize i18n for main process
    initI18n();

    Menu.setApplicationMenu(null);

    // Register lifecycle and process events
    registerAppEvents();

    // Create main window
    const mainWindow = createMainWindow();

    // Register all IPC handlers
    registerAllIpcHandlers(mainWindow);
});

