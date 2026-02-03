import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { MessageCardProps, MessageContent } from "./types";
import { buildToolResultMap } from "./utils";
import {
    SessionResult,
    AssistantBlockCard,
    ToolUseCard,
    AskUserQuestionCard,
    SystemInfoCard,
    UserMessageCard
} from "./cards";

/**
 * Memoized component to prevent unnecessary re-renders.
 * Rule: rerender-memo - Extract expensive work into memoized components
 */
export const MessageCard = memo(
    function MessageCard({
        message,
        allMessages,
        isLast = false,
        isRunning = false,
        permissionRequest,
        onPermissionResult,
        prefersReducedMotion = false
    }: MessageCardProps) {
        const { t } = useTranslation();
        const showIndicator = isLast && isRunning;

        // Build tool result lookup map once per messages array change
        // Rule: js-cache-function-results - Use memoization for expensive computations
        const toolResultMap = useMemo(() => {
            return allMessages ? buildToolResultMap(allMessages) : new Map();
        }, [allMessages]);

        if (message.type === "user_prompt") {
            return (
                <UserMessageCard
                    message={message}
                    showIndicator={showIndicator}
                    prefersReducedMotion={prefersReducedMotion}
                />
            );
        }

        const sdkMessage = message as SDKMessage;

        if (sdkMessage.type === "system") {
            return (
                <SystemInfoCard
                    message={sdkMessage}
                    showIndicator={showIndicator}
                    prefersReducedMotion={prefersReducedMotion}
                />
            );
        }

        if (sdkMessage.type === "result") {
            if (sdkMessage.subtype === "success") {
                return <SessionResult message={sdkMessage} />;
            }
            return (
                <div className="flex flex-col gap-2 mt-4">
                    <div className="header text-error">{t("eventCard.sessionError")}</div>
                    <div className="rounded-xl bg-error-light p-3">
                        <pre className="text-sm text-error whitespace-pre-wrap">
                            {JSON.stringify(sdkMessage, null, 2)}
                        </pre>
                    </div>
                </div>
            );
        }

        if (sdkMessage.type === "assistant") {
            const contents = sdkMessage.message.content;
            return (
                <>
                    {contents.map((content: MessageContent, idx: number) => {
                        const isLastContent = idx === contents.length - 1;
                        if (content.type === "thinking") {
                            return (
                                <AssistantBlockCard
                                    key={idx}
                                    title="Thinking"
                                    text={content.thinking}
                                    showIndicator={isLastContent && showIndicator}
                                    prefersReducedMotion={prefersReducedMotion}
                                />
                            );
                        }
                        if (content.type === "text") {
                            return (
                                <AssistantBlockCard
                                    key={idx}
                                    title="Assistant"
                                    text={content.text}
                                    showIndicator={isLastContent && showIndicator}
                                    prefersReducedMotion={prefersReducedMotion}
                                    hideTitle={true}
                                />
                            );
                        }
                        if (content.type === "tool_use") {
                            if (content.name === "AskUserQuestion") {
                                return (
                                    <AskUserQuestionCard
                                        key={idx}
                                        messageContent={content}
                                        permissionRequest={permissionRequest}
                                        onPermissionResult={onPermissionResult}
                                    />
                                );
                            }
                            // O(1) lookup instead of O(n) search - major performance improvement
                            const toolResult = toolResultMap.get(content.id) || null;
                            return (
                                <ToolUseCard
                                    key={idx}
                                    messageContent={content}
                                    toolResult={toolResult}
                                    showIndicator={isLastContent && showIndicator}
                                    prefersReducedMotion={prefersReducedMotion}
                                    isLatest={isLast}
                                />
                            );
                        }
                        return null;
                    })}
                </>
            );
        }

        if (sdkMessage.type === "user") {
            // Hide standalone tool_result rendering - they are now shown inline with tool_use
            // Only render non-tool_result content if any exists
            const contents = sdkMessage.message.content;
            const textContents = contents.filter((c: { type: string }) => c.type !== "tool_result");

            if (textContents.length === 0) {
                return null;
            }

            return null; // For now, we don't render other user message contents as they aren't expected yet
        }

        return null;
    },
    (prevProps, nextProps) => {
        // Custom memo comparator for better performance during streaming.
        // We only re-render when truly necessary, not on every allMessages reference change.

        // Always re-render if the message itself changed
        if (prevProps.message !== nextProps.message) return false;

        // Re-render if visibility/running state changed
        if (prevProps.isLast !== nextProps.isLast) return false;
        if (prevProps.isRunning !== nextProps.isRunning) return false;

        // Re-render if permission state changed
        if (prevProps.permissionRequest !== nextProps.permissionRequest) return false;
        if (prevProps.onPermissionResult !== nextProps.onPermissionResult) return false;

        // Re-render if accessibility preference changed
        if (prevProps.prefersReducedMotion !== nextProps.prefersReducedMotion) return false;

        // For allMessages, only re-render if length changed (new messages added)
        // This prevents re-renders when the array reference changes but content is same
        const prevLen = prevProps.allMessages?.length ?? 0;
        const nextLen = nextProps.allMessages?.length ?? 0;
        if (prevLen !== nextLen) return false;

        // Props are equivalent - skip re-render
        return true;
    }
);
