import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import fs from "fs";
import log from "electron-log";
import { app } from "electron";

import type { RunnerOptions, RunnerHandle } from "./types.js";
import { getRunnerErrorDetails } from "./error-handler.js";
import {
    checkGitInstalled,
    findGitBashPath,
    getBundledGitInstallerPath,
    tryInstallBundledGit
} from "./git-utils.js";
import { normalizeProxyUrl } from "./proxy-utils.js";
import { buildFirstMessageSystemContext } from "./system-context.js";
import { loadPluginConfigs } from "./plugin-loader.js";
import { getCurrentApiConfig, buildEnvForConfig, getClaudeCodePath } from "../../config/claude-settings.js";
import { getEnhancedEnv } from "../../utils/util.js";
import { t } from "../../../i18n.js";
import { getResourcesPath } from "../../../pathResolver.js";

const DEFAULT_CWD = process.cwd();

/**
 * Run a Claude Agent SDK session with the given options.
 * Returns a handle that can be used to abort the session.
 */
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
                    payload: {
                        sessionId: session.id,
                        status: "error",
                        title: session.title,
                        cwd: session.cwd,
                        error: t("api.configurationNotFound")
                    }
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

            const isWindows = process.platform === "win32";
            let gitBashPath = isWindows
                ? mergedEnv.CLAUDE_CODE_GIT_BASH_PATH ?? findGitBashPath()
                : null;
            if (!gitBashPath && app.isPackaged && isWindows) {
                const resourcesPathForInstall = getResourcesPath();
                if (!getBundledGitInstallerPath(resourcesPathForInstall)) {
                    onEvent({
                        type: "runner.error",
                        payload: { sessionId: session.id, message: t("git.missingInstaller") }
                    });
                    onEvent({
                        type: "session.status",
                        payload: {
                            sessionId: session.id,
                            status: "error",
                            title: session.title,
                            error: t("git.required")
                        }
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
                        payload: {
                            sessionId: session.id,
                            status: "error",
                            title: session.title,
                            error: t("git.required")
                        }
                    });
                    return;
                }
            }
            if (isWindows && gitBashPath) {
                mergedEnv.CLAUDE_CODE_GIT_BASH_PATH = gitBashPath;
                const gitBinDir = path.dirname(gitBashPath);
                if (mergedEnv.PATH && !mergedEnv.PATH.includes(gitBinDir)) {
                    mergedEnv.PATH = `${gitBinDir}${path.delimiter}${mergedEnv.PATH}`;
                } else if (!mergedEnv.PATH) {
                    mergedEnv.PATH = gitBinDir;
                }
                mergedEnv.Path = mergedEnv.PATH;
            }
            if (!isWindows && !checkGitInstalled()) {
                onEvent({
                    type: "runner.error",
                    payload: { sessionId: session.id, message: t("git.required") }
                });
                onEvent({
                    type: "session.status",
                    payload: {
                        sessionId: session.id,
                        status: "error",
                        title: session.title,
                        error: t("git.required")
                    }
                });
                return;
            }
            const normalizedHttpProxy = normalizeProxyUrl(
                mergedEnv.HTTP_PROXY ?? mergedEnv.http_proxy
            );
            if (normalizedHttpProxy) {
                mergedEnv.HTTP_PROXY = normalizedHttpProxy;
                mergedEnv.http_proxy = normalizedHttpProxy;
            }
            const normalizedHttpsProxy = normalizeProxyUrl(
                mergedEnv.HTTPS_PROXY ?? mergedEnv.https_proxy
            );
            if (normalizedHttpsProxy) {
                mergedEnv.HTTPS_PROXY = normalizedHttpsProxy;
                mergedEnv.https_proxy = normalizedHttpsProxy;
            }
            const normalizedAllProxy = normalizeProxyUrl(
                mergedEnv.ALL_PROXY ?? mergedEnv.all_proxy
            );
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
            const bundledPluginsPath = path.join(resourcesPath, "resources", "builtin-plugins");
            const pluginConfigs = loadPluginConfigs(bundledPluginsPath);

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
                                    resolve({ behavior: "deny", message: t("sessionAborted") });
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
                if (
                    message.type === "system" &&
                    "subtype" in message &&
                    message.subtype === "init"
                ) {
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
                payload: {
                    sessionId: session.id,
                    status: "error",
                    title: session.title,
                    error: String(error)
                }
            });
        }
    })();

    return {
        abort: () => abortController.abort()
    };
}
