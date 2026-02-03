import { useState, useRef, useEffect } from "react";
import {
    Root as DialogRoot,
    Portal as DialogPortal,
    Overlay as DialogOverlay,
    Content as DialogContent,
    Title as DialogTitle,
    Close as DialogClose
} from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import type { ResumeDialogProps } from "../types";

/**
 * Inner content component that resets state when sessionId changes via key prop
 */
function ResumeDialogContent({
    sessionId,
    onClose
}: {
    sessionId: string;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const closeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                window.clearTimeout(closeTimerRef.current);
            }
        };
    }, []);

    const handleCopyCommand = async () => {
        const command = `claude --resume ${sessionId}`;
        try {
            await navigator.clipboard.writeText(command);
        } catch {
            return;
        }
        setCopied(true);
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
            onClose();
        }, 3000);
    };

    return (
        <>
            <div className="flex items-start justify-between gap-4">
                <DialogTitle className="text-lg font-semibold text-ink-800">
                    {t("sidebar.resumeTitle")}
                </DialogTitle>
                <DialogClose asChild>
                    <button
                        className="rounded-full p-1 text-ink-500 hover:bg-ink-900/10"
                        aria-label="Close dialog"
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M6 6l12 12M18 6l-12 12" />
                        </svg>
                    </button>
                </DialogClose>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink-900/10 bg-surface px-3 py-2 font-mono text-xs text-ink-700">
                <span className="flex-1 break-all">
                    {`claude --resume ${sessionId}`}
                </span>
                <button
                    className="rounded-lg p-1.5 text-ink-600 hover:bg-ink-900/10"
                    onClick={handleCopyCommand}
                    aria-label="Copy resume command"
                >
                    {copied ? (
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M5 12l4 4L19 6" />
                        </svg>
                    ) : (
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                        </svg>
                    )}
                </button>
            </div>
        </>
    );
}

/**
 * Dialog for resuming a session in Claude Code terminal
 * Shows the resume command and allows copying it to clipboard
 */
export function ResumeDialog({ sessionId, onClose }: ResumeDialogProps) {
    return (
        <DialogRoot open={!!sessionId} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm overscroll-contain" />
                <DialogContent className="fixed left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
                    {sessionId && (
                        <ResumeDialogContent
                            key={sessionId}
                            sessionId={sessionId}
                            onClose={onClose}
                        />
                    )}
                </DialogContent>
            </DialogPortal>
        </DialogRoot>
    );
}
