import { useState, useMemo, useCallback, useRef } from "react";
import type { StreamMessage } from "@ui/types";


const VISIBLE_WINDOW_SIZE = 3;
const LOAD_BATCH_SIZE = 3;

export interface IndexedMessage {
    originalIndex: number;
    message: StreamMessage;
}

export interface MessageWindowState {
    visibleMessages: IndexedMessage[];
    hasMoreHistory: boolean;
    isAtBeginning: boolean;
    loadMoreMessages: () => void;
    resetToLatest: () => void;
    totalMessages: number;
    totalUserInputs: number;
    visibleUserInputs: number;
}

function getUserInputIndices(messages: StreamMessage[]): number[] {
    const indices: number[] = [];
    messages.forEach((msg, idx) => {
        if (msg.type === "user_prompt") {
            indices.push(idx);
        }
    });
    return indices;
}

function calculateVisibleStartIndex(
    messages: StreamMessage[],
    visibleUserInputCount: number
): number {
    const userInputIndices = getUserInputIndices(messages);
    const totalUserInputs = userInputIndices.length;

    if (totalUserInputs <= visibleUserInputCount) {
        return 0;
    }

    const startUserInputPosition = totalUserInputs - visibleUserInputCount;
    return userInputIndices[startUserInputPosition];
}

export function useMessageWindow(
    messages: StreamMessage[],
    sessionId: string | null
): MessageWindowState {
    const [windowState, setWindowState] = useState(() => ({
        sessionId,
        visibleUserInputCount: VISIBLE_WINDOW_SIZE,
    }));
    const loadGuardRef = useRef({ sessionId, isLoading: false });

    const userInputIndices = useMemo(() => getUserInputIndices(messages), [messages]);
    const totalUserInputs = userInputIndices.length;

    const visibleUserInputCount =
        windowState.sessionId === sessionId
            ? windowState.visibleUserInputCount
            : VISIBLE_WINDOW_SIZE;

    const { visibleMessages, visibleStartIndex } = useMemo(() => {
        if (messages.length === 0) {
            return { visibleMessages: [], visibleStartIndex: 0 };
        }

        const startIndex = calculateVisibleStartIndex(messages, visibleUserInputCount);

        const visible: IndexedMessage[] = messages
            .slice(startIndex)
            .map((message, idx) => ({
                originalIndex: startIndex + idx,
                message,
            }));

        return { visibleMessages: visible, visibleStartIndex: startIndex };
    }, [messages, visibleUserInputCount]);

    const hasMoreHistory = visibleStartIndex > 0;

    const loadMoreMessages = useCallback(() => {
        if (loadGuardRef.current.sessionId !== sessionId) {
            loadGuardRef.current = { sessionId, isLoading: false };
        }
        if (!hasMoreHistory || loadGuardRef.current.isLoading) return;

        loadGuardRef.current.isLoading = true;
        setWindowState((prev) => {
            const currentCount =
                prev.sessionId === sessionId ? prev.visibleUserInputCount : VISIBLE_WINDOW_SIZE;
            const nextCount = Math.min(currentCount + LOAD_BATCH_SIZE, totalUserInputs);

            return {
                sessionId,
                visibleUserInputCount: nextCount,
            };
        });
        // Reset guard after the current render cycle completes (rAF runs after paint)
        requestAnimationFrame(() => {
            loadGuardRef.current.isLoading = false;
        });
    }, [hasMoreHistory, sessionId, totalUserInputs]);

    const resetToLatest = useCallback(() => {
        setWindowState({
            sessionId,
            visibleUserInputCount: VISIBLE_WINDOW_SIZE,
        });
        loadGuardRef.current = { sessionId, isLoading: false };
    }, [sessionId]);

    const visibleUserInputs = useMemo(() => {
        return visibleMessages.filter((item) => item.message.type === "user_prompt").length;
    }, [visibleMessages]);

    return {
        visibleMessages,
        hasMoreHistory,
        isAtBeginning: !hasMoreHistory && messages.length > 0,
        loadMoreMessages,
        resetToLatest,
        totalMessages: messages.length,
        totalUserInputs,
        visibleUserInputs,
    };
}
