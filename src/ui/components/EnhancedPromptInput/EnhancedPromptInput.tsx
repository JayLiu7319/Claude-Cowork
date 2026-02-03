import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@ui/store/useAppStore";
import type { ClientEvent, InputToken, FileEntry } from "@ui/types";
import { usePromptActions } from "@ui/hooks/usePromptActions";
import { useElectronBridge } from "@ui/hooks/useElectronBridge";
import {
  TOKEN_PLACEHOLDER,
  TOKEN_SEPARATOR,
  type TokenRegistryItem,
  createTokenId,
  createTokenPlaceholder,
  parseDisplayTokens,
  serializePrompt,
  findTrigger,
  countPlaceholders,
  removePlaceholderBeforeCursor,
  removePlaceholderAtCursor,
  computeDiffRange
} from "@ui/utils/tokenUtils";
import { AutocompleteManager } from "./AutocompleteManager";
import { TokenInputCore } from "./TokenInputCore";
import { useInputMeasurement } from "./InputMeasurement";

// Stable noop function reference to prevent unnecessary re-renders
const NOOP_SEND_EVENT = () => {};

interface EnhancedPromptInputProps {
  onStartSession?: (options?: { promptOverride?: string; titleOverride?: string; displayTokensOverride?: InputToken[] }) => void;
  sendEvent?: (event: ClientEvent) => void;
  onSendMessage?: () => void;
  disabled?: boolean;
  showNewMessageButton?: boolean;
  showScrollToBottomButton?: boolean;
  onScrollToBottom?: () => void;
}

export function EnhancedPromptInput({
  onStartSession,
  sendEvent,
  onSendMessage,
  disabled = false,
  showNewMessageButton = false,
  showScrollToBottomButton = false,
  onScrollToBottom
}: EnhancedPromptInputProps) {
  const { t } = useTranslation();
  const bridge = useElectronBridge();
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
  const [autocompleteMode, setAutocompleteMode] = useState<"commands-skills" | "files">("commands-skills");
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [currentFileEntries, setCurrentFileEntries] = useState<FileEntry[]>([]);

  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef("");
  const promptActions = usePromptActions(sendEvent || NOOP_SEND_EVENT);
  const isRunning = promptActions.isRunning;
  const placeholderText = t("welcomePage.inputPlaceholder", "输入 / 使用技能，描述您的任务…");

  const displayTokens = useMemo(
    () => parseDisplayTokens(inputValue, tokens),
    [inputValue, tokens]
  );

  const hasDisplayContent = useMemo(() => {
    return displayTokens.some((token) => token.type !== "text" || token.value.trim().length > 0);
  }, [displayTokens]);

  useEffect(() => {
    Promise.all([
      bridge.loadCommands(),
      bridge.loadSkills()
    ])
      .then(([commands, skills]) => {
        useAppStore.getState().setAvailableCommands(commands);
        useAppStore.getState().setAvailableSkills(skills);
      })
      .catch(console.error);
  }, [bridge]);

  useEffect(() => {
    if (!cwd) return;
    bridge.listFiles(cwd)
      .then((entries) => setCurrentFileEntries(entries))
      .catch(() => setCurrentFileEntries([]));
  }, [cwd, bridge]);

  const commitInputValue = useCallback((nextValue: string) => {
    setInputValue(nextValue);
    prevValueRef.current = nextValue;
  }, []);

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

    commitInputValue(value);

    const cursorPos = e.target.selectionStart;
    if (cursorPos !== null) {
      const slashTrigger = findTrigger(value, cursorPos, "/");
      if (slashTrigger) {
        setAutocompleteFilter(slashTrigger.filter);
        setAutocompleteMode("commands-skills");
        setShowAutocomplete(true);
        return;
      }

      const atTrigger = findTrigger(value, cursorPos, "@");
      if (atTrigger) {
        setAutocompleteFilter(atTrigger.filter);
        setAutocompleteMode("files");
        setShowAutocomplete(true);
        return;
      }
    }

    setShowAutocomplete(false);
  }, [commitInputValue]);

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
    commitInputValue(newValue);
    setShowAutocomplete(false);

    requestAnimationFrame(() => {
      if (!promptRef.current) return;
      const nextPos = trigger.rawIndex + prefixSeparator.length + placeholder.length;
      promptRef.current.focus();
      promptRef.current.setSelectionRange(nextPos, nextPos);
    });
  }, [inputValue, commitInputValue]);

  const handleSelectCommand = useCallback((name: string, content: string) => {
    insertTokenAtTrigger("/", { id: createTokenId(), type: "command", name, content });
  }, [insertTokenAtTrigger]);

  const handleSelectSkill = useCallback((name: string, content: string) => {
    insertTokenAtTrigger("/", { id: createTokenId(), type: "skill", name, content });
  }, [insertTokenAtTrigger]);

  const handleSelectFile = useCallback((path: string) => {
    const fileName = path.split(/[\\/]/).pop() || path;
    insertTokenAtTrigger("@", { id: createTokenId(), type: "file", name: fileName, path });
  }, [insertTokenAtTrigger]);

  const handleNavigateFolder = useCallback((folderPath: string) => {
    bridge.listFiles(folderPath)
      .then((entries) => {
        setCurrentFileEntries(entries);
      })
      .catch(console.error);
  }, [bridge]);

  const isInputDisabled = disabled && !isRunning;

  const handleSend = useCallback(() => {
    if (isInputDisabled) return;
    const finalPrompt = serializePrompt(inputValue, tokens, "send");
    const titlePrompt = serializePrompt(inputValue, tokens, "title");
    if (!finalPrompt.trim() || !cwd.trim() || pendingStart) return;

    const currentDisplayTokens = parseDisplayTokens(inputValue, tokens);
    if (sendEvent) {
      onSendMessage?.();
      promptActions.handleSend({
        promptOverride: finalPrompt,
        titleOverride: titlePrompt,
        displayOverride: titlePrompt,
        displayTokensOverride: currentDisplayTokens
      });
    } else {
      onSendMessage?.();
      onStartSession?.({
        promptOverride: finalPrompt,
        titleOverride: titlePrompt,
        displayTokensOverride: currentDisplayTokens
      });
    }

    setInputValue("");
    setTokens([]);
    prevValueRef.current = "";
    setShowAutocomplete(false);
  }, [inputValue, tokens, cwd, pendingStart, promptActions, onStartSession, onSendMessage, sendEvent, isInputDisabled]);

  const handleTokenRemoval = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    removal: { newValue: string; newCursorPos: number },
    tokenIndex: number
  ) => {
    e.preventDefault();
    setTokens((prevTokens) => {
      const nextTokens = prevTokens.slice();
      nextTokens.splice(tokenIndex, 1);
      return nextTokens;
    });
    commitInputValue(removal.newValue);
    requestAnimationFrame(() => {
      if (!promptRef.current) return;
      promptRef.current.setSelectionRange(removal.newCursorPos, removal.newCursorPos);
    });
  }, [commitInputValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace" && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
      const cursorPos = e.currentTarget.selectionStart ?? 0;
      const removal = removePlaceholderBeforeCursor(inputValue, cursorPos);
      if (removal) {
        const tokenIndex = countPlaceholders(inputValue, cursorPos) - 1;
        handleTokenRemoval(e, removal, tokenIndex);
        return;
      }
    }

    if (e.key === "Delete" && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
      const cursorPos = e.currentTarget.selectionStart ?? 0;
      const removal = removePlaceholderAtCursor(inputValue, cursorPos);
      if (removal) {
        const tokenIndex = countPlaceholders(inputValue, cursorPos);
        handleTokenRemoval(e, removal, tokenIndex);
        return;
      }
    }
    if (isInputDisabled) return;

    if (showAutocomplete) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab") {
        return;
      }
      if (e.key === "Escape") {
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
  }, [showAutocomplete, handleSend, inputValue, isInputDisabled, handleTokenRemoval]);

  const handleStop = useCallback(() => {
    promptActions.handleStop();
  }, [promptActions]);

  const togglePlanMode = useCallback(() => {
    setPlanMode(!planMode);
  }, [planMode, setPlanMode]);

  useInputMeasurement({
    inputValue,
    displayTokens,
    promptRef,
    displayRef,
    commitInputValue
  });

  const canSend = inputValue.trim() && cwd.trim() && !pendingStart && !isRunning && !isInputDisabled;

  return (
    <section className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-cream via-surface-cream to-transparent pb-6 px-2 lg:pb-8 pt-8">
      <div ref={inputContainerRef} className="relative mx-auto max-w-full lg:max-w-3xl pr-[6px]">
        <AutocompleteManager
          show={showAutocomplete}
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

        <div className="relative flex flex-col gap-2 rounded-2xl border border-ink-900/10 bg-surface px-4 py-3 shadow-card focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20 transition-colors">
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
                <span>{t("common.newMessages", "新消息")}</span>
              </button>
            </div>
          )}

          {!showNewMessageButton && showScrollToBottomButton && (
            <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none">
              <button
                onClick={onScrollToBottom}
                aria-label={t("common.scrollToBottom", "滚动到底部")}
                className="pointer-events-auto flex items-center justify-center w-9 h-9 rounded-full bg-surface border border-ink-900/10 text-ink-600 shadow-lg transition-colors hover:bg-surface-tertiary hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <label htmlFor="enhanced-prompt-input" className="sr-only">{t("promptInput.sendPrompt")}</label>
            <TokenInputCore
              inputValue={inputValue}
              displayTokens={displayTokens}
              hasDisplayContent={hasDisplayContent}
              placeholderText={placeholderText}
              isInputDisabled={isInputDisabled}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onScroll={handleInputScroll}
              promptRef={promptRef}
              displayRef={displayRef}
            />
            <button
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isRunning ? "bg-error text-white hover:bg-error/90" : "bg-accent text-white hover:bg-accent-hover"}`}
              onClick={isRunning ? handleStop : handleSend}
              disabled={!isRunning && !canSend}
              aria-label={isRunning ? t("promptInput.stopSession") : t("promptInput.sendPrompt")}
            >
              {isRunning ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L16 12l-9.8 1.4-2.8 7.2Z" fill="currentColor" /></svg>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 border-t border-ink-900/5 pt-2">
            <button
              type="button"
              onClick={togglePlanMode}
              aria-label={planMode ? t("accessibility.disablePlanMode", "禁用计划模式") : t("accessibility.enablePlanMode", "启用计划模式")}
              aria-pressed={planMode}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${planMode
                ? "bg-accent/10 text-accent border border-accent/30"
                : "text-muted hover:bg-surface-tertiary hover:text-ink-700 border border-transparent"
                }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {t("welcomePage.planMode", "计划模式")}
            </button>

            {planMode && (
              <span className="text-xs text-muted">
                {t("welcomePage.planModeHint", "Agent 将先制定计划再执行")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
