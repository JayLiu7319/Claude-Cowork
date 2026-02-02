import { useState, useRef, useEffect, useCallback } from 'react';
import type { ServerEvent } from '../types';

interface UsePartialMessageProps {
    activeSessionId: string | null;
    onContentUpdate?: () => void;
    shouldAutoScroll: boolean; // Used to trigger appropriate update logic
}

export function usePartialMessage({ activeSessionId, onContentUpdate }: UsePartialMessageProps) {
    const partialMessageRef = useRef("");
    const [partialMessage, setPartialMessage] = useState("");
    const [showPartialMessage, setShowPartialMessage] = useState(false);

    // RAF throttling for partial message updates
    const rafIdRef = useRef<number | null>(null);
    const pendingPartialUpdateRef = useRef(false);
    const activeSessionIdRef = useRef(activeSessionId);

    // Keep activeSessionIdRef in sync
    useEffect(() => {
        activeSessionIdRef.current = activeSessionId;
    }, [activeSessionId]);

    // Reset state when session changes
    useEffect(() => {
        // Defer to match App.tsx behavior roughly, avoids sync update issues
        setTimeout(() => {
            // If a new session starts running immediately, showPartialMessage might need to be true?
            // In App.tsx it checked `isNewSessionRunning`. 
            // For simplicity here, we reset. The stream event will turn it on.
            setPartialMessage("");
            setShowPartialMessage(false);
        }, 0);
        partialMessageRef.current = "";
    }, [activeSessionId]);

    /**
     * Flush pending partial message update to state.
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
            // Accumulate text in ref
            partialMessageRef.current += getPartialMessageContent(message.event) || "";
            // Throttle UI updates
            schedulePartialUpdate();

            // Notify parent to handle scrolling/new message indication
            if (onContentUpdate) {
                onContentUpdate();
            }
        }

        if (message.event.type === "content_block_stop") {
            // Flush any pending update immediately
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
    }, [schedulePartialUpdate, onContentUpdate]);

    return {
        partialMessage,
        showPartialMessage,
        handlePartialMessages
    };
}
