import type { ServerEvent } from "../../../types.js";
import type { Session } from "../session-store.js";

/**
 * Details extracted from runner errors for logging.
 */
export type RunnerErrorDetails = {
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

/**
 * Options for running a Claude session.
 */
export type RunnerOptions = {
    prompt: string;
    session: Session;
    resumeSessionId?: string;
    planMode?: boolean;
    onEvent: (event: ServerEvent) => void;
    onSessionUpdate?: (updates: Partial<Session>) => void;
};

/**
 * Handle returned from runClaude for controlling the running session.
 */
export type RunnerHandle = {
    abort: () => void;
};
