// Main exports
export { runClaude } from "./runner.js";

// Type exports
export type { RunnerOptions, RunnerHandle, RunnerErrorDetails } from "./types.js";

// Utility exports (for testing or advanced usage)
export { getRunnerErrorDetails } from "./error-handler.js";
export { findGitBashPath, getBundledGitInstallerPath, tryInstallBundledGit } from "./git-utils.js";
export { normalizeProxyUrl } from "./proxy-utils.js";
export { buildFirstMessageSystemContext } from "./system-context.js";
export { loadPluginConfigs } from "./plugin-loader.js";
