/**
 * ChatView Types
 */

import type { RefObject } from 'react';
import type { PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type { StreamMessage, ClientEvent } from '@ui/types';
import type { SessionView, PermissionRequest } from '@ui/store/useAppStore';

export interface ChatHeaderProps {
    title: string;
    isSidebarOpen: boolean;
    isRightPanelOpen: boolean;
    isWindows: boolean;
    onToggleSidebar: () => void;
    onToggleRightPanel: () => void;
}

export interface MessageListProps {
    visibleMessages: Array<{ message: StreamMessage; originalIndex: number }>;
    messages: StreamMessage[];
    activeSessionId: string;
    activeSession: SessionView | undefined;
    isRunning: boolean;
    permissionRequest: PermissionRequest | undefined;
    hasMoreHistory: boolean;
    totalMessages: number;
    prefersReducedMotion: boolean;
    partialMessage: string;
    showSkeleton: boolean;
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    topSentinelRef: RefObject<HTMLDivElement | null>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    onPermissionResult: (toolUseId: string, result: PermissionResult) => void;
}

export interface ChatViewProps {
    // Session data
    activeSession: SessionView | undefined;
    activeSessionId: string;
    messages: StreamMessage[];
    permissionRequests: PermissionRequest[];
    isRunning: boolean;

    // Message window
    visibleMessages: Array<{ message: StreamMessage; originalIndex: number }>;
    hasMoreHistory: boolean;
    totalMessages: number;

    // Scroll management
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    topSentinelRef: RefObject<HTMLDivElement | null>;
    shouldAutoScroll: boolean;
    hasNewMessages: boolean;
    handleScroll: () => void;
    scrollToBottom: () => void;

    // Partial message
    partialMessage: string;
    showSkeleton: boolean;

    // Layout
    isWindows: boolean;
    isSidebarOpen: boolean;
    isRightPanelOpen: boolean;
    prefersReducedMotion: boolean;
    toggleSidebar: () => void;
    toggleRightPanel: () => void;

    // Actions
    sendEvent: (event: ClientEvent) => void;
    onPermissionResult: (toolUseId: string, result: PermissionResult) => void;
    onSendMessage: () => void;
}
