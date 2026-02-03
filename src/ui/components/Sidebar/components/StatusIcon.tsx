import type { StatusIconProps } from "../types";

/**
 * Status indicator icon for session items
 * Shows different visual styles based on session status
 */
export function StatusIcon({ status }: StatusIconProps) {
    switch (status) {
        case "running":
            return (
                <div className="h-3.5 w-3.5 relative flex items-center justify-center" role="status">
                    <span className="animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-info/40 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
                </div>
            );
        case "completed":
            return (
                <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" role="img">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            );
        case "error":
            return (
                <svg className="h-3.5 w-3.5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" role="img">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
        default:
            return (
                <svg className="h-3.5 w-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" role="img">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            );
    }
}
