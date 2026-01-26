import { isDev } from "./util.js"
import path from "path"
import { app } from "electron"

export function getResourcesPath(): string {
    return app.isPackaged ? process.resourcesPath : app.getAppPath();
}

export function getPreloadPath() {
    if (app.isPackaged) {
        const resolvedPath = path.join(app.getAppPath(), 'dist-electron', 'src', 'electron', 'preload.cjs');
        return resolvedPath;
    }
    const basePath = isDev() ? app.getAppPath() : path.join(app.getAppPath(), '..');
    const resolvedPath = path.join(basePath, 'dist-electron', 'src', 'electron', 'preload.cjs');
    return resolvedPath;
}

export function getUIPath() {
    const basePath = app.getAppPath();
    const resolvedPath = path.join(basePath, 'dist-react', 'index.html');
    return resolvedPath;
}

export function getIconPath() {
    if (app.isPackaged) {
        return path.join(getResourcesPath(), 'app-icon.png');
    }
    return path.join(app.getAppPath(), 'app-icon.png');
}