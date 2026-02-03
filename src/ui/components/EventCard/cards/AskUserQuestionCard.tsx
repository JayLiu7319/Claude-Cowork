import { useTranslation } from "react-i18next";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionRequest } from "@ui/store/useAppStore";
import { DecisionPanel } from "@ui/components/DecisionPanel";
import type { MessageContent, AskUserQuestionInput } from "../types";
import { StatusDot } from "../StatusDot";
import { getAskUserQuestionSignature } from "../utils";

type AskUserQuestionCardProps = {
    messageContent: MessageContent;
    permissionRequest?: PermissionRequest;
    onPermissionResult?: (toolUseId: string, result: PermissionResult) => void;
};

/**
 * Card for displaying AskUserQuestion tool calls.
 * Shows a decision panel when the question is active.
 */
export function AskUserQuestionCard({
    messageContent,
    permissionRequest,
    onPermissionResult
}: AskUserQuestionCardProps) {
    const { t } = useTranslation();
    if (messageContent.type !== "tool_use") return null;

    const input = messageContent.input as AskUserQuestionInput | null;
    const questions = input?.questions ?? [];
    const currentSignature = getAskUserQuestionSignature(input);
    const requestSignature = getAskUserQuestionSignature(
        permissionRequest?.input as AskUserQuestionInput | undefined
    );
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
                <span className="inline-flex items-center rounded-md text-accent py-0.5 text-sm font-medium">
                    {t("eventCard.askUserQuestion")}
                </span>
            </div>
            {questions.map((q, idx) => (
                <div key={idx} className="text-sm text-ink-700 ml-4">
                    {q.question}
                </div>
            ))}
        </div>
    );
}
