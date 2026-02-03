import type { ToolStatus } from "../types";

// Global tool status state (module-level singleton)
export const toolStatusMap = new Map<string, ToolStatus>();
export const toolStatusListeners = new Set<() => void>();

/**
 * Set the status of a tool execution.
 * Notifies all listeners when status changes.
 */
export function setToolStatus(toolUseId: string | undefined, status: ToolStatus): void {
    if (!toolUseId) return;
    toolStatusMap.set(toolUseId, status);
    toolStatusListeners.forEach((listener) => listener());
}

/**
 * Get the current status of a tool execution.
 */
export function getToolStatus(toolUseId: string): ToolStatus | undefined {
    return toolStatusMap.get(toolUseId);
}
