import type { RunnerErrorDetails } from "./types.js";

/**
 * Extract detailed error information from an unknown error.
 * Used for comprehensive error logging.
 */
export function getRunnerErrorDetails(error: unknown): RunnerErrorDetails {
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
