import { isDev } from "./util.js"
import path from "path"
import { app } from "electron"

export function getPreloadPath() {
    const basePath = isDev() ? app.getAppPath() : path.join(app.getAppPath(), '..');
    return path.join(basePath, 'dist-electron', 'src', 'electron', 'preload.cjs');
}

export function getUIPath() {
    const basePath = isDev() ? app.getAppPath() : path.join(app.getAppPath(), '..');
    return path.join(basePath, 'dist-react', 'index.html');
}

export function getIconPath() {
    const basePath = isDev() ? app.getAppPath() : path.join(app.getAppPath(), '..');
    return path.join(basePath, 'templateIcon.png');
}