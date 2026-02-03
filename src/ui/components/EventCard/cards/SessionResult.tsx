import { useTranslation } from "react-i18next";
import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { formatCurrency, formatNumber, formatDuration } from "@ui/utils/formatters";

type SessionResultProps = {
    message: SDKResultMessage;
};

/**
 * Session result card showing duration and usage statistics.
 */
export function SessionResult({ message }: SessionResultProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-2 mt-4">
            <div className="header text-accent">{t("eventCard.sessionResult")}</div>
            <div className="flex flex-col rounded-xl px-4 py-3 border border-ink-900/10 bg-surface-secondary space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[14px]">
                    <span className="font-normal">{t("eventCard.duration")}</span>
                    <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">
                        {formatDuration(message.duration_ms)}
                    </span>
                    <span className="font-normal">{t("eventCard.api")}</span>
                    <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">
                        {formatDuration(message.duration_api_ms)}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[14px]">
                    <span className="font-normal">{t("eventCard.usage")}</span>
                    <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-accent text-[13px]">
                        {t("eventCard.cost")} {formatCurrency(message.total_cost_usd)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">
                        {t("eventCard.input")}{" "}
                        {typeof message.usage?.input_tokens === "number"
                            ? formatNumber(message.usage.input_tokens)
                            : "-"}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-ink-700 text-[13px]">
                        {t("eventCard.output")}{" "}
                        {typeof message.usage?.output_tokens === "number"
                            ? formatNumber(message.usage.output_tokens)
                            : "-"}
                    </span>
                </div>
            </div>
        </div>
    );
}
