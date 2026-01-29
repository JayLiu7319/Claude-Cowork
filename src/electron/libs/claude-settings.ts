import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { loadApiConfig, saveApiConfig, type ApiConfig } from "./config-store.js";
import { app } from "electron";

// Get Claude Code CLI path
export function getClaudeCodePath(): string {
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/3f669dd6-64da-4cef-a2ef-6b291f75c915',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'claude-settings.ts:getClaudeCodePath',message:'getClaudeCodePath entry',data:{isPackaged:app.isPackaged,platform:process.platform,resourcesPath:process.resourcesPath,execPath:process.execPath},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (app.isPackaged) {
    // For packaged apps, the SDK needs the explicit path to the CLI
    // The path should point to the unpackaged asar.unpacked directory
    const cliPath = join(
      process.resourcesPath,
      "app.asar.unpacked",
      "node_modules",
      "@anthropic-ai",
      "claude-agent-sdk",
      "cli.js"
    );

    const cliExists = existsSync(cliPath);
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/3f669dd6-64da-4cef-a2ef-6b291f75c915',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'claude-settings.ts:getClaudeCodePath',message:'resolved cli path',data:{cliPath,cliExists},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!cliExists) {
      console.error("[claude-settings] CRITICAL: Claude Code CLI not found at expected path:", cliPath);
    } else {
      console.log("[claude-settings] Verified Claude Code CLI exists at:", cliPath);
    }

    // On Windows, create a wrapper script to ensure we use the Electron binary as Node
    // This avoids reliance on user's installed Node (or lack thereof) and ensures version compatibility
    if (process.platform === 'win32') {
      try {
        const wrapperPath = join(app.getPath('userData'), 'claude-code-wrapper.cmd');
        const logPath = join(app.getPath('userData'), 'claude-wrapper-debug.log');
        const exePath = process.execPath;

        // Wrapper script with debug logging
        const content = `@echo off
set ELECTRON_RUN_AS_NODE=1
echo [WRAPPER] Starting execution at %DATE% %TIME% >> "${logPath}"
echo [WRAPPER] Executable: "${exePath}" >> "${logPath}"
echo [WRAPPER] Script: "${cliPath}" >> "${logPath}"
echo [WRAPPER] Args: %* >> "${logPath}"

"${exePath}" "${cliPath}" %*
if %errorlevel% neq 0 (
  echo [WRAPPER] Execution failed with code %errorlevel% >> "${logPath}"
  exit /b %errorlevel%
)
echo [WRAPPER] Execution finished successfully >> "${logPath}"
`;
        writeFileSync(wrapperPath, content);
        console.log("[claude-settings] Created wrapper script at:", wrapperPath);
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/3f669dd6-64da-4cef-a2ef-6b291f75c915',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'claude-settings.ts:getClaudeCodePath',message:'wrapper created',data:{wrapperPath,logPath,exePath},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return wrapperPath;
      } catch (error) {
        console.error("Failed to create Claude Code wrapper script:", error);
        // Fallback to direct path if wrapper creation fails
        return cliPath;
      }
    }

    return cliPath;
  }
  // In development, use node_modules CLI
  return join(app.getAppPath(), 'node_modules/@anthropic-ai/claude-agent-sdk/cli.js');
}

// 获取当前有效的配置（优先界面配置，回退到文件配置）
export function getCurrentApiConfig(): ApiConfig | null {
  const uiConfig = loadApiConfig();
  if (uiConfig) {
    console.log("[claude-settings] Using UI config:", {
      baseURL: uiConfig.baseURL,
      model: uiConfig.model,
      apiType: uiConfig.apiType
    });
    return uiConfig;
  }

  // 回退到 ~/.claude/settings.json
  try {
    const settingsPath = join(homedir(), ".claude", "settings.json");
    const raw = readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as { env?: Record<string, unknown> };
    if (parsed.env) {
      const authToken = parsed.env.ANTHROPIC_AUTH_TOKEN;
      const baseURL = parsed.env.ANTHROPIC_BASE_URL;
      const model = parsed.env.ANTHROPIC_MODEL;

      if (authToken && baseURL && model) {
        console.log("[claude-settings] Using file config from ~/.claude/settings.json");
        const config: ApiConfig = {
          apiKey: String(authToken),
          baseURL: String(baseURL),
          model: String(model),
          apiType: "anthropic"
        };
        // 持久化到 api-config.json
        try {
          saveApiConfig(config);
          console.log("[claude-settings] Persisted config to api-config.json");
        } catch (e) {
          console.error("[claude-settings] Failed to persist config:", e);
        }
        return config;
      }
    }
  } catch {
    // Ignore missing or invalid settings file.
  }

  console.log("[claude-settings] No config found");
  return null;
}

export function buildEnvForConfig(config: ApiConfig): Record<string, string> {
  const baseEnv = { ...process.env } as Record<string, string>;

  baseEnv.ANTHROPIC_AUTH_TOKEN = config.apiKey;
  baseEnv.ANTHROPIC_BASE_URL = config.baseURL;
  baseEnv.ANTHROPIC_MODEL = config.model;

  return baseEnv;
}
