import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk";
import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { getCurrentApiConfig, buildEnvForConfig, getClaudeCodePath } from "../config/claude-settings.js";
import { getLanguage } from "../../i18n.js";
import { app } from "electron";
import log from "electron-log";

// Build enhanced PATH for packaged environment
export function getEnhancedEnv(): Record<string, string | undefined> {

  const config = getCurrentApiConfig();
  if (!config) {
    return {
      ...process.env,
      ...(app.isPackaged && process.platform === "win32" ? { ELECTRON_RUN_AS_NODE: "1" } : {})
    };
  }

  const env = buildEnvForConfig(config);
  return {
    ...process.env,
    ...env,
    ...(app.isPackaged && process.platform === "win32" ? { ELECTRON_RUN_AS_NODE: "1" } : {})
  };
}

export const generateSessionTitle = async (userIntent: string | null) => {
  if (!userIntent) return "New Session";

  // Get the Claude Code path when needed, not at module load time
  const claudeCodePath = getClaudeCodePath();
  // Get fresh env each time to ensure latest API config is used
  const currentEnv = getEnhancedEnv();

  try {
    const language = getLanguage();
    const isChinese = language.startsWith('zh');
    const langInstruction = isChinese ? "Answer in Chinese." : "Answer in English.";

    // Ensure userIntent is not empty
    const promptContent = userIntent.trim() || "New Session";

    const result: SDKResultMessage = await unstable_v2_prompt(
      `Please analyze the following user input to generate a short, clear title to identify this conversation theme.
      User Input: "${promptContent}"
      
      Instructions:
      1. ${langInstruction}
      2. Directly output the title only.
      3. Do not include any other content, explanations, or quotes.
      4. Keep it concise (under 10 words).`, {
      model: getCurrentApiConfig()?.model || "claude-3-5-sonnet-20241022",
      env: currentEnv,
      pathToClaudeCodeExecutable: claudeCodePath,
    });

    if (result.subtype === "success") {
      return result.result;
    }

    // Log any non-success result for debugging
    log.warn("[title] Claude SDK returned non-success result", {
      result
    });
    return "New Session";
  } catch (error) {
    // Enhanced error logging for packaged app debugging
    log.error("[title] Failed to generate session title", {
      error: String(error),
      claudeCodePath,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath
    });

    // Return a simple title based on user input as fallback
    if (userIntent) {
      const words = userIntent.trim().split(/\s+/).slice(0, 5);
      return words.join(" ").toUpperCase() + (userIntent.trim().split(/\s+/).length > 5 ? "..." : "");
    }

    return "New Session";
  }
};
