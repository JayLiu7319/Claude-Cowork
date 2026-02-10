import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';

const SCROLL_THRESHOLD = 50;
const SCROLL_RELEASE_THRESHOLD = 120;

interface UseScrollManagementProps {
    /** Total message count (from store) — drives auto-scroll on new messages */
    messagesLength: number;
    /** Visible (windowed) message count — drives scroll restoration on history load */
    visibleMessagesLength: number;
    activeSessionId: string | null;
    hasMoreHistory: boolean;
    loadMoreMessages: () => void;
    // Optional: allows partial message updates to affect scroll state
    isStreaming?: boolean;
}

export function useScrollManagement({
    messagesLength,
    visibleMessagesLength,
    activeSessionId,
    hasMoreHistory,
    loadMoreMessages,
}: UseScrollManagementProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);

    const [shouldAutoScroll, _setShouldAutoScroll] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const shouldAutoScrollRef = useRef(true);

    // Wrapper that keeps ref and state in sync
    const setShouldAutoScroll = useCallback((value: boolean) => {
        shouldAutoScrollRef.current = value;
        _setShouldAutoScroll(value);
    }, []);

    const prevMessagesLengthRef = useRef(0);
    const scrollHeightBeforeLoadRef = useRef(0);
    const shouldRestoreScrollRef = useRef(false);
    const previousSessionIdRef = useRef<string | null>(activeSessionId);
    const pendingSessionScrollRef = useRef(false);
    const lastScrollTopRef = useRef(0);

    // Handle scroll events to detect if user scrolled up
    // Read from ref (not state) to avoid recreating callback on shouldAutoScroll change
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const currentAutoScroll = shouldAutoScrollRef.current;
        const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
        const isAtBottom = distanceToBottom <= SCROLL_THRESHOLD;
        const scrollDelta = scrollTop - lastScrollTopRef.current;
        const scrollDirection = scrollDelta > 0 ? "down" : scrollDelta < 0 ? "up" : "none";
        const releaseThreshold = Math.max(SCROLL_RELEASE_THRESHOLD, Math.round(clientHeight * 0.25));
        const shouldReleaseAuto = scrollDirection === "up" && distanceToBottom > releaseThreshold;
        const nextShouldAutoScroll = currentAutoScroll ? !shouldReleaseAuto : isAtBottom;
        lastScrollTopRef.current = scrollTop;

        if (nextShouldAutoScroll !== currentAutoScroll) {
            setShouldAutoScroll(nextShouldAutoScroll);
            if (nextShouldAutoScroll) {
                setHasNewMessages(false);
            }
        }
    }, [setShouldAutoScroll]);

    // Infinite scroll: Load more messages when reaching top
    useEffect(() => {
        const sentinel = topSentinelRef.current;
        const container = scrollContainerRef.current;
        if (!sentinel || !container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && hasMoreHistory) {
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
    }, [hasMoreHistory, loadMoreMessages]);

    // Restore scroll position after loading history (useLayoutEffect = before paint, no visible jump)
    useLayoutEffect(() => {
        if (shouldRestoreScrollRef.current) {
            const container = scrollContainerRef.current;
            if (container) {
                const newScrollHeight = container.scrollHeight;
                const scrollDiff = newScrollHeight - scrollHeightBeforeLoadRef.current;
                container.scrollTop += scrollDiff;
            }
            shouldRestoreScrollRef.current = false;
        }
    }, [visibleMessagesLength]);

    // Reset scroll state on session change
    useEffect(() => {
        const previousSessionId = previousSessionIdRef.current;
        const didChangeSession = previousSessionId !== activeSessionId;

        if (!didChangeSession) return;

        // Reset scroll state - use queueMicrotask to avoid synchronous setState in effect
        shouldAutoScrollRef.current = true;
        queueMicrotask(() => {
            setShouldAutoScroll(true);
            setHasNewMessages(false);
        });
        prevMessagesLengthRef.current = 0;
        pendingSessionScrollRef.current = true;

        previousSessionIdRef.current = activeSessionId;
    }, [activeSessionId]);

    // Auto-scroll on new messages — read from ref to avoid re-running on shouldAutoScroll change
    useEffect(() => {
        if (shouldAutoScrollRef.current && messagesLength !== prevMessagesLengthRef.current) {
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
    }, [messagesLength]);

    const scrollToBottom = useCallback(() => {
        setShouldAutoScroll(true);
        setHasNewMessages(false);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const scrollToBottomIfAuto = useCallback(() => {
        if (shouldAutoScrollRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } else {
            setHasNewMessages(true);
        }
    }, []);

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
