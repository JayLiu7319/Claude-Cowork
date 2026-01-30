import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "../store/useAppStore";

interface SidebarProps {
  connected: boolean;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  className?: string;
  onClose?: () => void;
}

export function Sidebar({
  onNewSession,
  onDeleteSession,
  className = "",
  onClose
}: SidebarProps) {
  const { t, i18n } = useTranslation();

  // Combine default classes with custom className
  // default: w-[280px] flex-col border-r border-ink-900/5 bg-surface-cream h-full
  const sidebarClasses = `flex flex-col h-full bg-surface-cream border-r border-ink-900/5 transition-colors duration-300 ease-in-out ${className}`;

  const StatusIcon = ({ status }: { status?: string }) => {
    switch (status) {
      case "running":
        return (
          <div className="h-3.5 w-3.5 relative flex items-center justify-center" aria-label={t('status.running', 'Running')} role="status">
            <span className="animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-info/40 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
          </div>
        );
      case "completed":
        return (
          <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-label={t('status.completed', 'Completed')} role="img">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="h-3.5 w-3.5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-label={t('status.error', 'Error')} role="img">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-3.5 w-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-label={t('status.pending', 'Pending')} role="img">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatCwd = (cwd?: string) => {
    if (!cwd) return t('sidebar.workingDirUnavailable');
    const parts = cwd.split(/[\\/]+/).filter(Boolean);
    const tail = parts.slice(-2).join("/");
    return `/${tail || cwd}`;
  };

  const getRelativeTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const diff = (timestamp - now) / 1000;
    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });

    if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  };

  const sessionList = useMemo(() => {
    const list = Object.values(sessions);
    list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    if (!searchQuery.trim()) return list;

    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(session =>
      (session.title || "").toLowerCase().includes(lowerQuery) ||
      (session.cwd || "").toLowerCase().includes(lowerQuery)
    );
  }, [sessions, searchQuery]);

  useEffect(() => {
    setTimeout(() => setCopied(false), 0);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [resumeSessionId]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleCopyCommand = async () => {
    if (!resumeSessionId) return;
    const command = `claude --resume ${resumeSessionId}`;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setResumeSessionId(null);
    }, 3000);
  };

  return (
    <aside className={sidebarClasses}>
      {/* Header Section */}
      <div
        className="flex flex-col gap-3 px-4 pt-5 pb-2 shrink-0 bg-surface-cream z-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Mobile Header with Close Button */}
        <div className="md:hidden flex items-center justify-between mb-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <span className="text-sm font-medium text-ink-700">{t('sidebar.menu', '菜单')}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-ink-900/5 text-ink-500"
              aria-label={t('common.close', '关闭')}
            >
              <svg className="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            className="flex-1 rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={onNewSession}
          >
            {t('sidebar.newTask')}
          </button>
          <button
            className="rounded-xl border border-ink-900/10 bg-surface px-3 py-2.5 text-sm text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => useAppStore.getState().setShowSettingsModal(true)}
            aria-label={t('settings.title', 'Settings')}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative group" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <input
            type="text"
            name="search"
            autoComplete="off"
            aria-label={t('sidebar.searchPlaceholder')}
            className="w-full rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 pl-10 text-sm text-ink-800 placeholder:text-muted focus:border-ink-900/20 focus:outline-none transition-colors"
            placeholder={t('sidebar.searchPlaceholder')}
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
            {searchQuery ? t('sidebar.searchNoResults') : t('sidebar.noSessions')}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {sessionList.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`w-full group relative rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeSessionId === session.id
                ? "border-accent/30 bg-accent-subtle shadow-sm"
                : "border-transparent bg-transparent hover:bg-ink-900/5"
                }`}
              onClick={() => setActiveSessionId(session.id)}
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
                    <span className="truncate" title={formatCwd(session.cwd)}>{formatCwd(session.cwd)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <span
                        role="button"
                        tabIndex={0}
                        className={`flex-shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${activeSessionId === session.id ? 'text-accent hover:bg-accent/10' : 'text-ink-500 hover:bg-ink-900/10'
                          }`}
                        aria-label="Open session menu"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                          <circle cx="5" cy="12" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="19" cy="12" r="1.5" />
                        </svg>
                      </span>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="z-50 min-w-[220px] rounded-xl border border-ink-900/10 bg-white p-1 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-100" align="end" sideOffset={4}>
                        <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 outline-none hover:bg-ink-900/5 focus:bg-ink-900/5" onSelect={() => setDeleteSessionId(session.id)}>
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-error/80" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M7 7l1 12a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9l1-12" />
                          </svg>
                          {t('sidebar.deleteSession')}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 outline-none hover:bg-ink-900/5 focus:bg-ink-900/5" onSelect={() => setResumeSessionId(session.id)}>
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 5h16v14H4z" /><path d="M7 9h10M7 12h6" /><path d="M13 15l3 2-3 2" />
                          </svg>
                          {t('sidebar.resumeInClaudeCode')}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                  <span className="text-[10px] text-ink-400 opacity-60 transition-opacity group-hover:opacity-100 truncate">{getRelativeTime(session.updatedAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <Dialog.Root open={!!resumeSessionId} onOpenChange={(open) => !open && setResumeSessionId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm overscroll-contain" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="text-lg font-semibold text-ink-800">{t('sidebar.resumeTitle')}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full p-1 text-ink-500 hover:bg-ink-900/10" aria-label="Close dialog">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink-900/10 bg-surface px-3 py-2 font-mono text-xs text-ink-700">
              <span className="flex-1 break-all">{resumeSessionId ? `claude --resume ${resumeSessionId}` : ""}</span>
              <button className="rounded-lg p-1.5 text-ink-600 hover:bg-ink-900/10" onClick={handleCopyCommand} aria-label="Copy resume command">
                {copied ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l4 4L19 6" /></svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 overscroll-contain" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-50">
            <Dialog.Title className="text-lg font-semibold text-ink-800">
              {t('sidebar.deleteSession', '删除会话')}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted">
              {t('sidebar.deleteConfirmation', '您确定要删除此会话吗？此操作无法撤销。')}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-xl px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-900/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {t('common.cancel', '取消')}
                </button>
              </Dialog.Close>
              <button
                className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
                onClick={() => {
                  if (deleteSessionId) {
                    onDeleteSession(deleteSessionId);
                    setDeleteSessionId(null);
                  }
                }}
              >
                {t('common.delete', '删除')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </aside>
  );
}
