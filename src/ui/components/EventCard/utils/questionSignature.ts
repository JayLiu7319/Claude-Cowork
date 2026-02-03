import type { AskUserQuestionInput } from "../types";

/**
 * Generate a unique signature for an AskUserQuestion input.
 * Used to match permission requests with their corresponding question cards.
 */
export function getAskUserQuestionSignature(input?: AskUserQuestionInput | null): string {
    if (!input?.questions?.length) return "";
    return input.questions.map((question) => {
        const options = (question.options ?? []).map((o) => `${o.label}|${o.description ?? ""}`).join(",");
        return `${question.question}|${question.header ?? ""}|${question.multiSelect ? "1" : "0"}|${options}`;
    }).join("||");
}
