import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { PermissionResult, SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { i18n } from 'i18next';
import { useIPC } from "./hooks/useIPC";
import { useMessageWindow } from "./hooks/useMessageWindow";
import { useAppStore } from "./store/useAppStore";
import type { ServerEvent } from "./types";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { StartSessionModal } from "./components/StartSessionModal";
import { SettingsModal } from "./components/SettingsModal";
import { PromptInput } from "./components/PromptInput";
import { usePromptActions } from "./hooks/usePromptActions";
import { MessageCard } from "./components/EventCard";
import MDContent from "./render/markdown";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { initI18n } from "./i18n";

const SCROLL_THRESHOLD = 50;

function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [i18nInstance, setI18nInstance] = useState<i18n | null>(null);

  // Initialize i18n
  useEffect(() => {
    initI18n().then((instance) => {
      setI18nInstance(instance);
      setI18nReady(true);
    }).catch((err: Error) => {
      console.error("Failed to initialize i18n:", err);
      setI18nReady(true); // Continue anyway to prevent blocking
    });
  }, []);

  // Don't render until i18n is ready
  if (!i18nReady || !i18nInstance) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18nInstance}>
      <AppShell />
    </I18nextProvider>
  );
}

function AppShell() {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const partialMessageRef = useRef("");
  const [partialMessage, setPartialMessage] = useState("");
  const [showPartialMessage, setShowPartialMessage] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const prevMessagesLengthRef = useRef(0);
  const scrollHeightBeforeLoadRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const activeSessionIdRef = useRef(activeSessionId);
  const previousSessionIdRef = useRef<string | null>(activeSessionId);
  const showStartModal = useAppStore((s) => s.showStartModal);
  const setShowStartModal = useAppStore((s) => s.setShowStartModal);
  const showSettingsModal = useAppStore((s) => s.showSettingsModal);
  const setShowSettingsModal = useAppStore((s) => s.setShowSettingsModal);
  const globalError = useAppStore((s) => s.globalError);
  const setGlobalError = useAppStore((s) => s.setGlobalError);
  const historyRequested = useAppStore((s) => s.historyRequested);
  const markHistoryRequested = useAppStore((s) => s.markHistoryRequested);
  const resolvePermissionRequest = useAppStore((s) => s.resolvePermissionRequest);
  const handleServerEvent = useAppStore((s) => s.handleServerEvent);
  const prompt = useAppStore((s) => s.prompt);
  const setPrompt = useAppStore((s) => s.setPrompt);
  const cwd = useAppStore((s) => s.cwd);
  const setCwd = useAppStore((s) => s.setCwd);
  const pendingStart = useAppStore((s) => s.pendingStart);
  const apiConfigChecked = useAppStore((s) => s.apiConfigChecked);
  const setApiConfigChecked = useAppStore((s) => s.setApiConfigChecked);
  const rightPanelActiveTab = useAppStore((s) => s.rightPanelActiveTab);
  const setRightPanelActiveTab = useAppStore((s) => s.setRightPanelActiveTab);
  const toggleFolderExpanded = useAppStore((s) => s.toggleFolderExpanded);

  // Check user's motion preference
  const prefersReducedMotion = useMemo(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Helper function to extract partial message content
  const getPartialMessageContent = (eventMessage: { delta: unknown }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delta = eventMessage.delta as { type: string;[key: string]: any };
      const realType = delta.type.split("_")[0];
      return delta[realType];
    } catch (error) {
      console.error(error);
      return "";
    }
  };

  // Keep activeSessionIdRef in sync with activeSessionId
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Handle partial messages from stream events
  const handlePartialMessages = useCallback((partialEvent: ServerEvent) => {
    if (partialEvent.type !== "stream.message") return;

    // CRITICAL: Check if this event belongs to the current active session
    const currentSessionId = activeSessionIdRef.current;
    if (partialEvent.payload.sessionId !== currentSessionId) return;

    if (partialEvent.payload.message.type !== "stream_event") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = partialEvent.payload.message as any;
    if (message.event.type === "content_block_start") {
      partialMessageRef.current = "";
      setPartialMessage(partialMessageRef.current);
      setShowPartialMessage(true);
    }

    if (message.event.type === "content_block_delta") {
      partialMessageRef.current += getPartialMessageContent(message.event) || "";
      setPartialMessage(partialMessageRef.current);
      if (shouldAutoScroll) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setHasNewMessages(true);
      }
    }

    if (message.event.type === "content_block_stop") {
      // 立即清空，避免重复显示
      partialMessageRef.current = "";
      setPartialMessage("");
      setShowPartialMessage(false);
    }
  }, [shouldAutoScroll]);

  // Combined event handler
  const onEvent = useCallback((event: ServerEvent) => {
    handleServerEvent(event);
    handlePartialMessages(event);
  }, [handleServerEvent, handlePartialMessages]);

  const { connected, sendEvent } = useIPC(onEvent);
  const { handleStartFromModal } = usePromptActions(sendEvent);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession?.messages]);
  const permissionRequests = activeSession?.permissionRequests ?? [];
  const isRunning = activeSession?.status === "running";
  const rightPanelTodos = activeSession?.todos ?? [];
  const rightPanelFileChanges = activeSession?.fileChanges ?? [];
  const rightPanelFileTree = activeSession?.fileTree ?? null;
  const rightPanelExpandedFolders = activeSession?.expandedFolders ?? new Set();

  const {
    visibleMessages,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreMessages,
    resetToLatest,
    totalMessages,
  } = useMessageWindow(messages, activeSessionId);

  // 启动时检查 API 配置
  useEffect(() => {
    if (!apiConfigChecked) {
      window.electron.checkApiConfig().then((result) => {
        setApiConfigChecked(true);
        if (!result.hasConfig) {
          setShowSettingsModal(true);
        }
      }).catch((err) => {
        console.error("Failed to check API config:", err);
        setApiConfigChecked(true);
      });
    }
  }, [apiConfigChecked, setApiConfigChecked, setShowSettingsModal]);

  useEffect(() => {
    if (connected) sendEvent({ type: "session.list" });
  }, [connected, sendEvent]);

  useEffect(() => {
    if (!activeSessionId || !connected) return;
    const session = sessions[activeSessionId];
    if (session && !session.hydrated && !historyRequested.has(activeSessionId)) {
      markHistoryRequested(activeSessionId);
      sendEvent({ type: "session.history", payload: { sessionId: activeSessionId } });
    }
  }, [activeSessionId, connected, sessions, historyRequested, markHistoryRequested, sendEvent]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD;

    if (isAtBottom !== shouldAutoScroll) {
      setShouldAutoScroll(isAtBottom);
      if (isAtBottom) {
        setHasNewMessages(false);
      }
    }
  }, [shouldAutoScroll]);

  // Set up IntersectionObserver for top sentinel
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreHistory && !isLoadingHistory) {
          scrollHeightBeforeLoadRef.current = container.scrollHeight;
          shouldRestoreScrollRef.current = true;
          loadMoreMessages();
        }
      },
      {
        root: container,
        rootMargin: "100px 0px 0px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreHistory, isLoadingHistory, loadMoreMessages]);

  // Restore scroll position after loading history
  useEffect(() => {
    if (shouldRestoreScrollRef.current && !isLoadingHistory) {
      const container = scrollContainerRef.current;
      if (container) {
        const newScrollHeight = container.scrollHeight;
        const scrollDiff = newScrollHeight - scrollHeightBeforeLoadRef.current;
        container.scrollTop += scrollDiff;
      }
      shouldRestoreScrollRef.current = false;
    }
  }, [visibleMessages, isLoadingHistory]);

  // Reset scroll state on session change
  useEffect(() => {
    // Get the previous session ID before updating
    const previousSessionId = previousSessionIdRef.current;

    // Reset scroll state
    // Defer state updates to avoid synchronous setState in effect
    // Reset scroll state and partial message
    setTimeout(() => {
      setShouldAutoScroll(true);
      setHasNewMessages(false);
      prevMessagesLengthRef.current = 0;

      if (previousSessionId !== activeSessionId) {
        setPartialMessage("");
        // Check if the new session is currently running
        const newSession = activeSessionId ? sessions[activeSessionId] : undefined;
        const isNewSessionRunning = newSession?.status === "running";
        setShowPartialMessage(isNewSessionRunning);
      }
    }, 0);

    // CRITICAL: Only reset partial message ref when switching to a DIFFERENT session
    if (previousSessionId !== activeSessionId) {
      partialMessageRef.current = "";
    }

    // Update the previous session ID ref for next time
    previousSessionIdRef.current = activeSessionId;

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      setTimeout(() => setHasNewMessages(true), 0);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, partialMessage, shouldAutoScroll]);

  const scrollToBottom = useCallback(() => {
    setShouldAutoScroll(true);
    setHasNewMessages(false);
    resetToLatest();
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [resetToLatest]);

  const handleNewSession = useCallback(() => {
    useAppStore.getState().setActiveSessionId(null);
    setShowStartModal(true);
  }, [setShowStartModal]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    sendEvent({ type: "session.delete", payload: { sessionId } });
  }, [sendEvent]);

  const handlePermissionResult = useCallback((toolUseId: string, result: PermissionResult) => {
    if (!activeSessionId) return;
    sendEvent({ type: "permission.response", payload: { sessionId: activeSessionId, toolUseId, result } });
    resolvePermissionRequest(activeSessionId, toolUseId);
  }, [activeSessionId, sendEvent, resolvePermissionRequest]);

  const handleSendMessage = useCallback(() => {
    setShouldAutoScroll(true);
    setHasNewMessages(false);
    resetToLatest();
  }, [resetToLatest]);

  const handleScrollToMessage = useCallback((messageIndex: number) => {
    // Reset to latest first to ensure all messages are loaded and visible
    resetToLatest();

    // Schedule scroll after state update
    setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Find the message element
      const messageElement = document.querySelector(`[data-message-index="${messageIndex}"]`);
      if (messageElement) {
        const containerRect = container.getBoundingClientRect();
        const messageRect = messageElement.getBoundingClientRect();
        const offset = messageRect.top - containerRect.top + container.scrollTop - 20;

        container.scrollTo({
          top: offset,
          behavior: "smooth"
        });
        setShouldAutoScroll(false);
      }
    }, 100);
  }, [resetToLatest]);

  const showSkeleton = useMemo(() => {
    if (showPartialMessage) return true;
    if (!isRunning) return false;

    // Check if the last message in the list handles its own loading state (specifically Tool Use)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'assistant') {
      const content = (lastMessage as SDKAssistantMessage).message?.content;
      if (Array.isArray(content) && content.length > 0) {
        const lastContent = content[content.length - 1];
        // If the last content is a tool use, it has its own spinner in EventCard, so hide skeleton
        if (lastContent.type === 'tool_use') {
          return false;
        }
      }
    }

    // Default to showing skeleton if running and no specific reason to hide
    return true;
  }, [showPartialMessage, isRunning, messages]);

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar
        connected={connected}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      <main className="flex flex-1 flex-col ml-[280px] mr-[280px] bg-surface-cream">
        <div
          className="flex items-center justify-center h-12 border-b border-ink-900/10 bg-surface-cream select-none px-4"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-sm font-medium text-ink-700 truncate max-w-full" title={activeSession?.title || "Agent Cowork"}>
            {activeSession?.title || "Agent Cowork"}
          </span>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-8 pb-40 pt-6"
        >
          <div className="mx-auto max-w-3xl">
            <div ref={topSentinelRef} className="h-1" />

            {!hasMoreHistory && totalMessages > 0 && (
              <div className="flex items-center justify-center py-4 mb-4">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <div className="h-px w-12 bg-ink-900/10" />
                  <span>{t('sidebar.beginningOfConversation')}</span>
                  <div className="h-px w-12 bg-ink-900/10" />
                </div>
              </div>
            )}

            {isLoadingHistory && (
              <div className="flex items-center justify-center py-4 mb-4" role="status" aria-live="polite">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{t('common.loading')}</span>
                </div>
              </div>
            )}

            {visibleMessages.length === 0 ? (
              (activeSession && !activeSession.hydrated) ? (
                <SkeletonLoader />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <h2 className="text-xl font-semibold text-ink-700 mb-2">
                    {t('emptyState.title')}
                  </h2>
                  <p className="text-sm text-muted">
                    {t('emptyState.description')}
                  </p>
                </div>
              )
            ) : (
              visibleMessages.map((item, idx) => {
                return (
                  <div key={`${activeSessionId}-msg-${item.originalIndex}`} data-message-index={item.originalIndex}>
                    <MessageCard
                      message={item.message}
                      allMessages={messages}
                      isLast={idx === visibleMessages.length - 1}
                      isRunning={isRunning}
                      permissionRequest={permissionRequests[0]}
                      onPermissionResult={handlePermissionResult}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  </div>
                );
              })
            )
            }

            {/* Partial message display with skeleton loading */}
            <div className="partial-message">
              <MDContent text={partialMessage} />
              {showSkeleton && (
                <div className="mt-3 flex flex-col gap-2 px-1">
                  <div className="relative h-3 w-2/12 overflow-hidden rounded-full bg-ink-900/10">
                    {!prefersReducedMotion && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                    {!prefersReducedMotion && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                    {!prefersReducedMotion && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                    {!prefersReducedMotion && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                  <div className="relative h-3 w-4/12 overflow-hidden rounded-full bg-ink-900/10">
                    {!prefersReducedMotion && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>
        </div>

        <PromptInput sendEvent={sendEvent} onSendMessage={handleSendMessage} disabled={visibleMessages.length === 0} />

        {hasNewMessages && !shouldAutoScroll && (
          <button
            onClick={scrollToBottom}
            aria-label="Scroll to bottom to view new messages"
            className={`fixed bottom-28 left-1/2 ml-[140px] z-40 -translate-x-1/2 flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${!prefersReducedMotion ? 'animate-bounce-subtle' : ''}`}
            style={!prefersReducedMotion ? {} : { transform: 'translateX(-50%)' }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            <span>{t('common.newMessages')}</span>
          </button>
        )}
      </main>

      <RightPanel
        activeTab={rightPanelActiveTab}
        onTabChange={setRightPanelActiveTab}
        todos={rightPanelTodos}
        fileChanges={rightPanelFileChanges}
        fileTree={rightPanelFileTree}
        expandedFolders={rightPanelExpandedFolders}
        onToggleFolder={(path) => {
          if (activeSessionId) {
            toggleFolderExpanded(activeSessionId, path);
          }
        }}
        onScrollToMessage={handleScrollToMessage}
      />

      {showStartModal && (
        <StartSessionModal
          cwd={cwd}
          prompt={prompt}
          pendingStart={pendingStart}
          onCwdChange={setCwd}
          onPromptChange={setPrompt}
          onStart={handleStartFromModal}
          onClose={() => setShowStartModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {globalError && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-error/20 bg-error-light px-4 py-3 shadow-lg" role="alert">
          <div className="flex items-center gap-3">
            <span className="text-sm text-error">{globalError}</span>
            <button
              aria-label="Close error message"
              className="text-error hover:text-error/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error rounded"
              onClick={() => setGlobalError(null)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
