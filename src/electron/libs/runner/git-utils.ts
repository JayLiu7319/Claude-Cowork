import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import log from "electron-log";
import { getRunnerErrorDetails } from "./error-handler.js";

let gitInstallAttempted = false;

/**
 * Find Git Bash executable path on Windows.
 */
export function findGitBashPath(): string | null {
    const candidatePaths = [
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe"
    ];
    for (const candidate of candidatePaths) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

/**
 * Get path to bundled Git installer in resources.
 */
export function getBundledGitInstallerPath(resourcesPath: string): string | null {
    const candidates = [
        path.join(resourcesPath, "installers", "git", "Git-64-bit.exe"),
        path.join(resourcesPath, "installers", "git", "Git-setup.exe"),
        path.join(resourcesPath, "installers", "git", "Git-setup-x64.exe"),
        path.join(resourcesPath, "installers", "git", "Git-2.47.1-64-bit.exe")
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

/**
 * Attempt to install bundled Git silently.
 * Only attempts installation once per session.
 */
export async function tryInstallBundledGit(resourcesPath: string): Promise<boolean> {
    if (gitInstallAttempted) return false;
    gitInstallAttempted = true;

    const installerPath = getBundledGitInstallerPath(resourcesPath);
    if (!installerPath) {
        log.warn("[runner] Git installer not found in resources", {
            resourcesPath
        });
        return false;
    }

    return new Promise<boolean>((resolve) => {
        const args = ["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/SP-"];
        log.info("[runner] Starting bundled Git installer", {
            installerPath,
            args
        });
        const child = spawn(installerPath, args, {
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"]
        });
        let stderr = "";
        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });
        child.on("error", (error) => {
            log.error("[runner] Git installer failed to spawn", {
                error: String(error),
                details: getRunnerErrorDetails(error)
            });
            resolve(false);
        });
        child.on("close", (code, signal) => {
            log.info("[runner] Git installer exited", {
                code,
                signal,
                stderr: stderr.trim() || null
            });
            resolve(code === 0);
        });
    });
}
