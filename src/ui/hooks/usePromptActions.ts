import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { ClientEvent } from "../types";

const DEFAULT_ALLOWED_TOOLS = "Read,Edit,Bash";
const MAX_FALLBACK_TITLE_WORDS = 6;

function buildFallbackTitle(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return "New Session";
    const words = trimmed.split(/\s+/).slice(0, MAX_FALLBACK_TITLE_WORDS);
    return words.join(" ");
}

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

    const handleSend = useCallback(async () => {
        if (!prompt.trim()) return;

        if (!activeSessionId) {
            const fallbackTitle = buildFallbackTitle(prompt);
            try {
                setPendingStart(true);
            } catch (error) {
                console.error(error);
            }
            sendEvent({
                type: "session.start",
                payload: { title: fallbackTitle, prompt, cwd: cwd.trim() || undefined, allowedTools: DEFAULT_ALLOWED_TOOLS }
            });
            (async () => {

                try {
                    const title = await window.electron.generateSessionTitle(prompt);
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
            sendEvent({ type: "session.continue", payload: { sessionId: activeSessionId, prompt } });
        }
        setPrompt("");
    }, [activeSession, activeSessionId, cwd, prompt, sendEvent, setGlobalError, setPendingStart, setPrompt, t]);

    const handleStop = useCallback(() => {
        if (!activeSessionId) return;
        sendEvent({ type: "session.stop", payload: { sessionId: activeSessionId } });
    }, [activeSessionId, sendEvent]);

    const handleStartFromModal = useCallback(() => {
        if (!cwd.trim()) {
            setGlobalError(t('promptInput.cwdRequired'));
            return;
        }
        handleSend();
    }, [cwd, handleSend, setGlobalError, t]);

    return { prompt, setPrompt, isRunning, handleSend, handleStop, handleStartFromModal };
}
