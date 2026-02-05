import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@ui/store/useAppStore";
import type { ClientEvent, InputToken, FileEntry } from "@ui/types";
import { usePromptActions } from "@ui/hooks/usePromptActions";
import { useElectronBridge } from "@ui/hooks/useElectronBridge";
import { TooltipProvider } from "@ui/components/ui/Tooltip";
import { AutocompleteManager } from "./AutocompleteManager";
import { TiptapEditor, type TiptapEditorRef, type TokenNodeAttrs } from "./TiptapEditor";

// Stable noop function reference to prevent unnecessary re-renders
const NOOP_SEND_EVENT = () => { };

interface EnhancedPromptInputProps {
  onStartSession?: (options?: {
    promptOverride?: string;
    titleOverride?: string;
    displayTokensOverride?: InputToken[];
  }) => void;
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
  onScrollToBottom,
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

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteMode, setAutocompleteMode] = useState<"commands-skills" | "files">("commands-skills");
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [currentFileEntries, setCurrentFileEntries] = useState<FileEntry[]>([]);
  const [currentContent, setCurrentContent] = useState<{ text: string; tokens: InputToken[] }>({
    text: "",
    tokens: [],
  });

  const editorRef = useRef<TiptapEditorRef>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const promptActions = usePromptActions(sendEvent || NOOP_SEND_EVENT);
  const isRunning = promptActions.isRunning;
  const placeholderText = t("welcomePage.inputPlaceholder", "输入 / 使用技能，描述您的任务…");

  // Load commands and skills on mount
  useEffect(() => {
    Promise.all([bridge.loadCommands(), bridge.loadSkills()])
      .then(([commands, skills]) => {
        useAppStore.getState().setAvailableCommands(commands);
        useAppStore.getState().setAvailableSkills(skills);
      })
      .catch(console.error);
  }, [bridge]);

  // Load file entries when cwd changes
  useEffect(() => {
    if (!cwd) return;
    bridge
      .listFiles(cwd)
      .then((entries) => setCurrentFileEntries(entries))
      .catch(() => setCurrentFileEntries([]));
  }, [cwd, bridge]);

  // Handle editor content updates
  const handleEditorUpdate = useCallback((content: { text: string; tokens: InputToken[] }) => {
    setCurrentContent(content);
  }, []);

  // Handle trigger detection (/ or @)
  const handleTrigger = useCallback(
    (trigger: { char: "/" | "@"; query: string; position: number } | null) => {
      if (trigger) {
        setAutocompleteFilter(trigger.query);
        setAutocompleteMode(trigger.char === "/" ? "commands-skills" : "files");
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    },
    []
  );

  // Build serialized prompt for sending
  const serializeForSend = useCallback((tokens: InputToken[]): string => {
    return tokens
      .map((token) => {
        if (token.type === "text") return token.value;
        if (token.type === "command") return token.content;
        if (token.type === "skill") return token.content;
        if (token.type === "file") return token.path;
        return "";
      })
      .join("");
  }, []);

  // Build serialized prompt for title display
  const serializeForTitle = useCallback((tokens: InputToken[]): string => {
    return tokens
      .map((token) => {
        if (token.type === "text") return token.value;
        if (token.type === "command") return `/${token.name}`;
        if (token.type === "skill") return `@${token.name}`;
        if (token.type === "file") return `@${token.name}`;
        return "";
      })
      .join("");
  }, []);

  const isInputDisabled = disabled && !isRunning;

  const handleSend = useCallback(() => {
    if (isInputDisabled) return;
    const { tokens } = currentContent;
    const finalPrompt = serializeForSend(tokens);
    const titlePrompt = serializeForTitle(tokens);
    if (!finalPrompt.trim() || !cwd.trim() || pendingStart) return;

    if (sendEvent) {
      onSendMessage?.();
      promptActions.handleSend({
        promptOverride: finalPrompt,
        titleOverride: titlePrompt,
        displayOverride: titlePrompt,
        displayTokensOverride: tokens,
      });
    } else {
      onSendMessage?.();
      onStartSession?.({
        promptOverride: finalPrompt,
        titleOverride: titlePrompt,
        displayTokensOverride: tokens,
      });
    }

    // Clear editor
    editorRef.current?.clear();
    setCurrentContent({ text: "", tokens: [] });
    setShowAutocomplete(false);
  }, [
    currentContent,
    cwd,
    pendingStart,
    promptActions,
    onStartSession,
    onSendMessage,
    sendEvent,
    isInputDisabled,
    serializeForSend,
    serializeForTitle,
  ]);

  const handleSelectCommand = useCallback(
    async (name: string) => {
      // Read actual content from file
      const cmd = availableCommands.find((c) => c.name === name);
      const content = cmd ? (await bridge.readCommandContent(cmd.filePath)) || "" : "";

      const attrs: TokenNodeAttrs = {
        id: `cmd-${Date.now()}`,
        label: name,
        tokenType: "command",
        content,
      };
      editorRef.current?.insertToken(attrs);
      setShowAutocomplete(false);
      editorRef.current?.focus();
    },
    [availableCommands, bridge]
  );

  const handleSelectSkill = useCallback(
    async (name: string) => {
      // Read actual content from file
      const skill = availableSkills.find((s) => s.name === name);
      const content = skill ? (await bridge.readSkillContent(skill.filePath)) || "" : "";

      const attrs: TokenNodeAttrs = {
        id: `skill-${Date.now()}`,
        label: name,
        tokenType: "skill",
        content,
      };
      editorRef.current?.insertToken(attrs);
      setShowAutocomplete(false);
      editorRef.current?.focus();
    },
    [availableSkills, bridge]
  );

  const handleSelectFile = useCallback((path: string) => {
    const fileName = path.split(/[\\/]/).pop() || path;
    const attrs: TokenNodeAttrs = {
      id: `file-${Date.now()}`,
      label: fileName,
      tokenType: "file",
      path,
    };
    editorRef.current?.insertToken(attrs);
    setShowAutocomplete(false);
    editorRef.current?.focus();
  }, []);

  const handleNavigateFolder = useCallback(
    (folderPath: string) => {
      bridge
        .listFiles(folderPath)
        .then((entries) => setCurrentFileEntries(entries))
        .catch(console.error);
    },
    [bridge]
  );

  const handleStop = useCallback(() => {
    promptActions.handleStop();
  }, [promptActions]);

  const togglePlanMode = useCallback(() => {
    setPlanMode(!planMode);
  }, [planMode, setPlanMode]);

  const canSend =
    currentContent.text.trim() && cwd.trim() && !pendingStart && !isRunning && !isInputDisabled;

  return (
    <TooltipProvider>
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
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-end gap-3">
              <label htmlFor="enhanced-prompt-input" className="sr-only">
                {t("promptInput.sendPrompt")}
              </label>
              <TiptapEditor
                ref={editorRef}
                placeholder={placeholderText}
                disabled={isInputDisabled}
                isAutocompleteOpen={showAutocomplete}
                onUpdate={handleEditorUpdate}
                onTrigger={handleTrigger}
                onSubmit={handleSend}
              />
              <button
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isRunning
                  ? "bg-error text-white hover:bg-error/90"
                  : "bg-accent text-white hover:bg-accent-hover"
                  }`}
                onClick={isRunning ? handleStop : handleSend}
                disabled={!isRunning && !canSend}
                aria-label={
                  isRunning ? t("promptInput.stopSession") : t("promptInput.sendPrompt")
                }
              >
                {isRunning ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L16 12l-9.8 1.4-2.8 7.2Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 border-t border-ink-900/5 pt-2">
              <button
                type="button"
                onClick={togglePlanMode}
                aria-label={
                  planMode
                    ? t("accessibility.disablePlanMode", "禁用计划模式")
                    : t("accessibility.enablePlanMode", "启用计划模式")
                }
                aria-pressed={planMode}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${planMode
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-muted hover:bg-surface-tertiary hover:text-ink-700 border border-transparent"
                  }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
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
    </TooltipProvider>
  );
}
