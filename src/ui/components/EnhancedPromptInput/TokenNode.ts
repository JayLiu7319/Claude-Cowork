import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MentionNodeView } from "./MentionNodeView";

export type TokenNodeAttrs = {
    id: string;
    label: string;
    tokenType: "command" | "skill" | "file";
    content?: string;
    path?: string;
};

/**
 * Custom Token extension for Tiptap that renders inline badges.
 * This is used for commands (/), skills (/), and file references (@).
 */
export const TokenNode = Node.create({
    name: "token",

    group: "inline",
    inline: true,
    atom: true, // Cursor cannot enter this node

    addAttributes() {
        return {
            id: {
                default: null,
            },
            label: {
                default: "",
            },
            tokenType: {
                default: "command",
            },
            content: {
                default: null,
            },
            path: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-token-type]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(HTMLAttributes, {
                "data-token-type": HTMLAttributes.tokenType,
                "data-token-id": HTMLAttributes.id,
            }),
            HTMLAttributes.label,
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MentionNodeView);
    },

    addKeyboardShortcuts() {
        return {
            Backspace: () => {
                // Delete the entire token when backspace is pressed at its edge
                return this.editor.commands.command(({ tr, state }) => {
                    const { selection } = state;
                    const { $from } = selection;

                    // Check if we're right after a token node
                    const nodeBefore = $from.nodeBefore;
                    if (nodeBefore?.type.name === "token") {
                        const pos = $from.pos - nodeBefore.nodeSize;
                        tr.delete(pos, $from.pos);
                        return true;
                    }

                    return false;
                });
            },
        };
    },
});
