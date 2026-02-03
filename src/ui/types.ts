/**
 * Re-export all shared types for backward compatibility with existing UI imports.
 * All types are now defined in src/shared/index.ts as the single source of truth.
 */

// Re-export everything from shared
export * from "@shared/index";

// Re-export PermissionResult from SDK for convenience
export type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
