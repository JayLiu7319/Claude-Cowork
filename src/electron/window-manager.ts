import { app, BrowserWindow, globalShortcut } from "electron";
import path from "path";
import { isDev, DEV_PORT } from "./util.js";
import { getPreloadPath, getUIPath, getIconPath } from "./pathResolver.js";
import { loadBrandConfig } from "./libs/brand-config.js";
import { cleanup } from "./lifecycle.js";

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
    return mainWindow;
}

export function createMainWindow(): BrowserWindow {
    const brandConfig = loadBrandConfig();
    const preloadPath = getPreloadPath();
    const uiPath = getUIPath();

    // Resolve icon path based on brand config
    let iconPath = getIconPath(); // Default fallback

    // For bio-research, we respect the brand config path as we ensure it's copied in build
    if (brandConfig.id === 'bio-research') {
        const iconRelPath = brandConfig.icons.app;
        if (isDev()) {
            iconPath = path.join(app.getAppPath(), iconRelPath);
        } else {
            iconPath = path.join(process.resourcesPath, iconRelPath);
        }
    }

    // Create main window
    mainWindow = new BrowserWindow({
        title: brandConfig.appTitle,
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: preloadPath,
        },
        icon: iconPath,
        titleBarStyle: "hidden",
        backgroundColor: "#FAF9F6",
        titleBarOverlay: {
            color: '#FAF9F6',
            symbolColor: '#4B5563',
            height: 48
        },
        trafficLightPosition: { x: 15, y: 18 }
    });

    if (isDev()) {
        mainWindow.loadURL(`http://localhost:${DEV_PORT}`)
    } else {
        mainWindow.loadFile(uiPath);
    }

    globalShortcut.register('CommandOrControl+Q', () => {
        cleanup();
        app.quit();
    });

    return mainWindow;
}
