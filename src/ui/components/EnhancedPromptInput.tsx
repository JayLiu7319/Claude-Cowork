import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { SlashCommandPopup } from "./SlashCommandPopup";
import type { ClientEvent } from "../types";
import { usePromptActions } from "../hooks/usePromptActions";

const MAX_ROWS = 12;
const LINE_HEIGHT = 21;
const MAX_HEIGHT = MAX_ROWS * LINE_HEIGHT;
// Stable noop function reference to prevent unnecessary re-renders
const NOOP_SEND_EVENT = () => {};

interface EnhancedPromptInputProps {
    onStartSession: () => void;
    sendEvent?: (event: ClientEvent) => void;
}

export function EnhancedPromptInput({ onStartSession, sendEvent }: EnhancedPromptInputProps) {
    const { t } = useTranslation();
    const prompt = useAppStore((s) => s.prompt);
    const setPrompt = useAppStore((s) => s.setPrompt);
    const planMode = useAppStore((s) => s.planMode);
    const setPlanMode = useAppStore((s) => s.setPlanMode);
    const availableCommands = useAppStore((s) => s.availableCommands);
    const cwd = useAppStore((s) => s.cwd);
    const pendingStart = useAppStore((s) => s.pendingStart);

    const [showCommandPopup, setShowCommandPopup] = useState(false);
    const [commandFilter, setCommandFilter] = useState("");
    const promptRef = useRef<HTMLTextAreaElement | null>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);

    // Use stable noop function reference instead of creating new one each render
    const promptActions = usePromptActions(sendEvent || NOOP_SEND_EVENT);
    const isRunning = promptActions.isRunning;

    // Load commands when component mounts
    useEffect(() => {
        window.electron.loadCommands().then((commands) => {
            useAppStore.getState().setAvailableCommands(commands);
        }).catch(console.error);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setPrompt(value);

        // Check for slash command trigger
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

        if (lastSlashIndex !== -1) {
            const textAfterSlash = textBeforeCursor.slice(lastSlashIndex + 1);
            // Show popup if we're right after a slash or typing a command name
            if (!textAfterSlash.includes(' ') && !textAfterSlash.includes('\n')) {
                setCommandFilter(textAfterSlash);
                setShowCommandPopup(true);
                return;
            }
        }
        setShowCommandPopup(false);
    }, [setPrompt]);

    const handleCommandSelect = useCallback((_commandName: string, commandContent: string) => {
        const cursorPos = promptRef.current?.selectionStart ?? prompt.length;
        const textBeforeCursor = prompt.slice(0, cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

        if (lastSlashIndex !== -1) {
            const newPrompt = prompt.slice(0, lastSlashIndex) + commandContent + prompt.slice(cursorPos);
            setPrompt(newPrompt);
        } else {
            setPrompt(commandContent);
        }
        setShowCommandPopup(false);
        promptRef.current?.focus();
    }, [prompt, setPrompt]);

    const handleSend = useCallback(() => {
        if (!prompt.trim() || !cwd.trim() || pendingStart) return;

        if (sendEvent) {
            // Existing session - send message
            promptActions.handleSend();
        } else {
            // New session - start
            onStartSession();
        }
    }, [prompt, cwd, pendingStart, promptActions, onStartSession, sendEvent]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPopup) {
            // Let the popup handle navigation keys
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') {
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPopup(false);
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (showCommandPopup) {
                // Enter selects command, handled by popup
                return;
            }
            handleSend();
        }
    }, [showCommandPopup, handleSend]);



    const handleStop = useCallback(() => {
        promptActions.handleStop();
    }, [promptActions]);

    const togglePlanMode = useCallback(() => {
        setPlanMode(!planMode);
    }, [planMode, setPlanMode]);

    // Auto-resize textarea
    useLayoutEffect(() => {
        if (!promptRef.current) return;
        promptRef.current.style.height = "auto";
        const scrollHeight = promptRef.current.scrollHeight;
        if (scrollHeight > MAX_HEIGHT) {
            promptRef.current.style.height = `${MAX_HEIGHT}px`;
            promptRef.current.style.overflowY = "auto";
        } else {
            promptRef.current.style.height = `${scrollHeight}px`;
            promptRef.current.style.overflowY = "hidden";
        }
    }, [prompt]);

    const canSend = prompt.trim() && cwd.trim() && !pendingStart && !isRunning;

    return (
        <section className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-cream via-surface-cream to-transparent pb-6 px-2 lg:pb-8 pt-8">
            <div ref={inputContainerRef} className="relative mx-auto max-w-full lg:max-w-3xl">
                {/* Slash Command Popup */}
                {showCommandPopup && availableCommands.length > 0 && (
                    <SlashCommandPopup
                        commands={availableCommands}
                        filter={commandFilter}
                        onSelect={handleCommandSelect}
                        onClose={() => setShowCommandPopup(false)}
                    />
                )}

                <div className="flex flex-col gap-2 rounded-2xl border border-ink-900/10 bg-surface px-4 py-3 shadow-card">
                    {/* Input area */}
                    <div className="flex items-end gap-3">
                        <label htmlFor="enhanced-prompt-input" className="sr-only">{t('promptInput.sendPrompt')}</label>
                        <textarea
                            id="enhanced-prompt-input"
                            name="prompt"
                            rows={1}
                            autoComplete="off"
                            className="flex-1 resize-none bg-transparent py-1.5 text-sm text-ink-800 placeholder:text-muted focus:outline-none"
                            placeholder={t('welcomePage.inputPlaceholder', '输入 / 使用技能，描述您的任务...')}
                            value={prompt}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            ref={promptRef}
                        />
                        <button
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isRunning ? "bg-error text-white hover:bg-error/90" : "bg-accent text-white hover:bg-accent-hover"}`}
                            onClick={isRunning ? handleStop : handleSend}
                            disabled={!isRunning && !canSend}
                            aria-label={isRunning ? t('promptInput.stopSession') : t('promptInput.sendPrompt')}
                        >
                            {isRunning ? (
                                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L16 12l-9.8 1.4-2.8 7.2Z" fill="currentColor" /></svg>
                            )}
                        </button>
                    </div>

                    {/* Bottom toolbar */}
                    <div className="flex items-center gap-2 border-t border-ink-900/5 pt-2">
                        <button
                            type="button"
                            onClick={togglePlanMode}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${planMode
                                ? "bg-accent/10 text-accent border border-accent/30"
                                : "text-muted hover:bg-surface-tertiary hover:text-ink-700 border border-transparent"
                                }`}
                        >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            {t('welcomePage.planMode', '计划模式')}
                        </button>

                        {planMode && (
                            <span className="text-xs text-muted">
                                {t('welcomePage.planModeHint', 'Claude 将先制定计划再执行')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
