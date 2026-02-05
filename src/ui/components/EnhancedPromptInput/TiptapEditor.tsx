import { useEffect, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import History from "@tiptap/extension-history";
import Placeholder from "@tiptap/extension-placeholder";
import { TokenNode, type TokenNodeAttrs } from "./TokenNode";
import type { InputToken } from "@shared/types";

// Re-export TokenNodeAttrs for consumers
export type { TokenNodeAttrs };

export type TiptapEditorRef = {
    editor: Editor | null;
    focus: () => void;
    clear: () => void;
    isEmpty: () => boolean;
    getPlainText: () => string;
    getTokens: () => InputToken[];
    insertToken: (attrs: TokenNodeAttrs) => void;
};

export type TiptapEditorProps = {
    placeholder?: string;
    disabled?: boolean;
    isAutocompleteOpen?: boolean;
    onUpdate?: (content: { text: string; tokens: InputToken[] }) => void;
    onTrigger?: (trigger: { char: "/" | "@"; query: string; position: number } | null) => void;
    onSubmit?: () => void;
    className?: string;
};

/**
 * Core Tiptap editor component for the enhanced prompt input.
 * Handles token insertion, trigger detection, and content extraction.
 */
export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
    function TiptapEditor(
        { placeholder, disabled, isAutocompleteOpen, onUpdate, onTrigger, onSubmit, className },
        ref
    ) {
        const editor = useEditor({
            extensions: [
                Document,
                Paragraph.configure({
                    HTMLAttributes: {
                        class: "min-h-[1.5rem]",
                    },
                }),
                Text,
                History,
                TokenNode,
                Placeholder.configure({
                    placeholder: placeholder || "输入消息...",
                    emptyEditorClass: "is-editor-empty",
                }),
            ],
            editable: !disabled,
            editorProps: {
                attributes: {
                    class: `outline-none ${className || ""}`,
                },
                handleKeyDown: (_view, event) => {
                    // When autocomplete is open, key events are handled by the popup (via document listener)
                    // We just need to prevent default editor behavior
                    if (isAutocompleteOpen) {
                        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                            return true; // Prevent cursor movement
                        }
                        if (event.key === "Enter" && !event.shiftKey) {
                            return true; // Prevent submit / newline
                        }
                    }

                    // Submit on Enter (without Shift)
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onSubmit?.();
                        return true;
                    }
                    return false;
                },
            },
            onUpdate: ({ editor }) => {
                // Extract plain text and tokens
                const text = getPlainTextFromEditor(editor);
                const tokens = getTokensFromEditor(editor);
                onUpdate?.({ text, tokens });

                // Detect trigger characters for autocomplete
                const trigger = detectTrigger(editor);
                onTrigger?.(trigger);
            },
        });

        // Expose editor methods via ref
        useImperativeHandle(ref, () => ({
            editor,
            focus: () => editor?.commands.focus(),
            clear: () => editor?.commands.clearContent(),
            isEmpty: () => editor?.isEmpty ?? true,
            getPlainText: () => (editor ? getPlainTextFromEditor(editor) : ""),
            getTokens: () => (editor ? getTokensFromEditor(editor) : []),
            insertToken: (attrs: TokenNodeAttrs) => {
                if (!editor) return;

                // Delete the trigger text before inserting token
                const { state } = editor;
                const { selection } = state;
                const { from } = selection;

                // Find trigger position (/ or @)
                const text = state.doc.textBetween(0, from, " ");
                const lastSlash = text.lastIndexOf("/");
                const lastAt = text.lastIndexOf("@");
                const triggerPos = Math.max(lastSlash, lastAt);

                if (triggerPos !== -1) {
                    // Calculate the document position of the trigger
                    let charCount = 0;
                    let docPos = 0;
                    state.doc.descendants((node, pos) => {
                        if (node.isText) {
                            const nodeText = node.text || "";
                            if (charCount + nodeText.length > triggerPos && docPos === 0) {
                                docPos = pos + (triggerPos - charCount);
                            }
                            charCount += nodeText.length;
                        } else if (node.type.name === "token") {
                            charCount += 1; // Token counts as 1 character in plain text
                        }
                        return true;
                    });

                    if (docPos > 0) {
                        editor
                            .chain()
                            .deleteRange({ from: docPos, to: from })
                            .insertContent({
                                type: "token",
                                attrs,
                            })
                            .run();
                        return;
                    }
                }

                // Fallback: just insert at cursor
                editor.chain().insertContent({ type: "token", attrs }).run();
            },
        }));

        // Update editable state when disabled prop changes
        useEffect(() => {
            if (editor) {
                editor.setEditable(!disabled);
            }
        }, [editor, disabled]);

        if (!editor) {
            return null;
        }

        return (
            <EditorContent
                editor={editor}
                className="flex-1 py-1.5 text-base leading-6 text-ink-800"
            />
        );
    }
);

/**
 * Extract plain text from editor, treating tokens as their names
 */
function getPlainTextFromEditor(editor: Editor): string {
    let text = "";
    editor.state.doc.descendants((node) => {
        if (node.isText) {
            text += node.text;
        } else if (node.type.name === "token") {
            // For plain text, use the token label
            text += node.attrs.label || "";
        }
        return true;
    });
    return text.trim();
}

/**
 * Extract InputToken array from editor
 */
function getTokensFromEditor(editor: Editor): InputToken[] {
    const tokens: InputToken[] = [];
    let textBuffer = "";

    editor.state.doc.descendants((node) => {
        if (node.isText) {
            textBuffer += node.text;
        } else if (node.type.name === "token") {
            // Flush text buffer
            if (textBuffer) {
                tokens.push({ type: "text", value: textBuffer });
                textBuffer = "";
            }
            // Add token
            const { label, tokenType, content, path } = node.attrs;
            if (tokenType === "file") {
                tokens.push({ type: "file", name: label, path: path || "" });
            } else {
                tokens.push({ type: tokenType, name: label, content: content || "" });
            }
        }
        return true;
    });

    // Flush remaining text
    if (textBuffer) {
        tokens.push({ type: "text", value: textBuffer });
    }

    return tokens;
}

/**
 * Detect trigger character (/ or @) at cursor position
 */
function detectTrigger(
    editor: Editor
): { char: "/" | "@"; query: string; position: number } | null {
    const { state } = editor;
    const { selection } = state;
    const { from } = selection;

    // Get text before cursor in current node
    const $from = state.doc.resolve(from);
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, " ");

    // Find last trigger character
    const lastSlash = textBefore.lastIndexOf("/");
    const lastAt = textBefore.lastIndexOf("@");

    let char: "/" | "@" | null = null;
    let triggerIndex = -1;

    if (lastSlash > lastAt) {
        char = "/";
        triggerIndex = lastSlash;
    } else if (lastAt > lastSlash) {
        char = "@";
        triggerIndex = lastAt;
    }

    if (char === null || triggerIndex === -1) {
        return null;
    }

    // Get query after trigger
    const query = textBefore.slice(triggerIndex + 1);

    // Check if query contains space (should close autocomplete)
    if (query.includes(" ") || query.includes("\n")) {
        return null;
    }

    return { char, query, position: from };
}
