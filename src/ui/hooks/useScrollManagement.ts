import { useRef, useState, useEffect, useCallback } from 'react';

const SCROLL_THRESHOLD = 50;
const SCROLL_RELEASE_THRESHOLD = 120;

interface UseScrollManagementProps {
    messagesLength: number;
    activeSessionId: string | null;
    hasMoreHistory: boolean;
    isLoadingHistory: boolean;
    loadMoreMessages: () => void;
    // Optional: allows partial message updates to affect scroll state
    isStreaming?: boolean;
}

export function useScrollManagement({
    messagesLength,
    activeSessionId,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreMessages,
}: UseScrollManagementProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);

    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    const prevMessagesLengthRef = useRef(0);
    const scrollHeightBeforeLoadRef = useRef(0);
    const shouldRestoreScrollRef = useRef(false);
    const previousSessionIdRef = useRef<string | null>(activeSessionId);
    const pendingSessionScrollRef = useRef(false);
    const lastScrollTopRef = useRef(0);

    // Handle scroll events to detect if user scrolled up
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
        const isAtBottom = distanceToBottom <= SCROLL_THRESHOLD;
        const scrollDelta = scrollTop - lastScrollTopRef.current;
        const scrollDirection = scrollDelta > 0 ? "down" : scrollDelta < 0 ? "up" : "none";
        const releaseThreshold = Math.max(SCROLL_RELEASE_THRESHOLD, Math.round(clientHeight * 0.25));
        const shouldReleaseAuto = scrollDirection === "up" && distanceToBottom > releaseThreshold;
        const nextShouldAutoScroll = shouldAutoScroll ? !shouldReleaseAuto : isAtBottom;
        lastScrollTopRef.current = scrollTop;

        if (nextShouldAutoScroll !== shouldAutoScroll) {
            setShouldAutoScroll(nextShouldAutoScroll);
            if (nextShouldAutoScroll) {
                setHasNewMessages(false);
            }
        }
    }, [shouldAutoScroll]);

    // Infinite scroll: Load more messages when reaching top
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
    }, [messagesLength, isLoadingHistory]);

    // Reset scroll state on session change
    useEffect(() => {
        const previousSessionId = previousSessionIdRef.current;
        const didChangeSession = previousSessionId !== activeSessionId;

        if (!didChangeSession) return;

        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/3f669dd6-64da-4cef-a2ef-6b291f75c915', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'H1', location: 'useScrollManagement.ts:106', message: 'session changed', data: { previousSessionId, activeSessionId }, timestamp: Date.now() }) }).catch(() => { });
        // #endregion

        // Reset scroll state - use queueMicrotask to avoid synchronous setState in effect
        queueMicrotask(() => {
            setShouldAutoScroll(true);
            setHasNewMessages(false);
        });
        prevMessagesLengthRef.current = 0;
        pendingSessionScrollRef.current = true;

        previousSessionIdRef.current = activeSessionId;
    }, [activeSessionId]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (shouldAutoScroll && messagesLength !== prevMessagesLengthRef.current) {
            if (pendingSessionScrollRef.current) {
                pendingSessionScrollRef.current = false;
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            } else {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        } else if (messagesLength > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
            // Only show "new messages" if we actually have new messages (length increased)
            // and it's not the initial load (prev > 0)
            setTimeout(() => setHasNewMessages(true), 0);
        }
        prevMessagesLengthRef.current = messagesLength;
    }, [messagesLength, shouldAutoScroll]);

    const scrollToBottom = useCallback(() => {
        setShouldAutoScroll(true);
        setHasNewMessages(false);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const scrollToBottomIfAuto = useCallback(() => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } else {
            setHasNewMessages(true);
        }
    }, [shouldAutoScroll]);

    const scrollToMessage = useCallback((messageIndex: number) => {
        setTimeout(() => {
            const container = scrollContainerRef.current;
            if (!container) return;

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
    }, []);

    return {
        scrollContainerRef,
        messagesEndRef,
        topSentinelRef,
        shouldAutoScroll,
        setShouldAutoScroll,
        hasNewMessages,
        setHasNewMessages,
        handleScroll,
        scrollToBottom,
        scrollToBottomIfAuto,
        scrollToMessage
    };
}
