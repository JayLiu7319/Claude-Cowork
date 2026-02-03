import { useTranslation } from "react-i18next";
import MDContent from "@ui/render/markdown";
import { StatusDot } from "../StatusDot";

type AssistantBlockCardProps = {
    title: string;
    text: string;
    showIndicator?: boolean;
    prefersReducedMotion?: boolean;
    hideTitle?: boolean;
};

/**
 * Card for displaying assistant thinking or text blocks.
 */
export function AssistantBlockCard({
    title,
    text,
    showIndicator = false,
    prefersReducedMotion = false,
    hideTitle = false
}: AssistantBlockCardProps) {
    const { t } = useTranslation();

    return (
        <div className={`flex flex-col ${hideTitle ? "mt-2" : "mt-4"}`}>
            {!hideTitle && (
                <div className="header text-accent flex items-center gap-2">
                    <StatusDot
                        variant="success"
                        isActive={showIndicator}
                        isVisible={showIndicator}
                        prefersReducedMotion={prefersReducedMotion}
                    />
                    {title === "Thinking"
                        ? t("eventCard.thinking")
                        : title === "Assistant"
                            ? t("eventCard.assistant")
                            : title}
                </div>
            )}
            <MDContent text={text} />
        </div>
    );
}
