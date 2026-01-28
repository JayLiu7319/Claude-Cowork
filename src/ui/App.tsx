import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { PermissionResult, SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { i18n } from 'i18next';
import { useShallow } from 'zustand/shallow';
import { useIPC } from "./hooks/useIPC";
import { useMessageWindow } from "./hooks/useMessageWindow";
import { useBrandTheme } from "./hooks/useBrandTheme";
import { useAppStore } from "./store/useAppStore";
import type { ServerEvent, BrandConfig } from "./types";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { WelcomePage } from "./components/WelcomePage";
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
  // RAF throttling for partial message updates
  const rafIdRef = useRef<number | null>(null);
  const pendingPartialUpdateRef = useRef(false);

  // Merge data selectors with shallow comparison to prevent unnecessary re-renders
  // This reduces subscriptions and only re-renders when actually used state changes
  const { sessions, historyRequested } = useAppStore(
    useShallow((s) => ({
      sessions: s.sessions,
      historyRequested: s.historyRequested
    }))
  );
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const showSettingsModal = useAppStore((s) => s.showSettingsModal);
  const globalError = useAppStore((s) => s.globalError);
  const cwd = useAppStore((s) => s.cwd);
  const apiConfigChecked = useAppStore((s) => s.apiConfigChecked);
  const lastFileRefresh = useAppStore((s) => s.lastFileRefresh);

  const activeSessionIdRef = useRef(activeSessionId);
  const previousSessionIdRef = useRef<string | null>(activeSessionId);

  // Separate stable function selectors - these never change so no re-render risk
  const setShowSettingsModal = useAppStore((s) => s.setShowSettingsModal);
  const setGlobalError = useAppStore((s) => s.setGlobalError);
  const markHistoryRequested = useAppStore((s) => s.markHistoryRequested);
  const resolvePermissionRequest = useAppStore((s) => s.resolvePermissionRequest);
  const handleServerEvent = useAppStore((s) => s.handleServerEvent);
  const setCwd = useAppStore((s) => s.setCwd);
  const setApiConfigChecked = useAppStore((s) => s.setApiConfigChecked);
  const setDefaultCwd = useAppStore((s) => s.setDefaultCwd);
  const setBrandConfig = useAppStore((s) => s.setBrandConfig);
  const brandConfig = useAppStore((s) => s.brandConfig);

  // Apply brand theme
  useBrandTheme(brandConfig);
  const isWindows = navigator.userAgent.includes('Windows');

  // Check user's motion preference
  const prefersReducedMotion = useMemo(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  /**
   * Flush pending partial message update to state.
   * This is called by requestAnimationFrame to throttle UI updates to 60fps.
   */
  const flushPartialMessage = useCallback(() => {
    if (pendingPartialUpdateRef.current) {
      setPartialMessage(partialMessageRef.current);
      pendingPartialUpdateRef.current = false;
    }
    rafIdRef.current = null;
  }, []);

  /**
   * Schedule a throttled partial message update.
   * Instead of updating state on every token (1000+ times/sec), we throttle
   * to 60fps using requestAnimationFrame for smooth rendering.
   */
  const schedulePartialUpdate = useCallback(() => {
    pendingPartialUpdateRef.current = true;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushPartialMessage);
    }
  }, [flushPartialMessage]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

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
      // Accumulate text in ref (always immediate, never dropped)
      partialMessageRef.current += getPartialMessageContent(message.event) || "";
      // Throttle UI updates to 60fps instead of 1000+ times/sec
      schedulePartialUpdate();
      if (shouldAutoScroll) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setHasNewMessages(true);
      }
    }

    if (message.event.type === "content_block_stop") {
      // Flush any pending update immediately to ensure no text is lost
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setPartialMessage(partialMessageRef.current);
      // Then clear for next block
      partialMessageRef.current = "";
      setPartialMessage("");
      setShowPartialMessage(false);
    }
  }, [shouldAutoScroll, schedulePartialUpdate]);

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


  const {
    visibleMessages,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreMessages,
    resetToLatest,
    totalMessages,
  } = useMessageWindow(messages, activeSessionId);

  // 启动时检查 API 配置、加载默认工作目录和品牌配置
  useEffect(() => {
    if (!apiConfigChecked) {
      // Load brand config
      window.electron.getBrandConfig().then((config: BrandConfig) => {
        setBrandConfig(config);
      }).catch((err: Error) => {
        console.error("Failed to load brand config:", err);
      });

      // Load default cwd
      window.electron.getDefaultCwd().then((defaultCwd) => {
        setDefaultCwd(defaultCwd);
        if (!cwd) {
          setCwd(defaultCwd);
        }
      }).catch(console.error);

      // Check API config
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
  }, [apiConfigChecked, setApiConfigChecked, setShowSettingsModal, setDefaultCwd, setCwd, cwd, setBrandConfig]);

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
    const didChangeSession = previousSessionId !== activeSessionId;

    if (!didChangeSession) return;

    const state = useAppStore.getState();
    const newSession = activeSessionId ? state.sessions[activeSessionId] : undefined;
    const isNewSessionRunning = newSession?.status === "running";

    // Reset scroll state
    // Defer state updates to avoid synchronous setState in effect
    // Reset scroll state and partial message
    setTimeout(() => {
      setShouldAutoScroll(true);
      setHasNewMessages(false);
      prevMessagesLengthRef.current = 0;
      setPartialMessage("");
      setShowPartialMessage(isNewSessionRunning);
    }, 0);

    // CRITICAL: Only reset partial message ref when switching to a DIFFERENT session
    partialMessageRef.current = "";

    // Update the previous session ID ref for next time
    previousSessionIdRef.current = activeSessionId;

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  }, [activeSessionId]);

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
    // No longer show modal, welcome page is displayed automatically
  }, []);

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

  const handleOpenFile = useCallback((path: string) => {
    if (activeSessionId) {
      sendEvent({ type: "file.open", payload: { sessionId: activeSessionId, path } });
    }
  }, [activeSessionId, sendEvent]);

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

  // Responsive state
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isRightPanelOpen, setRightPanelOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const titlebarRightPadding = isWindows && !isRightPanelOpen ? '160px' : undefined;

  // Initialize responsive state on mount and listen to resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // Tailwind md breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setRightPanelOpen(false);
      } else {
        setSidebarOpen(true);
        setRightPanelOpen(window.innerWidth >= 1280); // Open right panel only on XL screens by default
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const toggleRightPanel = useCallback(() => setRightPanelOpen(prev => !prev), []);

  if (!brandConfig) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-cream text-ink-600">
        <div className="flex items-center gap-3 text-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-ink-400" />
          <span>{t('common.loading', '加载中')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden relative">
      {/* Mobile Overlay/Backdrop */}
      {isMobile && (isSidebarOpen || isRightPanelOpen) && (
        <div
          className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => {
            setSidebarOpen(false);
            setRightPanelOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      <Sidebar
        connected={connected}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-40 w-[280px] shadow-2xl' : 'w-[280px] shrink-0'}
          ${!isSidebarOpen && isMobile ? '-translate-x-full' : 'translate-x-0'}
          ${!isSidebarOpen && !isMobile ? 'hidden' : 'flex'}
        `}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      {!activeSessionId ? (
        <WelcomePage
          onStartSession={handleStartFromModal}
          onMenuClick={toggleSidebar}
          onToggleRightPanel={toggleRightPanel}
          isRightPanelOpen={isRightPanelOpen}
        />
      ) : (
        <main className="flex flex-1 flex-col min-w-0 bg-surface-cream relative transition-all duration-300">
          <div className="flex flex-col">
            <div
              className={`relative flex items-center justify-between h-12 border-b border-ink-900/10 bg-surface-cream select-none px-4 ${isWindows && !isRightPanelOpen ? 'pr-[160px]' : ''}`}
              style={{ WebkitAppRegion: 'drag', paddingRight: titlebarRightPadding } as React.CSSProperties}
            >
              {/* Left Sidebar Toggle */}
              <div className="flex items-center z-10" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                  onClick={toggleSidebar}
                  className={`p-1.5 rounded-lg hover:bg-ink-900/5 ${!isSidebarOpen ? 'text-ink-400' : 'text-accent bg-accent/5'} transition-colors`}
                  aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16" />
                  </svg>
                </button>
              </div>

              {/* Centered Title */}
              <div className="absolute inset-x-0 flex justify-center items-center mx-16 pointer-events-none">
                <span className="text-sm font-medium text-ink-700 truncate max-w-full" title={activeSession?.title || "Agent Cowork"}>
                  {activeSession?.title || "Agent Cowork"}
                </span>
              </div>

              {/* Right Panel Toggle */}
              <div className="flex items-center z-10" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                  onClick={toggleRightPanel}
                  className={`p-1.5 rounded-lg hover:bg-ink-900/5 ${!isRightPanelOpen ? 'text-ink-400' : 'text-accent bg-accent/5'} transition-colors`}
                  aria-label={isRightPanelOpen ? "Close Info Panel" : "Open Info Panel"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 4v16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-0.5 bg-accent/50 transition-transform duration-300" />
          </div>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 md:px-8 pb-40 pt-6"
          >
            <div className="mx-auto max-w-3xl w-full transition-all duration-300">
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
              className={`fixed bottom-28 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${!prefersReducedMotion ? 'animate-bounce-subtle' : ''}`}
              style={!prefersReducedMotion ? {} : { transform: 'translateX(-50%)' }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span>{t('common.newMessages')}</span>
            </button>
          )}
        </main>
      )}

      <RightPanel
        todos={rightPanelTodos}
        fileChanges={rightPanelFileChanges}
        sessionCwd={activeSession?.cwd || cwd}
        onScrollToMessage={handleScrollToMessage}
        onOpenFile={handleOpenFile}
        lastFileRefresh={lastFileRefresh}
        className={`
          ${isMobile ? 'fixed inset-y-0 right-0 z-40 w-[280px] shadow-2xl' : 'w-[280px] shrink-0'}
          ${!isRightPanelOpen && isMobile ? 'translate-x-full' : 'translate-x-0'}
          ${!isRightPanelOpen && !isMobile ? 'hidden' : 'flex'}
        `}
        onClose={() => setRightPanelOpen(false)}
      />

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
