import { useState, useRef, useLayoutEffect, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { AutocompletePopup } from "./AutocompletePopup";
import { InlineBadge } from "./InlineBadge";
import type { ClientEvent, InputToken, FileEntry } from "../types";
import { usePromptActions } from "../hooks/usePromptActions";

const MAX_ROWS = 12;
const LINE_HEIGHT = 24;
const MAX_HEIGHT = MAX_ROWS * LINE_HEIGHT;
const TOKEN_PLACEHOLDER = "\uFFFC";
const TOKEN_PADDING_CHARS = 2;
const TOKEN_SEPARATOR = "\u200B";
// Stable noop function reference to prevent unnecessary re-renders
const NOOP_SEND_EVENT = () => { };

interface EnhancedPromptInputProps {
    onStartSession?: (options?: { promptOverride?: string; titleOverride?: string; displayTokensOverride?: InputToken[] }) => void;
    sendEvent?: (event: ClientEvent) => void;
    onSendMessage?: () => void;
    disabled?: boolean;
    showNewMessageButton?: boolean;
    onScrollToBottom?: () => void;
}

type TokenRegistryItem = InputToken & { id: string };

function createTokenId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `token-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTokenPlaceholder(token?: TokenRegistryItem) {
    if (!token || token.type === "text") return TOKEN_PLACEHOLDER;
    const placeholderCount = Math.max(1, token.name.length + TOKEN_PADDING_CHARS);
    return TOKEN_PLACEHOLDER.repeat(placeholderCount);
}

function parseDisplayTokens(value: string, tokens: TokenRegistryItem[]) {
    const displayTokens: InputToken[] = [];
    let buffer = "";
    let tokenIndex = 0;

    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if (ch === TOKEN_SEPARATOR) {
            continue;
        }
        if (ch === TOKEN_PLACEHOLDER) {
            while (i + 1 < value.length && value[i + 1] === TOKEN_PLACEHOLDER) {
                i += 1;
            }
            if (buffer) {
                displayTokens.push({ type: "text", value: buffer });
                buffer = "";
            }
            const token = tokens[tokenIndex];
            if (token) {
                displayTokens.push(token);
            }
            tokenIndex += 1;
        } else {
            buffer += ch;
        }
    }

    if (buffer) {
        displayTokens.push({ type: "text", value: buffer });
    }

    return displayTokens;
}

function serializePrompt(value: string, tokens: TokenRegistryItem[], mode: "send" | "title") {
    let result = "";
    let tokenIndex = 0;
    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if (ch === TOKEN_SEPARATOR) {
            continue;
        }
        if (ch === TOKEN_PLACEHOLDER) {
            const token = tokens[tokenIndex];
            if (token) {
                if (token.type === "command") {
                    result += mode === "send" ? token.content : `/${token.name}`;
                } else if (token.type === "skill") {
                    result += mode === "send" ? token.content : `@${token.name}`;
                } else if (token.type === "file") {
                    result += mode === "send" ? token.path : `@${token.name}`;
                }
            }
            tokenIndex += 1;
        } else {
            result += ch;
        }
    }
    return result;
}

function findTrigger(value: string, cursorPos: number, triggerChar: "/" | "@") {
    let cleaned = "";
    let lastTriggerCleanIndex = -1;
    let lastTriggerRawIndex = -1;
    let i = 0;

    while (i < cursorPos) {
        if (value[i] === TOKEN_PLACEHOLDER) {
            i += 1;
            continue;
        }
        if (value[i] === TOKEN_SEPARATOR) {
            i += 1;
            continue;
        }
        const ch = value[i];
        if (ch === triggerChar) {
            lastTriggerCleanIndex = cleaned.length;
            lastTriggerRawIndex = i;
        }
        cleaned += ch;
        i += 1;
    }

    if (lastTriggerCleanIndex === -1) return null;
    const textAfterTrigger = cleaned.slice(lastTriggerCleanIndex + 1);
    if (textAfterTrigger.includes(" ") || textAfterTrigger.includes("\n")) return null;
    return { rawIndex: lastTriggerRawIndex, filter: textAfterTrigger };
}

function countPlaceholders(value: string, endIndex = value.length) {
    let count = 0;
    let inRun = false;
    for (let i = 0; i < endIndex; i += 1) {
        const isPlaceholder = value[i] === TOKEN_PLACEHOLDER;
        if (isPlaceholder && !inRun) {
            count += 1;
        }
        inRun = isPlaceholder;
    }
    return count;
}

function getPlaceholderRuns(value: string) {
    const runs: number[] = [];
    let currentRun = 0;
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] === TOKEN_PLACEHOLDER) {
            currentRun += 1;
        } else if (currentRun > 0) {
            runs.push(currentRun);
            currentRun = 0;
        }
    }
    if (currentRun > 0) runs.push(currentRun);
    return runs;
}

function measureAverageCharWidth(element: HTMLElement) {
    const style = getComputedStyle(element);
    const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.font = font;
    const sample = "mmmmmmmmmm";
    return context.measureText(sample).width / sample.length;
}

function measureCharWidth(element: HTMLElement, character: string) {
    const style = getComputedStyle(element);
    const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.font = font;
    return context.measureText(character).width;
}

function measurePlaceholderCharWidthDom(element: HTMLElement) {
    const style = getComputedStyle(element);
    const span = document.createElement("span");
    span.style.position = "absolute";
    span.style.visibility = "hidden";
    span.style.whiteSpace = "pre";
    span.style.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;
    span.style.letterSpacing = style.letterSpacing;
    const sampleCount = 10;
    span.textContent = TOKEN_PLACEHOLDER.repeat(sampleCount);
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    return width / sampleCount;
}

function replacePlaceholderRuns(value: string, desiredRuns: number[]) {
    let result = "";
    let runIndex = 0;
    let i = 0;
    while (i < value.length) {
        if (value[i] === TOKEN_PLACEHOLDER) {
            const start = i;
            while (i < value.length && value[i] === TOKEN_PLACEHOLDER) {
                i += 1;
            }
            const currentLength = i - start;
            const nextLength = desiredRuns[runIndex] ?? currentLength;
            result += TOKEN_PLACEHOLDER.repeat(nextLength);
            runIndex += 1;
            continue;
        }
        result += value[i];
        i += 1;
    }
    return { nextValue: result, runCount: runIndex };
}

function removePlaceholderBeforeCursor(value: string, cursorPos: number) {
    if (cursorPos <= 0) return null;
    if (value[cursorPos - 1] !== TOKEN_PLACEHOLDER) return null;
    let startIndex = cursorPos - 1;
    while (startIndex > 0 && value[startIndex - 1] === TOKEN_PLACEHOLDER) {
        startIndex -= 1;
    }
    let endIndex = cursorPos;
    while (endIndex < value.length && value[endIndex] === TOKEN_PLACEHOLDER) {
        endIndex += 1;
    }
    if (startIndex > 0 && value[startIndex - 1] === TOKEN_SEPARATOR) {
        startIndex -= 1;
    }
    if (endIndex < value.length && value[endIndex] === TOKEN_SEPARATOR) {
        endIndex += 1;
    }
    return {
        newValue: value.slice(0, startIndex) + value.slice(endIndex),
        newCursorPos: startIndex
    };
}

function removePlaceholderAtCursor(value: string, cursorPos: number) {
    if (cursorPos >= value.length) return null;
    if (value[cursorPos] !== TOKEN_PLACEHOLDER) return null;
    let startIndex = cursorPos;
    while (startIndex > 0 && value[startIndex - 1] === TOKEN_PLACEHOLDER) {
        startIndex -= 1;
    }
    let endIndex = cursorPos + 1;
    while (endIndex < value.length && value[endIndex] === TOKEN_PLACEHOLDER) {
        endIndex += 1;
    }
    if (startIndex > 0 && value[startIndex - 1] === TOKEN_SEPARATOR) {
        startIndex -= 1;
    }
    if (endIndex < value.length && value[endIndex] === TOKEN_SEPARATOR) {
        endIndex += 1;
    }
    return {
        newValue: value.slice(0, startIndex) + value.slice(endIndex),
        newCursorPos: startIndex
    };
}

function computeDiffRange(prev: string, next: string) {
    let start = 0;
    const prevLength = prev.length;
    const nextLength = next.length;
    while (start < prevLength && start < nextLength && prev[start] === next[start]) {
        start += 1;
    }
    let endPrev = prevLength - 1;
    let endNext = nextLength - 1;
    while (endPrev >= start && endNext >= start && prev[endPrev] === next[endNext]) {
        endPrev -= 1;
        endNext -= 1;
    }
    return { start, endPrev, endNext };
}

export function EnhancedPromptInput({
    onStartSession,
    sendEvent,
    onSendMessage,
    disabled = false,
    showNewMessageButton = false,
    onScrollToBottom
}: EnhancedPromptInputProps) {
    const { t } = useTranslation();
    const planMode = useAppStore((s) => s.planMode);
    const setPlanMode = useAppStore((s) => s.setPlanMode);
    const availableCommands = useAppStore((s) => s.availableCommands);
    const availableSkills = useAppStore((s) => s.availableSkills);
    const recentFiles = useAppStore((s) => s.recentFiles);
    const cwd = useAppStore((s) => s.cwd);
    const pendingStart = useAppStore((s) => s.pendingStart);

    const [inputValue, setInputValue] = useState("");
    const [tokens, setTokens] = useState<TokenRegistryItem[]>([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteMode, setAutocompleteMode] = useState<'commands-skills' | 'files'>('commands-skills');
    const [autocompleteFilter, setAutocompleteFilter] = useState("");
    const [currentFileEntries, setCurrentFileEntries] = useState<FileEntry[]>([]);

    const promptRef = useRef<HTMLTextAreaElement | null>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const displayRef = useRef<HTMLDivElement>(null);
    const prevValueRef = useRef("");
    const promptActions = usePromptActions(sendEvent || NOOP_SEND_EVENT);
    const isRunning = promptActions.isRunning;
    const placeholderText = t('welcomePage.inputPlaceholder', '输入 / 使用技能，描述您的任务…');

    const displayTokens = useMemo(
        () => parseDisplayTokens(inputValue, tokens),
        [inputValue, tokens]
    );

    const hasDisplayContent = useMemo(() => {
        return displayTokens.some((token) => token.type !== "text" || token.value.trim().length > 0);
    }, [displayTokens]);

    // Load commands and skills on mount
    useEffect(() => {
        Promise.all([
            window.electron.loadCommands(),
            window.electron.loadSkills()
        ]).then(([commands, skills]) => {
            useAppStore.getState().setAvailableCommands(commands);
            useAppStore.getState().setAvailableSkills(skills);
        }).catch(console.error);
    }, []);

    // Load files when cwd changes
    useEffect(() => {
        if (!cwd) return;
        window.electron.listFiles(cwd)
            .then((entries) => setCurrentFileEntries(entries))
            .catch(() => setCurrentFileEntries([]));
    }, [cwd]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const previousValue = prevValueRef.current;

        if (previousValue !== value) {
            const { start, endPrev, endNext } = computeDiffRange(previousValue, value);
            const prevRangeCount = endPrev >= start
                ? countPlaceholders(previousValue, endPrev + 1) - countPlaceholders(previousValue, start)
                : 0;
            const nextRangeCount = endNext >= start
                ? countPlaceholders(value, endNext + 1) - countPlaceholders(value, start)
                : 0;
            if (prevRangeCount > nextRangeCount) {
                const removeTotal = prevRangeCount - nextRangeCount;
                const removeStartIndex = countPlaceholders(previousValue, start);
                setTokens((prevTokens) => {
                    const nextTokens = prevTokens.slice();
                    nextTokens.splice(removeStartIndex, removeTotal);
                    return nextTokens;
                });
            }
        }

        setInputValue(value);
        prevValueRef.current = value;

        // Check for slash command/skill trigger
        const cursorPos = e.target.selectionStart;
        if (cursorPos !== null) {
            const slashTrigger = findTrigger(value, cursorPos, '/');
            if (slashTrigger) {
                setAutocompleteFilter(slashTrigger.filter);
                setAutocompleteMode('commands-skills');
                setShowAutocomplete(true);
                return;
            }

            const atTrigger = findTrigger(value, cursorPos, '@');
            if (atTrigger) {
                setAutocompleteFilter(atTrigger.filter);
                setAutocompleteMode('files');
                setShowAutocomplete(true);
                return;
            }
        }

        setShowAutocomplete(false);
    }, []);

    const handleInputScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
        if (displayRef.current) {
            displayRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    }, []);

    const insertTokenAtTrigger = useCallback((triggerChar: "/" | "@", token: TokenRegistryItem) => {
        const textarea = promptRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart ?? inputValue.length;
        const trigger = findTrigger(inputValue, cursorPos, triggerChar);
        if (!trigger) return;

        const placeholder = createTokenPlaceholder(token);
        const beforeChar = trigger.rawIndex > 0 ? inputValue[trigger.rawIndex - 1] : "";
        const afterChar = inputValue[cursorPos] ?? "";
        const prefixSeparator = beforeChar === TOKEN_PLACEHOLDER ? TOKEN_SEPARATOR : "";
        const suffixSeparator = afterChar === TOKEN_PLACEHOLDER ? TOKEN_SEPARATOR : "";
        const insertIndex = countPlaceholders(inputValue, trigger.rawIndex);
        setTokens((prevTokens) => {
            const nextTokens = prevTokens.slice();
            nextTokens.splice(insertIndex, 0, token);
            return nextTokens;
        });

        const newValue = inputValue.slice(0, trigger.rawIndex)
            + prefixSeparator
            + placeholder
            + suffixSeparator
            + inputValue.slice(cursorPos);
        setInputValue(newValue);
        prevValueRef.current = newValue;
        setShowAutocomplete(false);

        requestAnimationFrame(() => {
            if (!promptRef.current) return;
            const nextPos = trigger.rawIndex + prefixSeparator.length + placeholder.length;
            promptRef.current.focus();
            promptRef.current.setSelectionRange(nextPos, nextPos);
        });
    }, [inputValue]);

    const handleSelectCommand = useCallback((name: string, content: string) => {
        insertTokenAtTrigger('/', { id: createTokenId(), type: 'command', name, content });
    }, [insertTokenAtTrigger]);

    const handleSelectSkill = useCallback((name: string, content: string) => {
        insertTokenAtTrigger('/', { id: createTokenId(), type: 'skill', name, content });
    }, [insertTokenAtTrigger]);

    const handleSelectFile = useCallback((path: string) => {
        const fileName = path.split(/[\\/]/).pop() || path;
        insertTokenAtTrigger('@', { id: createTokenId(), type: 'file', name: fileName, path });
    }, [insertTokenAtTrigger]);

    const handleNavigateFolder = useCallback((folderPath: string) => {
        window.electron.listFiles(folderPath)
            .then((entries) => {
                setCurrentFileEntries(entries);
            })
            .catch(console.error);
    }, []);

    const isInputDisabled = disabled && !isRunning;

    const handleSend = useCallback(() => {
        if (isInputDisabled) return;
        const finalPrompt = serializePrompt(inputValue, tokens, "send");
        const titlePrompt = serializePrompt(inputValue, tokens, "title");
        if (!finalPrompt.trim() || !cwd.trim() || pendingStart) return;

        const displayTokens = parseDisplayTokens(inputValue, tokens);
        if (sendEvent) {
            onSendMessage?.();
            promptActions.handleSend({
                promptOverride: finalPrompt,
                titleOverride: titlePrompt,
                displayOverride: titlePrompt,
                displayTokensOverride: displayTokens
            });
        } else {
            onSendMessage?.();
            onStartSession?.({
                promptOverride: finalPrompt,
                titleOverride: titlePrompt,
                displayTokensOverride: displayTokens
            });
        }

        setInputValue("");
        setTokens([]);
        prevValueRef.current = "";
        setShowAutocomplete(false);
    }, [inputValue, tokens, cwd, pendingStart, promptActions, onStartSession, onSendMessage, sendEvent, isInputDisabled]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Backspace' && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
            const cursorPos = e.currentTarget.selectionStart ?? 0;
            const removal = removePlaceholderBeforeCursor(inputValue, cursorPos);
            if (removal) {
                e.preventDefault();
                const tokenIndex = countPlaceholders(inputValue, cursorPos) - 1;
                setTokens((prevTokens) => {
                    const nextTokens = prevTokens.slice();
                    nextTokens.splice(tokenIndex, 1);
                    return nextTokens;
                });
                setInputValue(removal.newValue);
                prevValueRef.current = removal.newValue;
                requestAnimationFrame(() => {
                    if (!promptRef.current) return;
                    promptRef.current.setSelectionRange(removal.newCursorPos, removal.newCursorPos);
                });
                return;
            }
        }

        if (e.key === 'Delete' && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
            const cursorPos = e.currentTarget.selectionStart ?? 0;
            const removal = removePlaceholderAtCursor(inputValue, cursorPos);
            if (removal) {
                e.preventDefault();
                const tokenIndex = countPlaceholders(inputValue, cursorPos);
                setTokens((prevTokens) => {
                    const nextTokens = prevTokens.slice();
                    nextTokens.splice(tokenIndex, 1);
                    return nextTokens;
                });
                setInputValue(removal.newValue);
                prevValueRef.current = removal.newValue;
                requestAnimationFrame(() => {
                    if (!promptRef.current) return;
                    promptRef.current.setSelectionRange(removal.newCursorPos, removal.newCursorPos);
                });
                return;
            }
        }
        if (isInputDisabled) return;

        if (showAutocomplete) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') {
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowAutocomplete(false);
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (showAutocomplete) {
                return;
            }
            handleSend();
        }
    }, [showAutocomplete, handleSend, inputValue, isInputDisabled]);

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
    }, [inputValue]);

    // 规则: 避免在 useLayoutEffect 中同步调用 setState 防止级联渲染
    useLayoutEffect(() => {
        const displayLayer = displayRef.current;
        const textarea = promptRef.current;
        if (!displayLayer || !textarea) return;
        const placeholderRuns = getPlaceholderRuns(inputValue);
        const avgCharWidth = measureAverageCharWidth(textarea);
        const placeholderCharWidth = measureCharWidth(textarea, TOKEN_PLACEHOLDER);
        const placeholderDomCharWidth = measurePlaceholderCharWidthDom(textarea);
        const badgeNodes = displayLayer.querySelectorAll("[data-token-order]");
        const badgeMetrics = Array.from(badgeNodes).map((node) => {
            const element = node as HTMLElement;
            const index = Number(element.dataset.tokenOrder ?? -1);
            return {
                index,
                name: element.dataset.tokenName ?? "",
                width: element.getBoundingClientRect().width
            };
        });
        // 规则: js-tosorted-immutable - 使用展开运算符避免原数组变异
        const sortedBadges = [...badgeMetrics]
            .filter((badge) => Number.isFinite(badge.index))
            .sort((a, b) => a.index - b.index);
        const fallbackWidth = avgCharWidth && avgCharWidth > 0 ? avgCharWidth : 12;
        const effectivePlaceholderWidth = placeholderDomCharWidth && placeholderDomCharWidth > 0
            ? placeholderDomCharWidth
            : (placeholderCharWidth && placeholderCharWidth > 0 ? placeholderCharWidth : fallbackWidth);
        const desiredRuns = sortedBadges.map((badge) => {
            const paddingPx = 2;
            return Math.max(1, Math.round((badge.width + paddingPx) / effectivePlaceholderWidth));
        });
        if (desiredRuns.length && desiredRuns.length === placeholderRuns.length) {
            const { nextValue, runCount } = replacePlaceholderRuns(inputValue, desiredRuns);
            if (runCount === desiredRuns.length && nextValue !== inputValue) {
                // 使用 requestAnimationFrame 延迟 setState 避免级联渲染警告
                requestAnimationFrame(() => {
                    setInputValue(nextValue);
                    prevValueRef.current = nextValue;
                });
            }
        }
    }, [inputValue, displayTokens]);



    const canSend = inputValue.trim() && cwd.trim() && !pendingStart && !isRunning && !isInputDisabled;

    return (
        <section className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-cream via-surface-cream to-transparent pb-6 px-2 lg:pb-8 pt-8">
            <div ref={inputContainerRef} className="relative mx-auto max-w-full lg:max-w-3xl pr-[6px]">
                {/* Autocomplete Popup */}
                {showAutocomplete && (
                    <AutocompletePopup
                        mode={autocompleteMode}
                        filter={autocompleteFilter}
                        commands={availableCommands}
                        skills={availableSkills}
                        fileEntries={currentFileEntries}
                        recentFiles={recentFiles}
                        onSelectCommand={handleSelectCommand}
                        onSelectSkill={handleSelectSkill}
                        onSelectFile={handleSelectFile}
                        onNavigateFolder={handleNavigateFolder}
                        onClose={() => setShowAutocomplete(false)}
                    />
                )}

                <div className="relative flex flex-col gap-2 rounded-2xl border border-ink-900/10 bg-surface px-4 py-3 shadow-card focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20 transition-colors">
                    {/* New Messages Button - Positioned above the card */}
                    {showNewMessageButton && (
                        <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none">
                            <button
                                onClick={onScrollToBottom}
                                aria-label="Scroll to bottom to view new messages"
                                className="pointer-events-auto flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 animate-bounce-subtle motion-reduce:animate-none"
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 5v14M5 12l7 7 7-7" />
                                </svg>
                                <span>{t('common.newMessages', '新消息')}</span>
                            </button>
                        </div>
                    )}

                    {/* Input area */}
                    <div className="flex items-end gap-3">
                        <label htmlFor="enhanced-prompt-input" className="sr-only">{t('promptInput.sendPrompt')}</label>
                        <div className="relative flex-1">
                            <div
                                ref={displayRef}
                                className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words py-1.5 text-base leading-6 text-ink-800"
                                aria-hidden="true"
                            >
                                {hasDisplayContent ? (
                                    displayTokens.map((token, idx) => {
                                        if (token.type === "text") {
                                            return <span key={`text-${idx}`}>{token.value}</span>;
                                        }
                                        const tokenOrder = displayTokens
                                            .slice(0, idx)
                                            .filter((item) => item.type !== "text").length;
                                        return (
                                            <span
                                                key={`token-${idx}`}
                                                data-token-order={tokenOrder}
                                                data-token-name={token.name}
                                            >
                                                <InlineBadge token={token} />
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-muted">{placeholderText}</span>
                                )}
                            </div>
                            <textarea
                                id="enhanced-prompt-input"
                                name="prompt"
                                rows={1}
                                autoComplete="off"
                                spellCheck={false}
                                className="relative z-10 w-full resize-none bg-transparent py-1.5 text-base leading-6 text-transparent caret-ink-800 selection:bg-blue-400/40 selection:text-transparent focus:outline-none disabled:cursor-not-allowed"
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onScroll={handleInputScroll}
                                disabled={isInputDisabled}
                                ref={promptRef}
                            />
                        </div>
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
                            aria-label={planMode ? t('accessibility.disablePlanMode', '禁用计划模式') : t('accessibility.enablePlanMode', '启用计划模式')}
                            aria-pressed={planMode}
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
                                {t('welcomePage.planModeHint', 'Agent 将先制定计划再执行')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
