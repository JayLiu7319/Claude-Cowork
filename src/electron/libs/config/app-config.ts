import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export type AppConfig = {
    language: string;
};

const APP_CONFIG_FILE_NAME = "app-config.json";

function getAppConfigPath(): string {
    const userDataPath = app.getPath("userData");
    return join(userDataPath, APP_CONFIG_FILE_NAME);
}

export function loadAppConfig(): AppConfig | null {
    try {
        const configPath = getAppConfigPath();
        if (!existsSync(configPath)) {
            return null;
        }
        const raw = readFileSync(configPath, "utf8");
        const config = JSON.parse(raw) as AppConfig;
        return config;
    } catch (error) {
        console.error("[app-config] Failed to load app config:", error);
        return null;
    }
}

export function saveAppConfig(config: AppConfig): void {
    try {
        const configPath = getAppConfigPath();
        const userDataPath = app.getPath("userData");

        // Ensure directory exists
        if (!existsSync(userDataPath)) {
            mkdirSync(userDataPath, { recursive: true });
        }

        writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
        console.info("[app-config] App config saved successfully");
    } catch (error) {
        console.error("[app-config] Failed to save app config:", error);
        throw error;
    }
}
