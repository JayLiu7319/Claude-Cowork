import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { TokenBadge } from "@ui/components/TokenBadge";
import type { InputToken } from "@shared/types";

/**
 * React component for rendering Token nodes inside Tiptap editor.
 * Converts Tiptap node attributes to InputToken format for TokenBadge.
 */
export function MentionNodeView({ node }: NodeViewProps) {
    const { label, tokenType, content, path } = node.attrs;

    // Convert Tiptap node attrs to InputToken format
    const token: InputToken = tokenType === "file"
        ? { type: "file", name: label, path: path || "" }
        : { type: tokenType, name: label, content: content || "" };

    return (
        <NodeViewWrapper as="span" className="inline">
            <TokenBadge token={token} />
        </NodeViewWrapper>
    );
}
