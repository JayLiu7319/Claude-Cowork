import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { ClientEvent } from "../types";

const DEFAULT_ALLOWED_TOOLS = "Read,Edit,Bash";

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
            let title = "";
            try {
                setPendingStart(true);
                title = await window.electron.generateSessionTitle(prompt);
            } catch (error) {
                console.error(error);
                setPendingStart(false);
                setGlobalError(t('promptInput.titleError'));
                return;
            }
            sendEvent({
                type: "session.start",
                payload: { title, prompt, cwd: cwd.trim() || undefined, allowedTools: DEFAULT_ALLOWED_TOOLS }
            });
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
