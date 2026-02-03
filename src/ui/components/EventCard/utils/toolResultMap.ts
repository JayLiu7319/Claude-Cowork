import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { StreamMessage } from "@ui/types";
import type { ToolResultContent } from "../types";

/**
 * Build a lookup map for tool results (performance optimization).
 * Rule: js-cache-function-results - Cache expensive computations
 * 
 * This enables O(1) lookup instead of O(n) search for tool results,
 * which is a major performance improvement during message rendering.
 */
export function buildToolResultMap(messages: StreamMessage[]): Map<string, ToolResultContent> {
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
