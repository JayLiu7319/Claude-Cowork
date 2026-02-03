import type { StatusDotProps } from "./types";

/**
 * Status indicator dot component.
 * Shows different states: accent, success, error, pending.
 * Supports animations for active and pending states.
 */
export function StatusDot({
    variant = "accent",
    isActive = false,
    isVisible = true,
    prefersReducedMotion = false
}: StatusDotProps) {
    if (!isVisible) return null;

    if (variant === "pending") {
        return (
            <span className="relative flex h-2 w-2 items-center justify-center">
                {!prefersReducedMotion && (
                    <span className="absolute inline-flex h-full w-full animate-pulse-scale rounded-full bg-accent opacity-50" />
                )}
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
        );
    }

    const colorClass =
        variant === "success"
            ? "bg-success"
            : variant === "error"
                ? "bg-error"
                : "bg-accent";

    return (
        <span className="relative flex h-2 w-2">
            {isActive && !prefersReducedMotion && (
                <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colorClass} opacity-75`}
                />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${colorClass}`} />
        </span>
    );
}
