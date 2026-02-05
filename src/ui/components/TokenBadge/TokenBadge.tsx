import { Zap, Wrench, FileText, type LucideIcon } from "lucide-react";
import type { InputToken } from "@shared/types";
import { Badge } from "@ui/components/ui/Badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@ui/components/ui/Tooltip";

type TokenType = Exclude<InputToken["type"], "text">;

const ICON_MAP: Record<TokenType, LucideIcon> = {
    command: Zap,
    skill: Wrench,
    file: FileText,
};

const VARIANT_MAP: Record<TokenType, "command" | "skill" | "file"> = {
    command: "command",
    skill: "skill",
    file: "file",
};

function getTooltipText(token: InputToken): string {
    if (token.type === "text") return "";
    if (token.type === "command") return `Command: /${token.name}`;
    if (token.type === "skill") return `Skill: ${token.name}`;
    if (token.type === "file") return `File: ${token.path}`;
    return "";
}

export interface TokenBadgeProps {
    token: InputToken;
    className?: string;
}

/**
 * Unified token badge component used in both input box and message display.
 * Renders command, skill, and file tokens with appropriate icons and tooltips.
 */
export function TokenBadge({ token, className }: TokenBadgeProps) {
    if (token.type === "text") {
        return null;
    }

    const Icon = ICON_MAP[token.type];
    const variant = VARIANT_MAP[token.type];
    const tooltipText = getTooltipText(token);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant={variant} className={className}>
                    <Icon className="h-3 w-3" />
                    <span>{token.name}</span>
                </Badge>
            </TooltipTrigger>
            <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
    );
}
