import { useTranslation } from "react-i18next";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { StatusDot } from "../StatusDot";

type SystemInfoCardProps = {
    message: SDKMessage;
    showIndicator?: boolean;
    prefersReducedMotion?: boolean;
};

function InfoItem({ name, value }: { name: string; value: string }) {
    return (
        <div className="text-[14px]">
            <span className="mr-4 font-normal">{name}</span>
            <span className="font-light">{value}</span>
        </div>
    );
}

/**
 * Card for displaying system initialization info.
 */
export function SystemInfoCard({
    message,
    showIndicator = false,
    prefersReducedMotion = false
}: SystemInfoCardProps) {
    const { t } = useTranslation();
    if (message.type !== "system" || !("subtype" in message) || message.subtype !== "init")
        return null;

    type SystemMessageExtended = SDKMessage & {
        session_id?: string;
        model?: string;
        permissionMode?: string;
        cwd?: string;
    };
    const systemMsg = message as SystemMessageExtended;

    return (
        <div className="flex flex-col gap-2 mt-2">
            <div className="header text-accent flex items-center gap-2">
                <StatusDot
                    variant="success"
                    isActive={showIndicator}
                    isVisible={showIndicator}
                    prefersReducedMotion={prefersReducedMotion}
                />
                {t("eventCard.assistant")}
            </div>
            <div className="flex flex-col rounded-xl px-4 py-2 border border-ink-900/10 bg-surface-secondary space-y-1">
                <InfoItem name={t("eventCard.sessionId")} value={systemMsg.session_id || "-"} />
                <InfoItem name={t("eventCard.modelName")} value={systemMsg.model || "-"} />
                <InfoItem
                    name={t("eventCard.permissionMode")}
                    value={systemMsg.permissionMode || "-"}
                />
                <InfoItem name={t("eventCard.workingDirectory")} value={systemMsg.cwd || "-"} />
            </div>
        </div>
    );
}
