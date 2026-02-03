import type { InputToken } from "../types";

// Token placeholder constants
export const TOKEN_PLACEHOLDER = "\uFFFC";
export const TOKEN_PADDING_CHARS = 2;
export const TOKEN_SEPARATOR = "\u200B";

export type TokenRegistryItem = InputToken & { id: string };

/**
 * Generate a unique token ID
 */
export function createTokenId(): string {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `token-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Create a placeholder string for a token based on its name length
 */
export function createTokenPlaceholder(token?: TokenRegistryItem): string {
    if (!token || token.type === "text") return TOKEN_PLACEHOLDER;
    const placeholderCount = Math.max(1, token.name.length + TOKEN_PADDING_CHARS);
    return TOKEN_PLACEHOLDER.repeat(placeholderCount);
}

/**
 * Parse display tokens from a value string and token registry
 */
export function parseDisplayTokens(value: string, tokens: TokenRegistryItem[]): InputToken[] {
    const displayTokens: InputToken[] = [];
    let buffer = "";
    let tokenIndex = 0;

    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if (ch === TOKEN_SEPARATOR) {
            continue;
        }
        if (ch === TOKEN_PLACEHOLDER) {
            while (i + 1 < value.length && value[i + 1] === TOKEN_PLACEHOLDER) {
                i += 1;
            }
            if (buffer) {
                displayTokens.push({ type: "text", value: buffer });
                buffer = "";
            }
            const token = tokens[tokenIndex];
            if (token) {
                displayTokens.push(token);
            }
            tokenIndex += 1;
        } else {
            buffer += ch;
        }
    }

    if (buffer) {
        displayTokens.push({ type: "text", value: buffer });
    }

    return displayTokens;
}

/**
 * Serialize prompt for sending or title display
 */
export function serializePrompt(
    value: string,
    tokens: TokenRegistryItem[],
    mode: "send" | "title"
): string {
    let result = "";
    let tokenIndex = 0;
    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if (ch === TOKEN_SEPARATOR) {
            continue;
        }
        if (ch === TOKEN_PLACEHOLDER) {
            const token = tokens[tokenIndex];
            if (token) {
                if (token.type === "command") {
                    result += mode === "send" ? token.content : `/${token.name}`;
                } else if (token.type === "skill") {
                    result += mode === "send" ? token.content : `@${token.name}`;
                } else if (token.type === "file") {
                    result += mode === "send" ? token.path : `@${token.name}`;
                }
            }
            tokenIndex += 1;
        } else {
            result += ch;
        }
    }
    return result;
}

export interface TriggerResult {
    rawIndex: number;
    filter: string;
}

/**
 * Find a trigger character (/ or @) in the value before the cursor
 */
export function findTrigger(
    value: string,
    cursorPos: number,
    triggerChar: "/" | "@"
): TriggerResult | null {
    let cleaned = "";
    let lastTriggerCleanIndex = -1;
    let lastTriggerRawIndex = -1;
    let i = 0;

    while (i < cursorPos) {
        if (value[i] === TOKEN_PLACEHOLDER) {
            i += 1;
            continue;
        }
        if (value[i] === TOKEN_SEPARATOR) {
            i += 1;
            continue;
        }
        const ch = value[i];
        if (ch === triggerChar) {
            lastTriggerCleanIndex = cleaned.length;
            lastTriggerRawIndex = i;
        }
        cleaned += ch;
        i += 1;
    }

    if (lastTriggerCleanIndex === -1) return null;
    const textAfterTrigger = cleaned.slice(lastTriggerCleanIndex + 1);
    if (textAfterTrigger.includes(" ") || textAfterTrigger.includes("\n")) return null;
    return { rawIndex: lastTriggerRawIndex, filter: textAfterTrigger };
}

/**
 * Count the number of placeholder runs before endIndex
 */
export function countPlaceholders(value: string, endIndex = value.length): number {
    let count = 0;
    let inRun = false;
    for (let i = 0; i < endIndex; i += 1) {
        const isPlaceholder = value[i] === TOKEN_PLACEHOLDER;
        if (isPlaceholder && !inRun) {
            count += 1;
        }
        inRun = isPlaceholder;
    }
    return count;
}

/**
 * Get the lengths of each placeholder run in the value
 */
export function getPlaceholderRuns(value: string): number[] {
    const runs: number[] = [];
    let currentRun = 0;
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] === TOKEN_PLACEHOLDER) {
            currentRun += 1;
        } else if (currentRun > 0) {
            runs.push(currentRun);
            currentRun = 0;
        }
    }
    if (currentRun > 0) runs.push(currentRun);
    return runs;
}

export interface ReplacePlaceholderResult {
    nextValue: string;
    runCount: number;
}

/**
 * Replace placeholder runs with new lengths
 */
export function replacePlaceholderRuns(
    value: string,
    desiredRuns: number[]
): ReplacePlaceholderResult {
    let result = "";
    let runIndex = 0;
    let i = 0;
    while (i < value.length) {
        if (value[i] === TOKEN_PLACEHOLDER) {
            const start = i;
            while (i < value.length && value[i] === TOKEN_PLACEHOLDER) {
                i += 1;
            }
            const currentLength = i - start;
            const nextLength = desiredRuns[runIndex] ?? currentLength;
            result += TOKEN_PLACEHOLDER.repeat(nextLength);
            runIndex += 1;
            continue;
        }
        result += value[i];
        i += 1;
    }
    return { nextValue: result, runCount: runIndex };
}

export interface PlaceholderRemovalResult {
    newValue: string;
    newCursorPos: number;
}

/**
 * Remove a placeholder run before the cursor position (for Backspace)
 */
export function removePlaceholderBeforeCursor(
    value: string,
    cursorPos: number
): PlaceholderRemovalResult | null {
    if (cursorPos <= 0) return null;
    if (value[cursorPos - 1] !== TOKEN_PLACEHOLDER) return null;
    let startIndex = cursorPos - 1;
    while (startIndex > 0 && value[startIndex - 1] === TOKEN_PLACEHOLDER) {
        startIndex -= 1;
    }
    let endIndex = cursorPos;
    while (endIndex < value.length && value[endIndex] === TOKEN_PLACEHOLDER) {
        endIndex += 1;
    }
    if (startIndex > 0 && value[startIndex - 1] === TOKEN_SEPARATOR) {
        startIndex -= 1;
    }
    if (endIndex < value.length && value[endIndex] === TOKEN_SEPARATOR) {
        endIndex += 1;
    }
    return {
        newValue: value.slice(0, startIndex) + value.slice(endIndex),
        newCursorPos: startIndex
    };
}

/**
 * Remove a placeholder run at the cursor position (for Delete)
 */
export function removePlaceholderAtCursor(
    value: string,
    cursorPos: number
): PlaceholderRemovalResult | null {
    if (cursorPos >= value.length) return null;
    if (value[cursorPos] !== TOKEN_PLACEHOLDER) return null;
    let startIndex = cursorPos;
    while (startIndex > 0 && value[startIndex - 1] === TOKEN_PLACEHOLDER) {
        startIndex -= 1;
    }
    let endIndex = cursorPos + 1;
    while (endIndex < value.length && value[endIndex] === TOKEN_PLACEHOLDER) {
        endIndex += 1;
    }
    if (startIndex > 0 && value[startIndex - 1] === TOKEN_SEPARATOR) {
        startIndex -= 1;
    }
    if (endIndex < value.length && value[endIndex] === TOKEN_SEPARATOR) {
        endIndex += 1;
    }
    return {
        newValue: value.slice(0, startIndex) + value.slice(endIndex),
        newCursorPos: startIndex
    };
}

export interface DiffRange {
    start: number;
    endPrev: number;
    endNext: number;
}

/**
 * Compute the diff range between two strings
 */
export function computeDiffRange(prev: string, next: string): DiffRange {
    let start = 0;
    const prevLength = prev.length;
    const nextLength = next.length;
    while (start < prevLength && start < nextLength && prev[start] === next[start]) {
        start += 1;
    }
    let endPrev = prevLength - 1;
    let endNext = nextLength - 1;
    while (endPrev >= start && endNext >= start && prev[endPrev] === next[endNext]) {
        endPrev -= 1;
        endNext -= 1;
    }
    return { start, endPrev, endNext };
}
