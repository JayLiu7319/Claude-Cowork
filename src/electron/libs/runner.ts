import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { ServerEvent } from "../types.js";
import type { Session } from "./session-store.js";

import { getCurrentApiConfig, buildEnvForConfig, getClaudeCodePath } from "./claude-settings.js";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import log from "electron-log";
import { app } from "electron";
import { getEnhancedEnv } from "./util.js";
import { t } from "../i18n.js";
import { getResourcesPath } from "../pathResolver.js";
import { loadBrandConfig } from "./brand-config.js";

type RunnerErrorDetails = {
  name?: string;
  message?: string;
  stack?: string;
  code?: unknown;
  signal?: unknown;
  exitCode?: unknown;
  stderr?: unknown;
  stdout?: unknown;
  cause?: unknown;
};

function getRunnerErrorDetails(error: unknown): RunnerErrorDetails {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const err = error as {
    name?: string;
    message?: string;
    stack?: string;
    code?: unknown;
    signal?: unknown;
    exitCode?: unknown;
    stderr?: unknown;
    stdout?: unknown;
    cause?: unknown;
  };

  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    signal: err.signal,
    exitCode: err.exitCode,
    stderr: err.stderr,
    stdout: err.stdout,
    cause: err.cause
  };
}

let gitInstallAttempted = false;

function normalizeProxyUrl(value?: string) {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

function findGitBashPath(): string | null {
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

function getBundledGitInstallerPath(resourcesPath: string): string | null {
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

async function tryInstallBundledGit(resourcesPath: string): Promise<boolean> {
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



export type RunnerOptions = {
  prompt: string;
  session: Session;
  resumeSessionId?: string;
  onEvent: (event: ServerEvent) => void;
  onSessionUpdate?: (updates: Partial<Session>) => void;
};

export type RunnerHandle = {
  abort: () => void;
};

const DEFAULT_CWD = process.cwd();


/**
 * Build the system context prompt for the first message in a new conversation.
 * This prompt is prepended to the user's actual message to provide important context.
 * It is NOT sent to the frontend and NOT rendered in the UI.
 */
function buildFirstMessageSystemContext(cwd: string): string {
  return `<SYSTEM_CONTEXT>
当前工作路径: ${cwd}

重要规则：
1. 所有文件写入操作必须且只能在工作路径 "${cwd}" 或其子目录下执行
2. 所有文件删除操作必须且只能在工作路径 "${cwd}" 或其子目录下执行
3. 禁止在工作路径之外的任何位置进行写入或删除操作
4. 读取操作可以访问系统其他位置，但写入和删除必须严格限制在工作路径内
</SYSTEM_CONTEXT>

`;
}

export async function runClaude(options: RunnerOptions): Promise<RunnerHandle> {
  const { prompt, session, resumeSessionId, onEvent, onSessionUpdate } = options;
  const abortController = new AbortController();

  // For the first message in a new conversation (no resumeSessionId),
  // prepend system context about the working directory
  const cwd = session.cwd ?? DEFAULT_CWD;
  const effectivePrompt = !resumeSessionId
    ? buildFirstMessageSystemContext(cwd) + prompt
    : prompt;

  const sendMessage = (message: SDKMessage) => {
    onEvent({
      type: "stream.message",
      payload: { sessionId: session.id, message }
    });
  };

  const sendPermissionRequest = (toolUseId: string, toolName: string, input: unknown) => {
    onEvent({
      type: "permission.request",
      payload: { sessionId: session.id, toolUseId, toolName, input }
    });
  };

  // Start the query in the background
  (async () => {
    let mergedEnv: Record<string, string | undefined> | null = null;
    try {
      // 获取当前配置
      const config = getCurrentApiConfig();

      if (!config) {
        onEvent({
          type: "session.status",
          payload: { sessionId: session.id, status: "error", title: session.title, cwd: session.cwd, error: t('api.configurationNotFound') }
        });
        return;
      }

      // 使用 Anthropic SDK
      const env = buildEnvForConfig(config);
      mergedEnv = {
        ...getEnhancedEnv(),
        ...env
      };
      if (!mergedEnv.PATH) {
        const fallbackPath = process.env.Path ?? process.env.PATH ?? mergedEnv.Path;
        if (fallbackPath) {
          mergedEnv.PATH = fallbackPath;
        }
      }
      if (!mergedEnv.Path && mergedEnv.PATH) {
        mergedEnv.Path = mergedEnv.PATH;
      }

      let gitBashPath = mergedEnv.CLAUDE_CODE_GIT_BASH_PATH ?? findGitBashPath();
      if (!gitBashPath && app.isPackaged && process.platform === "win32") {
        const resourcesPathForInstall = getResourcesPath();
        if (!getBundledGitInstallerPath(resourcesPathForInstall)) {
          onEvent({
            type: "runner.error",
            payload: { sessionId: session.id, message: t("git.missingInstaller") }
          });
          onEvent({
            type: "session.status",
            payload: { sessionId: session.id, status: "error", title: session.title, error: t("git.required") }
          });
          return;
        }

        onEvent({
          type: "runner.error",
          payload: { sessionId: session.id, message: t("git.installing") }
        });
        const installed = await tryInstallBundledGit(resourcesPathForInstall);
        if (installed) {
          gitBashPath = findGitBashPath();
          onEvent({
            type: "runner.error",
            payload: { sessionId: session.id, message: "" }
          });
        } else {
          onEvent({
            type: "runner.error",
            payload: { sessionId: session.id, message: t("git.installFailed") }
          });
          onEvent({
            type: "session.status",
            payload: { sessionId: session.id, status: "error", title: session.title, error: t("git.required") }
          });
          return;
        }
      }
      if (gitBashPath) {
        mergedEnv.CLAUDE_CODE_GIT_BASH_PATH = gitBashPath;
        const gitBinDir = path.dirname(gitBashPath);
        if (mergedEnv.PATH && !mergedEnv.PATH.includes(gitBinDir)) {
          mergedEnv.PATH = `${gitBinDir};${mergedEnv.PATH}`;
        } else if (!mergedEnv.PATH) {
          mergedEnv.PATH = gitBinDir;
        }
        mergedEnv.Path = mergedEnv.PATH;
      }
      const normalizedHttpProxy = normalizeProxyUrl(mergedEnv.HTTP_PROXY ?? mergedEnv.http_proxy);
      if (normalizedHttpProxy) {
        mergedEnv.HTTP_PROXY = normalizedHttpProxy;
        mergedEnv.http_proxy = normalizedHttpProxy;
      }
      const normalizedHttpsProxy = normalizeProxyUrl(mergedEnv.HTTPS_PROXY ?? mergedEnv.https_proxy);
      if (normalizedHttpsProxy) {
        mergedEnv.HTTPS_PROXY = normalizedHttpsProxy;
        mergedEnv.https_proxy = normalizedHttpsProxy;
      }
      const normalizedAllProxy = normalizeProxyUrl(mergedEnv.ALL_PROXY ?? mergedEnv.all_proxy);
      if (normalizedAllProxy) {
        mergedEnv.ALL_PROXY = normalizedAllProxy;
        mergedEnv.all_proxy = normalizedAllProxy;
      }
      if (app.isPackaged && !mergedEnv.DEBUG_CLAUDE_AGENT_SDK) {
        mergedEnv.DEBUG_CLAUDE_AGENT_SDK = "1";
      }

      log.info("[runner] Starting query", {
        sessionId: session.id,
        cwd,
        cwdExists: fs.existsSync(cwd),
        resumeSessionId: resumeSessionId ?? null,
        promptLength: prompt.length,
        effectivePromptLength: effectivePrompt.length,
        isPackaged: app.isPackaged,
        platform: process.platform
      });

      log.info("[runner] Using API config", {
        apiType: config.apiType,
        baseURL: config.baseURL,
        model: config.model
      });

      log.info("[runner] Env flags", {
        hasAnthropicAuth: Boolean(mergedEnv.ANTHROPIC_AUTH_TOKEN),
        hasAnthropicBaseUrl: Boolean(mergedEnv.ANTHROPIC_BASE_URL),
        hasAnthropicModel: Boolean(mergedEnv.ANTHROPIC_MODEL)
      });


      // Resolve bundled plugins path
      const resourcesPath = getResourcesPath();
      const bundledPluginsPath = path.join(resourcesPath, 'resources', 'builtin-plugins');
      // Load plugins based on brand configuration
      const brandConfig = loadBrandConfig();
      const pluginNames = brandConfig.plugins ?? ['core-skills'];

      const normalizedPluginConfigs = pluginNames.map((name) => {
        const pluginPath = path.join(bundledPluginsPath, name);
        const pluginMetaDir = path.join(pluginPath, '.claude-plugin');
        const pluginJsonPath = path.join(pluginMetaDir, 'plugin.json');
        const marketplaceJsonPath = path.join(pluginMetaDir, 'marketplace.json');
        const skillsDir = path.join(pluginPath, 'skills');
        const scientificSkillsDir = path.join(pluginPath, 'scientific-skills');

        const hasPluginJson = fs.existsSync(pluginJsonPath);
        const hasMarketplaceJson = fs.existsSync(marketplaceJsonPath);
        const hasSkillsDir = fs.existsSync(skillsDir);
        const hasScientificSkillsDir = fs.existsSync(scientificSkillsDir);

        log.info("[runner] Plugin probe", {
          name,
          pluginPath,
          pluginPathExists: fs.existsSync(pluginPath),
          hasPluginJson,
          hasMarketplaceJson,
          hasSkillsDir,
          hasScientificSkillsDir
        });

        const needsNormalization =
          (hasMarketplaceJson && !hasPluginJson) ||
          (!hasSkillsDir && hasScientificSkillsDir);

        if (!needsNormalization) {
          return { type: "local" as const, path: pluginPath, normalized: false };
        }

        const normalizedRoot = path.join(app.getPath('userData'), 'normalized-plugins', name);
        const normalizedMetaDir = path.join(normalizedRoot, '.claude-plugin');
        fs.mkdirSync(normalizedMetaDir, { recursive: true });

        if (hasMarketplaceJson) {
          fs.copyFileSync(marketplaceJsonPath, path.join(normalizedMetaDir, 'marketplace.json'));
          if (!hasPluginJson) {
            let nameFromMarketplace = name;
            let descriptionFromMarketplace = '';
            let versionFromMarketplace = '0.0.0';
            try {
              const marketplaceRaw = fs.readFileSync(marketplaceJsonPath, 'utf-8');
              const marketplace = JSON.parse(marketplaceRaw);
              if (typeof marketplace?.name === 'string') {
                nameFromMarketplace = marketplace.name;
              }
              if (typeof marketplace?.metadata?.description === 'string') {
                descriptionFromMarketplace = marketplace.metadata.description;
              }
              if (typeof marketplace?.metadata?.version === 'string') {
                versionFromMarketplace = marketplace.metadata.version;
              }
            } catch {
              // ignore and use fallback metadata
            }

            const shimPluginJson = {
              name: nameFromMarketplace,
              description: descriptionFromMarketplace,
              version: versionFromMarketplace
            };
            fs.writeFileSync(
              path.join(normalizedMetaDir, 'plugin.json'),
              JSON.stringify(shimPluginJson, null, 2)
            );
          } else {
            fs.copyFileSync(pluginJsonPath, path.join(normalizedMetaDir, 'plugin.json'));
          }
        } else if (hasPluginJson) {
          fs.copyFileSync(pluginJsonPath, path.join(normalizedMetaDir, 'plugin.json'));
        }

        const sourceSkillsDir = hasSkillsDir ? skillsDir : scientificSkillsDir;
        const normalizedSkillsDir = path.join(normalizedRoot, 'skills');
        if (sourceSkillsDir) {
          let existingStats: fs.Stats | null = null;
          try {
            existingStats = fs.lstatSync(normalizedSkillsDir);
          } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code !== "ENOENT") {
              log.warn("[runner] Failed to inspect existing skills path", {
                name,
                normalizedSkillsDir,
                error: String(error)
              });
            }
          }

          if (existingStats) {
            if (existingStats.isSymbolicLink()) {
              const currentTarget = fs.readlinkSync(normalizedSkillsDir);
              if (path.resolve(currentTarget) === path.resolve(sourceSkillsDir)) {
                log.info("[runner] Plugin skills link already exists", {
                  name,
                  normalizedSkillsDir,
                  currentTarget,
                  targetExists: fs.existsSync(currentTarget)
                });
              } else {
                log.warn("[runner] Plugin skills link points to different target", {
                  name,
                  normalizedSkillsDir,
                  currentTarget,
                  expectedTarget: sourceSkillsDir,
                  currentTargetExists: fs.existsSync(currentTarget),
                  expectedTargetExists: fs.existsSync(sourceSkillsDir)
                });
              }
            } else {
              log.warn("[runner] Plugin skills path exists and is not a link", {
                name,
                normalizedSkillsDir
              });
            }
          } else {
            try {
              fs.symlinkSync(sourceSkillsDir, normalizedSkillsDir, 'junction');
              log.info("[runner] Plugin skills link created", {
                name,
                normalizedSkillsDir,
                sourceSkillsDir
              });
            } catch (error) {
              log.error("[runner] Failed to create plugin skills link", {
                name,
                normalizedSkillsDir,
                sourceSkillsDir,
                error: String(error),
                details: getRunnerErrorDetails(error)
              });
              throw error;
            }
          }
        }

        return { type: "local" as const, path: normalizedRoot, normalized: true };
      });

      const pluginConfigs = normalizedPluginConfigs.map(({ type, path: pluginPath }) => ({
        type,
        path: pluginPath
      }));

      const claudeCodePath = getClaudeCodePath();

      log.info("[runner] Claude Code path", {
        path: claudeCodePath,
        exists: fs.existsSync(claudeCodePath),
        resourcesPath
      });

      log.info("[runner] Plugin configs", {
        plugins: pluginConfigs
      });

      const q = query({
        prompt: effectivePrompt,
        options: {
          cwd: session.cwd ?? DEFAULT_CWD,
          resume: resumeSessionId,
          abortController,
          env: mergedEnv,
          pathToClaudeCodeExecutable: claudeCodePath,
          permissionMode: "bypassPermissions",
          includePartialMessages: true,
          allowDangerouslySkipPermissions: true,
          stderr: (data: string) => {
            if (!data?.trim()) return;
            log.warn("[runner] SDK stderr", { data });
          },
          plugins: pluginConfigs,
          canUseTool: async (toolName, input, { signal }) => {
            // For AskUserQuestion, we need to wait for user response
            if (toolName === "AskUserQuestion") {
              const toolUseId = crypto.randomUUID();

              // Send permission request to frontend
              sendPermissionRequest(toolUseId, toolName, input);

              // Create a promise that will be resolved when user responds
              return new Promise<PermissionResult>((resolve) => {
                session.pendingPermissions.set(toolUseId, {
                  toolUseId,
                  toolName,
                  input,
                  resolve: (result) => {
                    session.pendingPermissions.delete(toolUseId);
                    resolve(result as PermissionResult);
                  }
                });

                // Handle abort
                signal.addEventListener("abort", () => {
                  session.pendingPermissions.delete(toolUseId);
                  resolve({ behavior: "deny", message: t('sessionAborted') });
                });
              });
            }

            // Auto-approve other tools
            return { behavior: "allow", updatedInput: input };
          }
        }
      });

      // Capture session_id from init message
      for await (const message of q) {
        // Extract session_id from system init message
        if (message.type === "system" && "subtype" in message && message.subtype === "init") {
          const sdkSessionId = message.session_id;
          if (sdkSessionId) {
            session.claudeSessionId = sdkSessionId;
            onSessionUpdate?.({ claudeSessionId: sdkSessionId });
          }
        }

        // Send message to frontend
        sendMessage(message);

        // Check for result to update session status
        if (message.type === "result") {
          const status = message.subtype === "success" ? "completed" : "error";
          onEvent({
            type: "session.status",
            payload: { sessionId: session.id, status, title: session.title }
          });
        }
      }

      // Query completed normally
      if (session.status === "running") {
        onEvent({
          type: "session.status",
          payload: { sessionId: session.id, status: "completed", title: session.title }
        });
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // Session was aborted, don't treat as error
        return;
      }
      log.error("[runner] Query failed", {
        sessionId: session.id,
        cwd: session.cwd ?? DEFAULT_CWD,
        resumeSessionId: resumeSessionId ?? null,
        error: String(error),
        details: getRunnerErrorDetails(error)
      });
      onEvent({
        type: "session.status",
        payload: { sessionId: session.id, status: "error", title: session.title, error: String(error) }
      });
    }
  })();

  return {
    abort: () => abortController.abort()
  };
}
