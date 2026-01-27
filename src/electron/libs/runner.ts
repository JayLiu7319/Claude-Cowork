import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { ServerEvent } from "../types.js";
import type { Session } from "./session-store.js";

import { getCurrentApiConfig, buildEnvForConfig, getClaudeCodePath } from "./claude-settings.js";
import path from "path";
import { getEnhancedEnv } from "./util.js";
import { t } from "../i18n.js";
import { getResourcesPath } from "../pathResolver.js";
import { loadBrandConfig } from "./brand-config.js";


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
      const mergedEnv = {
        ...getEnhancedEnv(),
        ...env
      };


      // Resolve bundled plugins path
      const bundledPluginsPath = path.join(getResourcesPath(), 'resources', 'builtin-plugins');

      // Load plugins based on brand configuration
      const brandConfig = loadBrandConfig();
      const pluginNames = brandConfig.plugins ?? ['core-skills'];

      console.log('[Runner] Brand config loaded:', {
        brandId: brandConfig.id,
        plugins: pluginNames,
        bundledPluginsPath
      });

      const pluginConfigs = pluginNames.map(name => ({
        type: "local" as const,
        path: path.join(bundledPluginsPath, name)
      }));

      console.log('[Runner] Plugin configs:', pluginConfigs);

      const q = query({
        prompt: effectivePrompt,
        options: {
          cwd: session.cwd ?? DEFAULT_CWD,
          resume: resumeSessionId,
          abortController,
          env: mergedEnv,
          pathToClaudeCodeExecutable: getClaudeCodePath(),
          permissionMode: "bypassPermissions",
          includePartialMessages: true,
          allowDangerouslySkipPermissions: true,
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
