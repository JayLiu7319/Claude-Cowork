import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { InputToken } from "@ui/types";
import MDContent from "@ui/render/markdown";
import { InlineBadge } from "@ui/components/InlineBadge";
import { StatusDot } from "../StatusDot";

type UserMessageCardProps = {
    message: {
        type: "user_prompt";
        prompt: string;
        displayPrompt?: string;
        displayTokens?: InputToken[];
    };
    showIndicator?: boolean;
    prefersReducedMotion?: boolean;
};

/**
 * Card for displaying user messages with optional token badges.
 */
export function UserMessageCard({
    message,
    showIndicator = false,
    prefersReducedMotion = false
}: UserMessageCardProps) {
    const { t } = useTranslation();
    const displayPrompt = message.displayPrompt ?? message.prompt;
    const displayTokens = message.displayTokens;
    const hasBadges = useMemo(() => {
        return Boolean(displayTokens?.some((token) => token.type !== "text"));
    }, [displayTokens]);

    return (
        <div className="flex flex-col mt-4 items-end">
            <div className="header text-accent flex items-center gap-2 mb-2 flex-row-reverse">
                <StatusDot
                    variant="success"
                    isActive={showIndicator}
                    isVisible={showIndicator}
                    prefersReducedMotion={prefersReducedMotion}
                />
                {t("eventCard.user")}
            </div>
            <div className="rounded-2xl px-4 py-3 bg-surface-secondary border border-ink-900/10 max-w-[85%] text-left [&>:first-child]:mt-0">
                {hasBadges && displayTokens ? (
                    <div className="whitespace-pre-wrap break-words">
                        {displayTokens.map((token, idx) => {
                            if (token.type === "text") {
                                return <span key={`text-${idx}`}>{token.value}</span>;
                            }
                            return <InlineBadge key={`badge-${idx}`} token={token} />;
                        })}
                    </div>
                ) : (
                    <MDContent text={displayPrompt} />
                )}
            </div>
        </div>
    );
}
