import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import MDContent from "@ui/render/markdown";
import { isMarkdown } from "@ui/utils/markdownUtils";
import type { ToolResultContent, ToolStatus } from "../types";
import { MAX_VISIBLE_LINES } from "../types";
import { setToolStatus, extractTagContent } from "../utils";

type ToolResultInlineProps = {
    messageContent: ToolResultContent;
    isLatest: boolean;
};

/**
 * Inline tool result component (embedded within ToolUseCard).
 * Shows tool execution output with collapsible content.
 */
export function ToolResultInline({ messageContent, isLatest }: ToolResultInlineProps) {
    const { t } = useTranslation();
    // State for content truncation (show more lines)
    const [contentExpanded, setContentExpanded] = useState(false);
    // State for the entire block visibility (collapse/expand)
    // null means "follow default" (which is !isLatest -> collapsed)
    const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);

    const bottomRef = useRef<HTMLDivElement | null>(null);
    const isFirstRender = useRef(true);
    let lines: string[] = [];

    const isToolResult = messageContent.type === "tool_result";

    if (isToolResult && messageContent.is_error) {
        lines = [
            extractTagContent(String(messageContent.content), "tool_use_error") ||
            String(messageContent.content)
        ];
    } else if (isToolResult) {
        try {
            if (Array.isArray(messageContent.content)) {
                lines = messageContent.content
                    .map((item: { text?: string }) => item.text || "")
                    .join("\n")
                    .split("\n");
            } else {
                lines = String(messageContent.content).split("\n");
            }
        } catch {
            lines = [JSON.stringify(messageContent, null, 2)];
        }
    }

    // Ensure toolUseId is defined, fallback to empty string if not a tool result
    const toolUseId = isToolResult ? messageContent.tool_use_id : "";
    const status: ToolStatus = isToolResult && messageContent.is_error ? "error" : "success";

    // Hooks must be called unconditionally
    useEffect(() => {
        if (isToolResult) setToolStatus(toolUseId, status);
    }, [toolUseId, status, isToolResult]);

    const hasMoreLines = lines.length > MAX_VISIBLE_LINES;

    useEffect(() => {
        if (!hasMoreLines || isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (contentExpanded) {
            // Only scroll if expanding content
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [hasMoreLines, contentExpanded]);

    if (!isToolResult) return null;

    const isError = messageContent.is_error;
    const isMarkdownContent = isMarkdown(lines.join("\n"));
    const visibleContent =
        hasMoreLines && !contentExpanded
            ? lines.slice(0, MAX_VISIBLE_LINES).join("\n")
            : lines.join("\n");

    // Logic identifying if the block is collapsed
    // Default: if it's NOT the latest message, it is collapsed.
    // Manual override takes precedence.
    const isCollapsed = manualCollapsed !== null ? manualCollapsed : !isLatest;

    const toggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        setManualCollapsed(!isCollapsed);
    };

    return (
        <div
            className={`mt-3 mb-1 rounded-lg transition-[background-color,border-color] duration-300 ${isError
                    ? "bg-red-50 border border-red-200"
                    : "bg-surface-secondary border border-ink-900/10"
                }`}
        >
            {/* Header with status indicator - Clickable for collapse/expand */}
            <button
                type="button"
                onClick={toggleCollapse}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 border-b cursor-pointer select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent
            ${isError
                        ? "border-red-200 bg-red-100/50 hover:bg-red-100"
                        : "border-ink-900/5 bg-ink-900/[0.02] hover:bg-ink-900/[0.04]"
                    }
            ${isCollapsed ? "border-b-0 rounded-lg" : ""}`} // Remove border when collapsed
            >
                <div
                    className={`transition-transform duration-300 ${isCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                >
                    <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={isError ? "text-red-700" : "text-ink-500"}
                    >
                        <path d="M5 9L1 1L9 1L5 9Z" fill="currentColor" />
                    </svg>
                </div>

                <span
                    role="img"
                    aria-label={isError ? t("eventCard.error") : t("eventCard.success")}
                    className={`flex items-center justify-center w-4 h-4 rounded-full ${isError ? "bg-red-500" : "bg-green-500"
                        }`}
                >
                    <span aria-hidden="true" className="text-white text-xs font-bold">
                        {isError ? "✕" : "✓"}
                    </span>
                </span>
                <span
                    className={`text-xs font-medium ${isError ? "text-red-700" : "text-ink-700"}`}
                >
                    {t("eventCard.output")}
                </span>
                {!isError && lines.length > 0 && (
                    <span className="text-xs text-muted ml-auto">
                        {lines.length} {t(lines.length === 1 ? "eventCard.line" : "eventCard.lines")}
                    </span>
                )}
            </button>

            {/* Content area with animation */}
            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="px-3 py-2.5">
                        <pre
                            className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words font-mono ${isError ? "text-red-600" : "text-ink-700"
                                }`}
                        >
                            {isMarkdownContent ? <MDContent text={visibleContent} /> : visibleContent}
                        </pre>
                    </div>

                    {/* Expand/Collapse content button (Show more lines) */}
                    {hasMoreLines && (
                        <div
                            className={`px-3 py-2 border-t ${isError ? "border-red-200" : "border-ink-900/5"
                                }`}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setContentExpanded(!contentExpanded);
                                }}
                                aria-expanded={contentExpanded}
                                aria-label={
                                    contentExpanded
                                        ? t("eventCard.collapse")
                                        : `${t("eventCard.showMoreLines", { count: lines.length - MAX_VISIBLE_LINES })}`
                                }
                                className={`text-xs font-medium transition-colors flex items-center gap-1.5 ${isError
                                        ? "text-red-600 hover:text-red-700"
                                        : "text-accent hover:text-accent-hover"
                                    }`}
                            >
                                <span aria-hidden="true" className="text-[10px]">
                                    {contentExpanded ? "▲" : "▼"}
                                </span>
                                <span>
                                    {contentExpanded
                                        ? t("eventCard.collapse")
                                        : t("eventCard.showMoreLines", {
                                            count: lines.length - MAX_VISIBLE_LINES
                                        })}
                                </span>
                            </button>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
