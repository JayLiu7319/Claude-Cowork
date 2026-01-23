import { useEffect, useMemo, useRef, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import type {
  PermissionResult,
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
  SDKUserMessage
} from "@anthropic-ai/claude-agent-sdk";
import type { StreamMessage } from "../types";
import type { PermissionRequest } from "../store/useAppStore";
import MDContent from "../render/markdown";
import { DecisionPanel } from "./DecisionPanel";

type MessageContent = SDKAssistantMessage["message"]["content"][number];
type ToolResultContent = SDKUserMessage["message"]["content"][number];
type ToolStatus = "pending" | "success" | "error";
const toolStatusMap = new Map<string, ToolStatus>();
const toolStatusListeners = new Set<() => void>();
const MAX_VISIBLE_LINES = 3;

type AskUserQuestionInput = {
  questions?: Array<{
    question: string;
    header?: string;
    options?: Array<{ label: string; description?: string }>;
    multiSelect?: boolean;
  }>;
};

const getAskUserQuestionSignature = (input?: AskUserQuestionInput | null) => {
  if (!input?.questions?.length) return "";
  return input.questions.map((question) => {
    const options = (question.options ?? []).map((o) => `${o.label}|${o.description ?? ""}`).join(",");
    return `${question.question}|${question.header ?? ""}|${question.multiSelect ? "1" : "0"}|${options}`;
  }).join("||");
};

const setToolStatus = (toolUseId: string | undefined, status: ToolStatus) => {
  if (!toolUseId) return;
  toolStatusMap.set(toolUseId, status);
  toolStatusListeners.forEach((listener) => listener());
};

const useToolStatus = (toolUseId: string | undefined) => {
  const [status, setStatus] = useState<ToolStatus | undefined>(() =>
    toolUseId ? toolStatusMap.get(toolUseId) : undefined
  );
  useEffect(() => {
    if (!toolUseId) return;
    const handleUpdate = () => setStatus(toolStatusMap.get(toolUseId));
    toolStatusListeners.add(handleUpdate);
    return () => { toolStatusListeners.delete(handleUpdate); };
  }, [toolUseId]);
  return status;
};

const StatusDot = ({ variant = "accent", isActive = false, isVisible = true }: {
  variant?: "accent" | "success" | "error"; isActive?: boolean; isVisible?: boolean;
}) => {
  if (!isVisible) return null;
  const colorClass = variant === "success" ? "bg-success" : variant === "error" ? "bg-error" : "bg-accent";
  return (
    <span className="relative flex h-2 w-2">
      {isActive && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colorClass} opacity-75`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colorClass}`} />
    </span>
  );
};

const SessionResult = ({ message }: { message: SDKResultMessage }) => {
  const { t } = useTranslation();
  const formatMinutes = (ms: number | undefined) => typeof ms !== "number" ? "-" : `${(ms / 60000).toFixed(2)} ${t('eventCard.minutes')}`;
  const formatUsd = (usd: number | undefined) => typeof usd !== "number" ? "-" : usd.toFixed(2);
  const formatMillions = (tokens: number | undefined) => typeof tokens !== "number" ? "-" : `${(tokens / 1_000_000).toFixed(4)} M`;

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="header text-accent">{t('eventCard.sessionResult')}</div>
      <div className="flex flex-col rounded-xl px-4 py-3 border border-ink-900/10 bg-surface-secondary space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="font-normal">{t('eventCard.duration')}</span>
          <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">{formatMinutes(message.duration_ms)}</span>
          <span className="font-normal">{t('eventCard.api')}</span>
          <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">{formatMinutes(message.duration_api_ms)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="font-normal">{t('eventCard.usage')}</span>
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-accent text-[13px]">{t('eventCard.cost')} ${formatUsd(message.total_cost_usd)}</span>
          <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">{t('eventCard.input')} {formatMillions(message.usage?.input_tokens)}</span>
          <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">{t('eventCard.output')} {formatMillions(message.usage?.output_tokens)}</span>
        </div>
      </div>
    </div>
  );
};

export function isMarkdown(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const patterns: RegExp[] = [/^#{1,6}\s+/m, /```[\s\S]*?```/];
  return patterns.some((pattern) => pattern.test(text));
}

function extractTagContent(input: string, tag: string): string | null {
  const match = input.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1] : null;
}

// Inline tool result component (embedded within ToolUseCard)
const ToolResultInline = ({ messageContent }: { messageContent: ToolResultContent }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  let lines: string[] = [];

  if (messageContent.type !== "tool_result") return null;

  const toolUseId = messageContent.tool_use_id;
  const status: ToolStatus = messageContent.is_error ? "error" : "success";
  const isError = messageContent.is_error;

  if (messageContent.is_error) {
    lines = [extractTagContent(String(messageContent.content), "tool_use_error") || String(messageContent.content)];
  } else {
    try {
      if (Array.isArray(messageContent.content)) {
        lines = messageContent.content.map((item: any) => item.text || "").join("\n").split("\n");
      } else {
        lines = String(messageContent.content).split("\n");
      }
    } catch { lines = [JSON.stringify(messageContent, null, 2)]; }
  }

  const isMarkdownContent = isMarkdown(lines.join("\n"));
  const hasMoreLines = lines.length > MAX_VISIBLE_LINES;
  const visibleContent = hasMoreLines && !isExpanded ? lines.slice(0, MAX_VISIBLE_LINES).join("\n") : lines.join("\n");

  useEffect(() => { setToolStatus(toolUseId, status); }, [toolUseId, status]);
  useEffect(() => {
    if (!hasMoreLines || isFirstRender.current) { isFirstRender.current = false; return; }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hasMoreLines, isExpanded]);

  return (
    <div className={`mt-3 mb-3 rounded-lg ${isError ? "bg-red-50 border border-red-200" : "bg-surface-secondary border border-ink-900/10"}`}>
      {/* Header with status indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${isError ? "border-red-200 bg-red-100/50" : "border-ink-900/5 bg-ink-900/[0.02]"}`}>
        <div className={`flex items-center justify-center w-4 h-4 rounded-full ${isError ? "bg-red-500" : "bg-green-500"}`}>
          <span className="text-white text-xs font-bold">{isError ? "✕" : "✓"}</span>
        </div>
        <span className={`text-xs font-medium ${isError ? "text-red-700" : "text-ink-700"}`}>
          {t('eventCard.output')}
        </span>
        {!isError && lines.length > 0 && (
          <span className="text-xs text-muted ml-auto">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="px-3 py-2.5">
        <pre className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words font-mono ${isError ? "text-red-600" : "text-ink-700"}`}>
          {isMarkdownContent ? <MDContent text={visibleContent} /> : visibleContent}
        </pre>
      </div>

      {/* Expand/Collapse button */}
      {hasMoreLines && (
        <div className={`px-3 py-2 border-t ${isError ? "border-red-200" : "border-ink-900/5"}`}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs font-medium transition-colors flex items-center gap-1.5 ${isError ? "text-red-600 hover:text-red-700" : "text-accent hover:text-accent-hover"}`}
          >
            <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
            <span>{isExpanded ? t('eventCard.collapse') : t('eventCard.showMoreLines', { count: lines.length - MAX_VISIBLE_LINES })}</span>
          </button>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

// Standalone ToolResult (kept for backward compatibility, but will be hidden in rendering)
const ToolResult = ({ messageContent }: { messageContent: ToolResultContent }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  let lines: string[] = [];

  if (messageContent.type !== "tool_result") return null;

  const toolUseId = messageContent.tool_use_id;
  const status: ToolStatus = messageContent.is_error ? "error" : "success";
  const isError = messageContent.is_error;

  if (messageContent.is_error) {
    lines = [extractTagContent(String(messageContent.content), "tool_use_error") || String(messageContent.content)];
  } else {
    try {
      if (Array.isArray(messageContent.content)) {
        lines = messageContent.content.map((item: any) => item.text || "").join("\n").split("\n");
      } else {
        lines = String(messageContent.content).split("\n");
      }
    } catch { lines = [JSON.stringify(messageContent, null, 2)]; }
  }

  const isMarkdownContent = isMarkdown(lines.join("\n"));
  const hasMoreLines = lines.length > MAX_VISIBLE_LINES;
  const visibleContent = hasMoreLines && !isExpanded ? lines.slice(0, MAX_VISIBLE_LINES).join("\n") : lines.join("\n");

  useEffect(() => { setToolStatus(toolUseId, status); }, [toolUseId, status]);
  useEffect(() => {
    if (!hasMoreLines || isFirstRender.current) { isFirstRender.current = false; return; }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hasMoreLines, isExpanded]);

  return (
    <div className="flex flex-col mt-4">
      <div className="header text-accent">{t('eventCard.output')}</div>
      <div className="mt-2 rounded-xl bg-surface-tertiary p-3">
        <pre className={`text-sm whitespace-pre-wrap break-words font-mono ${isError ? "text-red-500" : "text-ink-700"}`}>
          {isMarkdownContent ? <MDContent text={visibleContent} /> : visibleContent}
        </pre>
        {hasMoreLines && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="mt-2 text-sm text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
            <span>{isExpanded ? "▲" : "▼"}</span>
            <span>{isExpanded ? t('eventCard.collapse') : t('eventCard.showMoreLines', { count: lines.length - MAX_VISIBLE_LINES })}</span>
          </button>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

const AssistantBlockCard = ({ title, text, showIndicator = false }: { title: string; text: string; showIndicator?: boolean }) => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-col mt-4">
    <div className="header text-accent flex items-center gap-2">
      <StatusDot variant="success" isActive={showIndicator} isVisible={showIndicator} />
      {title === 'Thinking' ? t('eventCard.thinking') : title === 'Assistant' ? t('eventCard.assistant') : title}
    </div>
    <MDContent text={text} />
  </div>
);
};

const ToolUseCard = ({
  messageContent,
  toolResult,
  showIndicator = false
}: {
  messageContent: MessageContent;
  toolResult?: ToolResultContent | null;
  showIndicator?: boolean;
}) => {
  const { t } = useTranslation();
  if (messageContent.type !== "tool_use") return null;

  const toolStatus = useToolStatus(messageContent.id);
  const statusVariant = toolStatus === "error" ? "error" : "success";
  const isPending = !toolStatus || toolStatus === "pending";
  const shouldShowDot = toolStatus === "success" || toolStatus === "error" || showIndicator;

  useEffect(() => {
    if (messageContent?.id && !toolStatusMap.has(messageContent.id)) setToolStatus(messageContent.id, "pending");
  }, [messageContent?.id]);

  const getToolInfo = (): string | null => {
    const input = messageContent.input as Record<string, any>;
    switch (messageContent.name) {
      case "Bash": return input?.command || null;
      case "Read": case "Write": case "Edit": return input?.file_path || null;
      case "Glob": case "Grep": return input?.pattern || null;
      case "Task": return input?.description || null;
      case "WebFetch": return input?.url || null;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-[1rem] bg-surface-tertiary px-3 py-2 mt-4 overflow-hidden">
      <div className="flex flex-row items-center gap-2 min-w-0">
        <StatusDot variant={statusVariant} isActive={isPending && showIndicator} isVisible={shouldShowDot} />
        <div className="flex flex-row items-center gap-2 tool-use-item min-w-0 flex-1">
          <span className="inline-flex items-center rounded-md text-accent py-0.5 text-sm font-medium shrink-0">{messageContent.name}</span>
          <span className="text-sm text-muted truncate">{getToolInfo()}</span>
        </div>
      </div>

      {/* Inline tool result display */}
      {toolResult && (
        <ToolResultInline messageContent={toolResult} />
      )}
    </div>
  );
};

const AskUserQuestionCard = ({
  messageContent,
  permissionRequest,
  onPermissionResult
}: {
  messageContent: MessageContent;
  permissionRequest?: PermissionRequest;
  onPermissionResult?: (toolUseId: string, result: PermissionResult) => void;
}) => {
  const { t } = useTranslation();
  if (messageContent.type !== "tool_use") return null;
  
  const input = messageContent.input as AskUserQuestionInput | null;
  const questions = input?.questions ?? [];
  const currentSignature = getAskUserQuestionSignature(input);
  const requestSignature = getAskUserQuestionSignature(permissionRequest?.input as AskUserQuestionInput | undefined);
  const isActiveRequest = permissionRequest && currentSignature === requestSignature;

  if (isActiveRequest && onPermissionResult) {
    return (
      <div className="mt-4">
        <DecisionPanel
          request={permissionRequest}
          onSubmit={(result) => onPermissionResult(permissionRequest.toolUseId, result)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[1rem] bg-surface-tertiary px-3 py-2 mt-4">
      <div className="flex flex-row items-center gap-2">
        <StatusDot variant="success" isActive={false} isVisible={true} />
        <span className="inline-flex items-center rounded-md text-accent py-0.5 text-sm font-medium">{t('eventCard.askUserQuestion')}</span>
      </div>
      {questions.map((q, idx) => (
        <div key={idx} className="text-sm text-ink-700 ml-4">{q.question}</div>
      ))}
    </div>
  );
};

const SystemInfoCard = ({ message, showIndicator = false }: { message: SDKMessage; showIndicator?: boolean }) => {
  const { t } = useTranslation();
  if (message.type !== "system" || !("subtype" in message) || message.subtype !== "init") return null;
  
  const systemMsg = message as any;
  
  const InfoItem = ({ name, value }: { name: string; value: string }) => (
    <div className="text-[14px]">
      <span className="mr-4 font-normal">{name}</span>
      <span className="font-light">{value}</span>
    </div>
  );
  
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="header text-accent flex items-center gap-2">
        <StatusDot variant="success" isActive={showIndicator} isVisible={showIndicator} />
        {t('eventCard.systemInit')}
      </div>
      <div className="flex flex-col rounded-xl px-4 py-2 border border-ink-900/10 bg-surface-secondary space-y-1">
        <InfoItem name={t('eventCard.sessionId')} value={systemMsg.session_id || "-"} />
        <InfoItem name={t('eventCard.modelName')} value={systemMsg.model || "-"} />
        <InfoItem name={t('eventCard.permissionMode')} value={systemMsg.permissionMode || "-"} />
        <InfoItem name={t('eventCard.workingDirectory')} value={systemMsg.cwd || "-"} />
      </div>
    </div>
  );
};

const UserMessageCard = ({ message, showIndicator = false }: { message: { type: "user_prompt"; prompt: string }; showIndicator?: boolean }) => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-col mt-4">
    <div className="header text-accent flex items-center gap-2">
      <StatusDot variant="success" isActive={showIndicator} isVisible={showIndicator} />
      {t('eventCard.user')}
    </div>
    <MDContent text={message.prompt} />
  </div>
);
};

// Build a lookup map for tool results (performance optimization)
// Rule: js-cache-function-results - Cache expensive computations
function buildToolResultMap(messages: StreamMessage[]): Map<string, ToolResultContent> {
  const map = new Map<string, ToolResultContent>();

  for (const msg of messages) {
    if (msg.type === "user_prompt") continue;

    const sdkMsg = msg as SDKMessage;
    if (sdkMsg.type === "user") {
      const contents = sdkMsg.message.content;
      for (const content of contents) {
        if (content.type === "tool_result") {
          map.set(content.tool_use_id, content as ToolResultContent);
        }
      }
    }
  }

  return map;
}

// Memoized component to prevent unnecessary re-renders
// Rule: rerender-memo - Extract expensive work into memoized components
export const MessageCard = memo(function MessageCard({
  message,
  allMessages,
  isLast = false,
  isRunning = false,
  permissionRequest,
  onPermissionResult
}: {
  message: StreamMessage;
  allMessages?: StreamMessage[];
  isLast?: boolean;
  isRunning?: boolean;
  permissionRequest?: PermissionRequest;
  onPermissionResult?: (toolUseId: string, result: PermissionResult) => void;
}) {
  const { t } = useTranslation();
  const showIndicator = isLast && isRunning;

  // Build tool result lookup map once per messages array change
  // Rule: js-cache-function-results - Use memoization for expensive computations
  const toolResultMap = useMemo(() => {
    return allMessages ? buildToolResultMap(allMessages) : new Map();
  }, [allMessages]);

  if (message.type === "user_prompt") {
    return <UserMessageCard message={message} showIndicator={showIndicator} />;
  }

  const sdkMessage = message as SDKMessage;

  if (sdkMessage.type === "system") {
    return <SystemInfoCard message={sdkMessage} showIndicator={showIndicator} />;
  }

  if (sdkMessage.type === "result") {
    if (sdkMessage.subtype === "success") {
      return <SessionResult message={sdkMessage} />;
    }
    return (
      <div className="flex flex-col gap-2 mt-4">
        <div className="header text-error">{t('eventCard.sessionError')}</div>
        <div className="rounded-xl bg-error-light p-3">
          <pre className="text-sm text-error whitespace-pre-wrap">{JSON.stringify(sdkMessage, null, 2)}</pre>
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
            return <AssistantBlockCard key={idx} title="Thinking" text={content.thinking} showIndicator={isLastContent && showIndicator} />;
          }
          if (content.type === "text") {
            return <AssistantBlockCard key={idx} title="Assistant" text={content.text} showIndicator={isLastContent && showIndicator} />;
          }
          if (content.type === "tool_use") {
            if (content.name === "AskUserQuestion") {
              return <AskUserQuestionCard key={idx} messageContent={content} permissionRequest={permissionRequest} onPermissionResult={onPermissionResult} />;
            }
            // O(1) lookup instead of O(n) search - major performance improvement
            const toolResult = toolResultMap.get(content.id) || null;
            return <ToolUseCard key={idx} messageContent={content} toolResult={toolResult} showIndicator={isLastContent && showIndicator} />;
          }
          return null;
        })}
      </>
    );
  }

  if (sdkMessage.type === "user") {
    const contents = sdkMessage.message.content;
    // Hide standalone tool_result rendering - they are now shown inline with tool_use
    const textContents = contents.filter((c: any) => c.type !== "tool_result");
    if (textContents.length === 0) {
      return null; // Pure tool_result messages are not rendered separately
    }
    // If there are text contents, render them
    return (
      <>
        {textContents.map((content: ToolResultContent, idx: number) => {
          // Handle other user message types if needed
          return null;
        })}
      </>
    );
  }

  return null;
});

export { MessageCard as EventCard };
