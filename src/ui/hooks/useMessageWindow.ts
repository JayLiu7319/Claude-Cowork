import { useState, useMemo, useCallback } from "react";
import type { StreamMessage } from "../types";


const VISIBLE_WINDOW_SIZE = 3;
const LOAD_BATCH_SIZE = 3;

export interface IndexedMessage {
    originalIndex: number;
    message: StreamMessage;
}

export interface MessageWindowState {
    visibleMessages: IndexedMessage[];
    hasMoreHistory: boolean;
    isLoadingHistory: boolean;
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
    const [visibleUserInputCount, setVisibleUserInputCount] = useState(VISIBLE_WINDOW_SIZE);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [prevSessionId, setPrevSessionId] = useState<string | null>(null);

    const userInputIndices = useMemo(() => getUserInputIndices(messages), [messages]);
    const totalUserInputs = userInputIndices.length;

    // Reset window state on session change
    if (sessionId !== prevSessionId) {
        setPrevSessionId(sessionId);
        setVisibleUserInputCount(VISIBLE_WINDOW_SIZE);
        setIsLoadingHistory(false);
    }

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
        if (!hasMoreHistory || isLoadingHistory) return;

        setIsLoadingHistory(true);

        requestAnimationFrame(() => {
            setVisibleUserInputCount((prev) => Math.min(prev + LOAD_BATCH_SIZE, totalUserInputs));

            setTimeout(() => {
                setIsLoadingHistory(false);
            }, 100);
        });
    }, [hasMoreHistory, isLoadingHistory, totalUserInputs]);

    const resetToLatest = useCallback(() => {
        setVisibleUserInputCount(VISIBLE_WINDOW_SIZE);
    }, []);

    const visibleUserInputs = useMemo(() => {
        return visibleMessages.filter((item) => item.message.type === "user_prompt").length;
    }, [visibleMessages]);

    return {
        visibleMessages,
        hasMoreHistory,
        isLoadingHistory,
        isAtBeginning: !hasMoreHistory && messages.length > 0,
        loadMoreMessages,
        resetToLatest,
        totalMessages: messages.length,
        totalUserInputs,
        visibleUserInputs,
    };
}
