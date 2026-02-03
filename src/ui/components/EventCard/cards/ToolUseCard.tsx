import { useEffect } from "react";
import type { MessageContent, ToolResultContent } from "../types";
import { StatusDot } from "../StatusDot";
import { useToolStatus } from "../hooks";
import { setToolStatus, toolStatusMap } from "../utils";
import { ToolResultInline } from "./ToolResultInline";

type ToolUseCardProps = {
    messageContent: MessageContent;
    toolResult?: ToolResultContent | null;
    showIndicator?: boolean;
    prefersReducedMotion?: boolean;
    isLatest?: boolean;
};

/**
 * Card for displaying tool use with optional inline result.
 */
export function ToolUseCard({
    messageContent,
    toolResult,
    showIndicator = false,
    prefersReducedMotion = false,
    isLatest = false
}: ToolUseCardProps) {
    // 规则: rerender-dependencies - 使用原始类型依赖减少 effect 触发
    const toolId = messageContent.type === "tool_use" ? messageContent.id : undefined;
    const toolType = messageContent.type;

    const toolStatus = useToolStatus(toolId);
    const isPending = !toolStatus || toolStatus === "pending";
    const statusVariant = toolStatus === "error" ? "error" : isPending ? "pending" : "success";

    // For pending state, we always show the dot (it handles its own animation).
    // For other states, we show it if explicitly requested (showIndicator) or if finished (success/error).
    const shouldShowDot =
        isPending || toolStatus === "success" || toolStatus === "error" || showIndicator;

    useEffect(() => {
        if (toolType === "tool_use" && toolId && !toolStatusMap.has(toolId)) {
            setToolStatus(toolId, "pending");
        }
    }, [toolId, toolType]);

    if (messageContent.type !== "tool_use") return null;

    const getToolInfo = (): string | null => {
        type ToolInput = {
            command?: string;
            file_path?: string;
            pattern?: string;
            description?: string;
            url?: string;
        };
        const input = messageContent.input as ToolInput;
        switch (messageContent.name) {
            case "Bash":
                return input?.command || null;
            case "Read":
            case "Write":
            case "Edit":
                return input?.file_path || null;
            case "Glob":
            case "Grep":
                return input?.pattern || null;
            case "Task":
                return input?.description || null;
            case "WebFetch":
                return input?.url || null;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col gap-2 rounded-[1rem] bg-surface-tertiary px-3 py-2 mt-4 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
            <div className="flex flex-row items-center gap-2 min-w-0">
                <StatusDot
                    variant={statusVariant}
                    isActive={isPending && showIndicator}
                    isVisible={shouldShowDot}
                    prefersReducedMotion={prefersReducedMotion}
                />
                <div className="flex flex-row items-center gap-2 tool-use-item min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-md text-accent py-0.5 text-sm font-medium shrink-0">
                        {messageContent.name}
                    </span>
                    <span className="text-sm text-muted truncate">{getToolInfo()}</span>
                </div>
            </div>

            {/* Inline tool result display with smooth transition */}
            <div
                className="transition-[max-height,opacity] duration-300 ease-out overflow-hidden"
                style={{ maxHeight: toolResult ? "2000px" : "0", opacity: toolResult ? 1 : 0 }}
            >
                {toolResult && <ToolResultInline messageContent={toolResult} isLatest={isLatest} />}
            </div>
        </div>
    );
}
