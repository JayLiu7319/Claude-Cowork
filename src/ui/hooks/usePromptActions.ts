import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { ClientEvent, InputToken } from "../types";

const DEFAULT_ALLOWED_TOOLS = "Read,Edit,Bash";
const MAX_FALLBACK_TITLE_WORDS = 6;

function buildFallbackTitle(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return "New Session";
    const words = trimmed.split(/\s+/).slice(0, MAX_FALLBACK_TITLE_WORDS);
    return words.join(" ");
}

type SendOptions = {
    promptOverride?: string;
    titleOverride?: string;
    displayOverride?: string;
    displayTokensOverride?: InputToken[];
};

export function usePromptActions(sendEvent: (event: ClientEvent) => void) {
    const { t } = useTranslation();
    const prompt = useAppStore((state) => state.prompt);
    const cwd = useAppStore((state) => state.cwd);
    const activeSessionId = useAppStore((state) => state.activeSessionId);
    const sessions = useAppStore((state) => state.sessions);
    const setPrompt = useAppStore((state) => state.setPrompt);
    const setPendingStart = useAppStore((state) => state.setPendingStart);
    const setGlobalError = useAppStore((state) => state.setGlobalError);

    const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
    const isRunning = activeSession?.status === "running";

    const handleSend = useCallback(async (options?: SendOptions) => {
        const promptForSend = (options?.promptOverride ?? prompt).trim();
        const promptForTitle = (options?.titleOverride ?? options?.promptOverride ?? prompt).trim();
        const displayPrompt = (options?.displayOverride ?? options?.titleOverride ?? options?.promptOverride ?? prompt).trim();
        const displayTokens = options?.displayTokensOverride;
        if (!promptForSend) return;

        if (!activeSessionId) {
            const fallbackTitle = buildFallbackTitle(promptForTitle);
            try {
                setPendingStart(true);
            } catch (error) {
                console.error(error);
            }
            sendEvent({
                type: "session.start",
                payload: {
                    title: fallbackTitle,
                    prompt: promptForSend,
                    displayPrompt,
                    displayTokens,
                    cwd: cwd.trim() || undefined,
                    allowedTools: DEFAULT_ALLOWED_TOOLS
                }
            });
            (async () => {

                try {
                    const title = await window.electron.generateSessionTitle(promptForTitle);
                    const currentSessionId = useAppStore.getState().activeSessionId;
                    if (!currentSessionId || !title.trim() || title === fallbackTitle) return;
                    sendEvent({ type: "session.rename", payload: { sessionId: currentSessionId, title } });
                } catch (error) {
                    console.error(error);
                }
            })();
        } else {
            if (activeSession?.status === "running") {
                setGlobalError(t('promptInput.sessionRunning'));
                return;
            }
            sendEvent({ type: "session.continue", payload: { sessionId: activeSessionId, prompt: promptForSend, displayPrompt, displayTokens } });
        }
        setPrompt("");
    }, [activeSession, activeSessionId, cwd, prompt, sendEvent, setGlobalError, setPendingStart, setPrompt, t]);

    const handleStop = useCallback(() => {
        if (!activeSessionId) return;
        sendEvent({ type: "session.stop", payload: { sessionId: activeSessionId } });
    }, [activeSessionId, sendEvent]);

    const handleStartFromModal = useCallback((options?: SendOptions) => {
        if (!cwd.trim()) {
            setGlobalError(t('promptInput.cwdRequired'));
            return;
        }
        handleSend(options);
    }, [cwd, handleSend, setGlobalError, t]);

    return { prompt, setPrompt, isRunning, handleSend, handleStop, handleStartFromModal };
}
