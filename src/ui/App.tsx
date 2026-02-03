import { useCallback, useEffect, useState, useMemo } from "react";
import type { PermissionResult, SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { useTranslation } from 'react-i18next';
import type { i18n } from 'i18next';
import { useShallow } from 'zustand/shallow';
import { useIPC } from "./hooks/useIPC";
import { useMessageWindow } from "./hooks/useMessageWindow";
import { useBrandTheme } from "./hooks/useBrandTheme";
import { useAppStore } from "./store/useAppStore";
import type { ServerEvent } from "./types";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { WelcomePage } from "./components/WelcomePage";
import { SettingsModal } from "./components/SettingsModal";
import { EnhancedPromptInput } from "./components/EnhancedPromptInput";
import { usePromptActions } from "./hooks/usePromptActions";
import { MessageCard } from "./components/EventCard";
import MDContent from "./render/markdown";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { initI18n } from "./i18n";
import { AppProviders } from "./providers/AppProviders";
import { useElectronBridge } from "./hooks/useElectronBridge";
import { usePartialMessage } from "./hooks/usePartialMessage";
import { useScrollManagement } from "./hooks/useScrollManagement";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout";

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
    <AppProviders i18nInstance={i18nInstance}>
      <AppShell />
    </AppProviders>
  );
}

function AppShell() {
  const { t } = useTranslation();
  const bridge = useElectronBridge();

  // Merge data selectors with shallow comparison to prevent unnecessary re-renders
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

  // Separate stable function selectors
  const setShowSettingsModal = useAppStore((s) => s.setShowSettingsModal);
  const setGlobalError = useAppStore((s) => s.setGlobalError);
  const markHistoryRequested = useAppStore((s) => s.markHistoryRequested);
  const resolvePermissionRequest = useAppStore((s) => s.resolvePermissionRequest);
  const handleServerEvent = useAppStore((s) => s.handleServerEvent);
  const setCwd = useAppStore((s) => s.setCwd);
  const setApiConfigChecked = useAppStore((s) => s.setApiConfigChecked);
  const setDefaultCwd = useAppStore((s) => s.setDefaultCwd);
  const setBrandConfig = useAppStore((s) => s.setBrandConfig);
  const setRecentFiles = useAppStore((s) => s.setRecentFiles);
  const brandConfig = useAppStore((s) => s.brandConfig);

  // Apply brand theme
  useBrandTheme(brandConfig);
  const isWindows = navigator.userAgent.includes('Windows');

  // Check user's motion preference
  const prefersReducedMotion = useMemo(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

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

  // Scroll Management
  const {
    scrollContainerRef,
    messagesEndRef,
    topSentinelRef,
    shouldAutoScroll,
    hasNewMessages,
    handleScroll,
    scrollToBottom,
    scrollToBottomIfAuto,
    scrollToMessage
  } = useScrollManagement({
    messagesLength: messages.length,
    activeSessionId,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreMessages,
  });

  // Partial Message Handling
  const {
    partialMessage,
    showPartialMessage,
    handlePartialMessages
  } = usePartialMessage({
    activeSessionId,
    shouldAutoScroll,
    onContentUpdate: scrollToBottomIfAuto
  });

  // Responsive Layout
  const {
    isSidebarOpen,
    setSidebarOpen,
    isRightPanelOpen,
    setRightPanelOpen,
    isMobile,
    toggleSidebar,
    toggleRightPanel
  } = useResponsiveLayout();

  const titlebarRightPadding = isWindows && !isRightPanelOpen ? '160px' : undefined;

  // Combined event handler
  const onEvent = useCallback((event: ServerEvent) => {
    handleServerEvent(event);
    handlePartialMessages(event);
  }, [handleServerEvent, handlePartialMessages]);

  const { connected, sendEvent } = useIPC(onEvent);
  const { handleStartFromModal } = usePromptActions(sendEvent);


  // Initial Configuration Checks
  useEffect(() => {
    if (!apiConfigChecked) {
      Promise.allSettled([
        bridge.getBrandConfig(),
        bridge.getDefaultCwd(),
        bridge.checkApiConfig()
      ]).then(([brandConfigResult, defaultCwdResult, apiConfigResult]) => {
        if (brandConfigResult.status === 'fulfilled') {
          setBrandConfig(brandConfigResult.value);
        } else {
          console.error("Failed to load brand config:", brandConfigResult.reason);
        }

        if (defaultCwdResult.status === 'fulfilled') {
          const defaultCwdValue = defaultCwdResult.value;
          setDefaultCwd(defaultCwdValue);
          if (!cwd) {
            setCwd(defaultCwdValue);
          }
        } else {
          console.error("Failed to load default cwd:", defaultCwdResult.reason);
        }

        setApiConfigChecked(true);
        if (apiConfigResult.status === 'fulfilled') {
          if (!apiConfigResult.value.hasConfig) {
            setShowSettingsModal(true);
          }
        } else {
          console.error("Failed to check API config:", apiConfigResult.reason);
        }
      });
    }
  }, [apiConfigChecked, setApiConfigChecked, setShowSettingsModal, setDefaultCwd, setCwd, cwd, setBrandConfig, bridge]);

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

  // Load recent files
  useEffect(() => {
    if (!activeSessionId) {
      setRecentFiles([]);
      return;
    }
    bridge.getRecentFiles(activeSessionId)
      .then((files) => setRecentFiles(files))
      .catch((err) => console.error("Failed to load recent files:", err));
  }, [activeSessionId, setRecentFiles, bridge]);

  const handleNewSession = useCallback(() => {
    useAppStore.getState().setActiveSessionId(null);
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
    scrollToBottom();
    resetToLatest();
  }, [resetToLatest, scrollToBottom]);

  const handleScrollToMessageCallback = useCallback((messageIndex: number) => {
    resetToLatest();
    scrollToMessage(messageIndex);
  }, [resetToLatest, scrollToMessage]);

  const handleOpenFile = useCallback((path: string) => {
    if (activeSessionId) {
      sendEvent({ type: "file.open", payload: { sessionId: activeSessionId, path } });
    }
  }, [activeSessionId, sendEvent]);

  const showSkeleton = useMemo(() => {
    if (showPartialMessage) return true;
    if (!isRunning) return false;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'assistant') {
      const content = (lastMessage as SDKAssistantMessage).message?.content;
      if (Array.isArray(content) && content.length > 0) {
        const lastContent = content[content.length - 1];
        if (lastContent.type === 'tool_use') {
          return false;
        }
      }
    }
    return true;
  }, [showPartialMessage, isRunning, messages]);

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
        <button
          type="button"
          className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-30 transition-opacity cursor-default focus:outline-none"
          onClick={() => {
            setSidebarOpen(false);
            setRightPanelOpen(false);
          }}
          aria-label="Close sidebar"
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
          isSidebarOpen={isSidebarOpen}
        />
      ) : (
        <main className="flex flex-1 flex-col min-w-0 bg-surface-cream relative transition-[margin,width] duration-300">
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
                  <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                </button>
              </div>

              {/* Centered Title */}
              <div
                className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none transition-[left,right] duration-300"
                style={{
                  left: '60px',
                  right: isWindows && !isRightPanelOpen ? '190px' : '60px'
                }}
              >
                <span
                  className="text-sm font-medium text-ink-700 truncate max-w-full"
                  title={activeSession?.title || "Agent Cowork"}
                >
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
                  <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="15" y1="3" x2="15" y2="21" />
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
            <div className="mx-auto max-w-3xl w-full transition-[max-width,width] duration-300" style={{ contentVisibility: 'auto' }}>
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

          <EnhancedPromptInput
            sendEvent={sendEvent}
            onSendMessage={handleSendMessage}
            disabled={visibleMessages.length === 0}
            showNewMessageButton={hasNewMessages && !shouldAutoScroll}
            showScrollToBottomButton={!shouldAutoScroll && !hasNewMessages}
            onScrollToBottom={scrollToBottom}
          />

        </main>
      )}

      <RightPanel
        todos={rightPanelTodos}
        fileChanges={rightPanelFileChanges}
        sessionCwd={activeSession?.cwd || cwd}
        onScrollToMessage={handleScrollToMessageCallback}
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
