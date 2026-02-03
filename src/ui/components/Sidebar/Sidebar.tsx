import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@ui/store/useAppStore";
import type { SidebarProps } from "./types";
import { SessionItem, ResumeDialog, DeleteDialog } from "./components";
import { formatCwd, getRelativeTime } from "./utils";

export function Sidebar({
    onNewSession,
    onDeleteSession,
    className = "",
    onClose
}: SidebarProps) {
    const { t, i18n } = useTranslation();

    const sidebarClasses = `flex flex-col h-full bg-surface-cream border-r border-ink-900/5 transition-colors duration-300 ease-in-out ${className}`;

    const sessions = useAppStore((state) => state.sessions);
    const activeSessionId = useAppStore((state) => state.activeSessionId);
    const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);
    const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
    const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const sessionList = useMemo(() => {
        const list = [...Object.values(sessions)]
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

        if (!searchQuery.trim()) return list;

        const lowerQuery = searchQuery.toLowerCase();
        return list.filter(session =>
            (session.title || "").toLowerCase().includes(lowerQuery) ||
            (session.cwd || "").toLowerCase().includes(lowerQuery)
        );
    }, [sessions, searchQuery]);

    const handleFormatCwd = (cwd?: string) => formatCwd(cwd, t("sidebar.workingDirUnavailable"));
    const handleGetRelativeTime = (timestamp?: number) => getRelativeTime(timestamp, now, i18n.language);

    const handleDeleteConfirm = () => {
        if (deleteSessionId) {
            onDeleteSession(deleteSessionId);
            setDeleteSessionId(null);
        }
    };

    return (
        <aside className={sidebarClasses}>
            {/* Header Section */}
            <div
                className="flex flex-col gap-3 px-4 pt-5 pb-2 shrink-0 bg-surface-cream z-10"
                style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
            >
                {/* Mobile Header with Close Button */}
                <div className="md:hidden flex items-center justify-between mb-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                    <span className="text-sm font-medium text-ink-700">{t("sidebar.menu", "菜单")}</span>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md hover:bg-ink-900/5 text-ink-500"
                            aria-label={t("common.close", "关闭")}
                        >
                            <svg className="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="flex gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                    <button
                        className="flex-1 rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        onClick={onNewSession}
                    >
                        {t("sidebar.newTask")}
                    </button>
                    <button
                        className="rounded-xl border border-ink-900/10 bg-surface px-3 py-2.5 text-sm text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        onClick={() => useAppStore.getState().setShowSettingsModal(true)}
                        aria-label={t("settings.title", "Settings")}
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative group" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                    <input
                        type="text"
                        name="search"
                        autoComplete="off"
                        aria-label={t("sidebar.searchPlaceholder")}
                        className="w-full rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 pl-10 text-sm text-ink-800 placeholder:text-muted focus:border-ink-900/20 focus:outline-none transition-colors"
                        placeholder={t("sidebar.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted group-focus-within:text-ink-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {sessionList.length === 0 && (
                    <div className="rounded-xl border border-ink-900/5 bg-surface px-4 py-5 text-center text-xs text-muted mt-2">
                        {searchQuery ? t("sidebar.searchNoResults") : t("sidebar.noSessions")}
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    {sessionList.map((session) => (
                        <SessionItem
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            onSelect={() => setActiveSessionId(session.id)}
                            onDelete={() => setDeleteSessionId(session.id)}
                            onResume={() => setResumeSessionId(session.id)}
                            formatCwd={handleFormatCwd}
                            getRelativeTime={handleGetRelativeTime}
                        />
                    ))}
                </div>
            </div>

            <ResumeDialog
                sessionId={resumeSessionId}
                onClose={() => setResumeSessionId(null)}
            />

            <DeleteDialog
                sessionId={deleteSessionId}
                onClose={() => setDeleteSessionId(null)}
                onConfirm={handleDeleteConfirm}
            />
        </aside>
    );
}
