import { useRef, useState, useEffect, useCallback } from 'react';

const SCROLL_THRESHOLD = 50;

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

    // Handle scroll events to detect if user scrolled up
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

        // Reset scroll state
        setTimeout(() => {
            setShouldAutoScroll(true);
            setHasNewMessages(false);
            prevMessagesLengthRef.current = 0;
        }, 0);

        previousSessionIdRef.current = activeSessionId;

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 100);
    }, [activeSessionId]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
