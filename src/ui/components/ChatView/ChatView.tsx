/**
 * ChatView - 聊天主视图组件
 * 包含消息列表、部分消息显示、骨架加载和输入框
 */

import { useTranslation } from 'react-i18next';
import type { ChatViewProps } from './types';
import { ChatHeader } from './ChatHeader';
import { MessageCard } from '../EventCard';
import { SkeletonLoader } from '../SkeletonLoader';
import { EnhancedPromptInput } from '../EnhancedPromptInput/EnhancedPromptInput';
import MDContent from '../../render/markdown';

export function ChatView({
    activeSession,
    activeSessionId,
    messages,
    permissionRequests,
    isRunning,
    visibleMessages,
    hasMoreHistory,
    totalMessages,
    scrollContainerRef,
    messagesEndRef,
    topSentinelRef,
    shouldAutoScroll,
    hasNewMessages,
    handleScroll,
    scrollToBottom,
    partialMessage,
    showSkeleton,
    isWindows,
    isSidebarOpen,
    isRightPanelOpen,
    prefersReducedMotion,
    toggleSidebar,
    toggleRightPanel,
    sendEvent,
    onPermissionResult,
    onSendMessage,
}: ChatViewProps) {
    const { t } = useTranslation();

    return (
        <main className="flex flex-1 flex-col min-w-0 bg-surface-cream relative transition-[margin,width] duration-300">
            <ChatHeader
                title={activeSession?.title || "Agent Cowork"}
                isSidebarOpen={isSidebarOpen}
                isRightPanelOpen={isRightPanelOpen}
                isWindows={isWindows}
                onToggleSidebar={toggleSidebar}
                onToggleRightPanel={toggleRightPanel}
            />

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 md:px-8 pb-40 pt-6"
                style={{ overflowAnchor: 'none' }}
            >
                <div className="mx-auto max-w-3xl w-full transition-[max-width,width] duration-300">
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
                                        onPermissionResult={onPermissionResult}
                                        prefersReducedMotion={prefersReducedMotion}
                                    />
                                </div>
                            );
                        })
                    )}

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
                onSendMessage={onSendMessage}
                disabled={visibleMessages.length === 0}
                showNewMessageButton={hasNewMessages && !shouldAutoScroll}
                showScrollToBottomButton={!shouldAutoScroll && !hasNewMessages}
                onScrollToBottom={scrollToBottom}
            />
        </main>
    );
}
