import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

export type ApiType = "anthropic";

export type ApiConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  apiType?: ApiType; // "anthropic" 
};

const CONFIG_FILE_NAME = "api-config.json";

function getConfigPath(): string {
  const userDataPath = app.getPath("userData");
  return join(userDataPath, CONFIG_FILE_NAME);
}

export function loadApiConfig(): ApiConfig | null {
  try {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) {
      return null;
    }
    const raw = readFileSync(configPath, "utf8");
    const config = JSON.parse(raw) as ApiConfig;
    // 验证配置格式
    if (config.apiKey && config.baseURL && config.model) {
      // 设置默认 apiType
      if (!config.apiType) {
        config.apiType = "anthropic";
      }
      return config;
    }
    return null;
  } catch (error) {
    console.error("[config-store] Failed to load API config:", error);
    return null;
  }
}

export function saveApiConfig(config: ApiConfig): void {
  try {
    const configPath = getConfigPath();
    const userDataPath = app.getPath("userData");

    // 确保目录存在 make sure directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true });
    }

    // 验证配置 validate config
    if (!config.apiKey || !config.baseURL || !config.model) {
      throw new Error("Invalid config: apiKey, baseURL, and model are required");
    }

    // 设置默认 apiType set default apiType
    if (!config.apiType) {
      config.apiType = "anthropic";
    }

    // 保存配置 save config
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    console.info("[config-store] API config saved successfully");
  } catch (error) {
    console.error("[config-store] Failed to save API config:", error);
    throw error;
  }
}

export function deleteApiConfig(): void {
  try {
    const configPath = getConfigPath();
    if (existsSync(configPath)) {
      unlinkSync(configPath);
      console.info("[config-store] API config deleted");
    }
  } catch (error) {
    console.error("[config-store] Failed to delete API config:", error);
  }
}

// Default working directory configuration
const DEFAULT_CWD_FILE_NAME = "default-cwd.txt";

function getDefaultCwdPath(): string {
  const userDataPath = app.getPath("userData");
  return join(userDataPath, DEFAULT_CWD_FILE_NAME);
}

function getDefaultWorkspaceDir(): string {
  const userDataPath = app.getPath("userData");
  const defaultWorkspace = join(userDataPath, "workspace");
  // Ensure the default workspace exists
  if (!existsSync(defaultWorkspace)) {
    mkdirSync(defaultWorkspace, { recursive: true });
  }
  return defaultWorkspace;
}

export function loadDefaultCwd(): string {
  try {
    const cwdPath = getDefaultCwdPath();
    if (!existsSync(cwdPath)) {
      // Return default workspace if no config exists
      return getDefaultWorkspaceDir();
    }
    const cwd = readFileSync(cwdPath, "utf8").trim();
    if (cwd && existsSync(cwd)) {
      return cwd;
    }
    // Fallback to default workspace if saved path doesn't exist
    return getDefaultWorkspaceDir();
  } catch (error) {
    console.error("[config-store] Failed to load default cwd:", error);
    return getDefaultWorkspaceDir();
  }
}

export function saveDefaultCwd(cwd: string): void {
  try {
    const cwdPath = getDefaultCwdPath();
    const userDataPath = app.getPath("userData");

    // Ensure directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true });
    }

    writeFileSync(cwdPath, cwd, "utf8");
    console.info("[config-store] Default cwd saved successfully:", cwd);
  } catch (error) {
    console.error("[config-store] Failed to save default cwd:", error);
    throw error;
  }
}
