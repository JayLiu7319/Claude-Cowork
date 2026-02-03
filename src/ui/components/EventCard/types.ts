import type {
    PermissionResult,
    SDKAssistantMessage,
    SDKUserMessage
} from "@anthropic-ai/claude-agent-sdk";
import type { StreamMessage } from "@ui/types";
import type { PermissionRequest } from "@ui/store/useAppStore";

// Content types extracted from SDK message types
export type MessageContent = SDKAssistantMessage["message"]["content"][number];
export type ToolResultContent = SDKUserMessage["message"]["content"][number];

// Tool execution status
export type ToolStatus = "pending" | "success" | "error";

// Input structure for AskUserQuestion tool
export type AskUserQuestionInput = {
    questions?: Array<{
        question: string;
        header?: string;
        options?: Array<{ label: string; description?: string }>;
        multiSelect?: boolean;
    }>;
};

// StatusDot component props
export type StatusDotProps = {
    variant?: "accent" | "success" | "error" | "pending";
    isActive?: boolean;
    isVisible?: boolean;
    prefersReducedMotion?: boolean;
};

// Main MessageCard component props
export type MessageCardProps = {
    message: StreamMessage;
    allMessages?: StreamMessage[];
    isLast?: boolean;
    isRunning?: boolean;
    permissionRequest?: PermissionRequest;
    onPermissionResult?: (toolUseId: string, result: PermissionResult) => void;
    prefersReducedMotion?: boolean;
};

// Constants
export const MAX_VISIBLE_LINES = 3;
