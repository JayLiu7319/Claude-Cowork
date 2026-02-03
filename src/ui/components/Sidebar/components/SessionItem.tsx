import {
    Root as DropdownMenuRoot,
    Trigger as DropdownMenuTrigger,
    Portal as DropdownMenuPortal,
    Content as DropdownMenuContent,
    Item as DropdownMenuItem
} from "@radix-ui/react-dropdown-menu";
import { useTranslation } from "react-i18next";
import type { SessionItemProps } from "../types";
import { StatusIcon } from "./StatusIcon";

/**
 * Individual session item in the sidebar list
 * Displays session info with status, title, cwd, and a dropdown menu
 */
export function SessionItem({
    session,
    isActive,
    onSelect,
    onDelete,
    onResume,
    formatCwd,
    getRelativeTime
}: SessionItemProps) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            className={`w-full group relative rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isActive
                    ? "border-accent/30 bg-accent-subtle shadow-sm"
                    : "border-transparent bg-transparent hover:bg-ink-900/5"
                }`}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0 flex-1 overflow-hidden mr-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="shrink-0 flex items-center justify-center w-3.5 h-3.5 translate-y-[0.5px]">
                            <StatusIcon status={session.status} />
                        </div>
                        <div className="text-[13px] font-medium truncate text-ink-800" title={session.title}>
                            {session.title || "Untitled Task"}
                        </div>
                    </div>
                    <div className="flex items-center text-[11px] text-muted">
                        <span className="truncate" title={formatCwd(session.cwd)}>
                            {formatCwd(session.cwd)}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <DropdownMenuRoot>
                        <DropdownMenuTrigger asChild>
                            <span
                                role="button"
                                tabIndex={0}
                                className={`flex-shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${isActive ? "text-accent hover:bg-accent/10" : "text-ink-500 hover:bg-ink-900/10"
                                    }`}
                                aria-label="Open session menu"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") e.stopPropagation();
                                }}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                                    <circle cx="5" cy="12" r="1.5" />
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="19" cy="12" r="1.5" />
                                </svg>
                            </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuContent
                                className="z-50 min-w-[220px] rounded-xl border border-ink-900/10 bg-white p-1 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-100"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuItem
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 outline-none hover:bg-ink-900/5 focus:bg-ink-900/5"
                                    onSelect={onDelete}
                                >
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4 text-error/80"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <path d="M4 7h16" />
                                        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                        <path d="M7 7l1 12a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9l1-12" />
                                    </svg>
                                    {t("sidebar.deleteSession")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 outline-none hover:bg-ink-900/5 focus:bg-ink-900/5"
                                    onSelect={onResume}
                                >
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4 text-ink-500"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <path d="M4 5h16v14H4z" />
                                        <path d="M7 9h10M7 12h6" />
                                        <path d="M13 15l3 2-3 2" />
                                    </svg>
                                    {t("sidebar.resumeInClaudeCode")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenuPortal>
                    </DropdownMenuRoot>
                    <span className="text-[10px] text-ink-400 opacity-60 transition-opacity group-hover:opacity-100 truncate">
                        {getRelativeTime(session.updatedAt)}
                    </span>
                </div>
            </div>
        </button>
    );
}
