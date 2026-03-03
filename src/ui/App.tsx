import { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionResult, SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { useTranslation } from 'react-i18next';
import { useIPC } from "./hooks/useIPC";
import { useMessageWindow } from "./hooks/useMessageWindow";
import { useBrandTheme } from "./hooks/useBrandTheme";
import { useAppStore } from "./store/useAppStore";
import {
  useSessionState,
  useUIState,
  useUIActions,
  useSessionActions,
  useActiveSession,
} from "./hooks/useAppSelectors";
import type { ServerEvent } from "./types";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { WelcomePage } from "./components/WelcomePage";
import { SettingsModal } from "./components/SettingsModal";
import { ChatView } from "./components/ChatView";
import { FilePreviewModal } from "./components/FilePreviewModal";
import { usePromptActions } from "./hooks/usePromptActions";
import { AppProviders } from "./providers/AppProviders";
import { useElectronBridge } from "./hooks/useElectronBridge";
import { usePartialMessage } from "./hooks/usePartialMessage";
import { useScrollManagement } from "./hooks/useScrollManagement";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout";
import { useFilePreview } from "./hooks/useFilePreview";
import { initI18n } from "./i18n";
import type { i18n } from 'i18next';

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

  // Use aggregated selectors
  const { sessions, activeSessionId, historyRequested } = useSessionState();
  const { showSettingsModal, globalError, brandConfig, cwd, apiConfigChecked, lastFileRefresh } = useUIState();
  const {
    setShowSettingsModal,
    setGlobalError,
    setCwd,
    setApiConfigChecked,
    setDefaultCwd,
    setBrandConfig,
    setRecentFiles,
  } = useUIActions();
  const { markHistoryRequested, resolvePermissionRequest, handleServerEvent } = useSessionActions();

  // Derived state from active session
  const {
    activeSession,
    messages,
    permissionRequests,
    isRunning,
    rightPanelTodos,
    rightPanelFileChanges,
  } = useActiveSession();

  // Apply brand theme
  useBrandTheme(brandConfig);
  const isWindows = navigator.userAgent.includes('Windows');

  // Check user's motion preference
  const prefersReducedMotion = useMemo(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const {
    visibleMessages,
    hasMoreHistory,
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
    visibleMessagesLength: visibleMessages.length,
    activeSessionId,
    hasMoreHistory,
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

  // File Preview
  const {
    previewFile,
    previewData,
    isLoading: previewLoading,
    error: previewError,
    openPreview,
    closePreview,
    isOpen: isPreviewOpen,
  } = useFilePreview();

  useEffect(() => {
    if (!isWindows) {
      return;
    }
    bridge.setPreviewTitlebarStyle(isPreviewOpen ? "preview" : "default").catch((err) => {
      console.error("Failed to sync preview titlebar style:", err);
    });
  }, [bridge, isPreviewOpen, isWindows]);

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

  const handlePreviewFile = useCallback(async (path: string) => {
    const opened = await openPreview(path);
    if (!opened) {
      // Not previewable, fallback to opening in folder
      handleOpenFile(path);
    }
  }, [openPreview, handleOpenFile]);

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
        <ChatView
          activeSession={activeSession}
          activeSessionId={activeSessionId!}
          messages={messages}
          permissionRequests={permissionRequests}
          isRunning={isRunning}
          visibleMessages={visibleMessages}
          hasMoreHistory={hasMoreHistory}
          totalMessages={totalMessages}
          scrollContainerRef={scrollContainerRef}
          messagesEndRef={messagesEndRef}
          topSentinelRef={topSentinelRef}
          shouldAutoScroll={shouldAutoScroll}
          hasNewMessages={hasNewMessages}
          handleScroll={handleScroll}
          scrollToBottom={scrollToBottom}
          partialMessage={partialMessage}
          showSkeleton={showSkeleton}
          isWindows={isWindows}
          isSidebarOpen={isSidebarOpen}
          isRightPanelOpen={isRightPanelOpen}
          prefersReducedMotion={prefersReducedMotion}
          toggleSidebar={toggleSidebar}
          toggleRightPanel={toggleRightPanel}
          sendEvent={sendEvent}
          onPermissionResult={handlePermissionResult}
          onSendMessage={handleSendMessage}
        />
      )}

      <RightPanel
        todos={rightPanelTodos}
        fileChanges={rightPanelFileChanges}
        sessionCwd={activeSession?.cwd || cwd}
        onScrollToMessage={handleScrollToMessageCallback}
        onOpenFile={handleOpenFile}
        onPreviewFile={handlePreviewFile}
        lastFileRefresh={lastFileRefresh}
        className={`
          ${isMobile ? 'fixed inset-y-0 right-0 z-40 w-[280px] shadow-2xl' : 'w-[280px] shrink-0'}
          ${!isRightPanelOpen && isMobile ? 'translate-x-full' : 'translate-x-0'}
          ${!isRightPanelOpen && !isMobile ? 'hidden' : 'flex'}
        `}
        onClose={() => setRightPanelOpen(false)}
      />

      {/* File Preview Modal */}
      {isPreviewOpen && previewFile && (
        <FilePreviewModal
          fileName={previewFile.name}
          previewData={previewData}
          isLoading={previewLoading}
          error={previewError}
          isWindows={isWindows}
          onClose={closePreview}
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
