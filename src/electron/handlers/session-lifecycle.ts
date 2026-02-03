import log from "electron-log";
import { runClaude } from "../libs/runner/index.js";
import { t } from "../i18n.js";
import type { ClientEvent } from "../types.js";
import { getSessionStore, getRunnerHandles } from "../libs/session-instance.js";
import { emit } from "../services/server-event-emitter.js";
import { cancelRightPanelUpdate } from "../aggregators/right-panel-aggregator.js";

export function handleSessionStart(event: Extract<ClientEvent, { type: "session.start" }>) {
  const sessions = getSessionStore();
  const runnerHandles = getRunnerHandles();

  const session = sessions.createSession({
    cwd: event.payload.cwd,
    title: event.payload.title,
    allowedTools: event.payload.allowedTools,
    prompt: event.payload.prompt
  });

  log.info(`[Session] Starting new session: ${session.id} (Title: ${session.title})`);

  sessions.updateSession(session.id, {
    status: "running",
    lastPrompt: event.payload.prompt
  });
  emit({
    type: "session.status",
    payload: { sessionId: session.id, status: "running", title: session.title, cwd: session.cwd }
  });

  emit({
    type: "stream.user_prompt",
    payload: {
      sessionId: session.id,
      prompt: event.payload.prompt,
      displayPrompt: event.payload.displayPrompt ?? event.payload.prompt,
      displayTokens: event.payload.displayTokens
    }
  });

  runClaude({
    prompt: event.payload.prompt,
    session,
    resumeSessionId: session.claudeSessionId,
    onEvent: emit,
    onSessionUpdate: (updates) => {
      sessions.updateSession(session.id, updates);
    }
  })
    .then((handle) => {
      runnerHandles.set(session.id, handle);
      sessions.setAbortController(session.id, undefined);
    })
    .catch((error) => {
      sessions.updateSession(session.id, { status: "error" });
      emit({
        type: "session.status",
        payload: {
          sessionId: session.id,
          status: "error",
          title: session.title,
          cwd: session.cwd,
          error: String(error)
        }
      });
      log.error(`[Session] Error in session ${session.id}:`, error);
    });
}

export function handleSessionContinue(event: Extract<ClientEvent, { type: "session.continue" }>) {
  const sessions = getSessionStore();
  const runnerHandles = getRunnerHandles();

  const session = sessions.getSession(event.payload.sessionId);
  if (!session) {
    emit({ type: "session.deleted", payload: { sessionId: event.payload.sessionId } });
    emit({
      type: "runner.error",
      payload: { sessionId: event.payload.sessionId, message: t("session.noLongerExists") }
    });
    return;
  }

  if (!session.claudeSessionId) {
    emit({
      type: "runner.error",
      payload: { sessionId: session.id, message: t("session.noResumeId") }
    });
    return;
  }

  log.info(`[Session] Continuing session: ${session.id}`);

  sessions.updateSession(session.id, { status: "running", lastPrompt: event.payload.prompt });
  emit({
    type: "session.status",
    payload: { sessionId: session.id, status: "running", title: session.title, cwd: session.cwd }
  });

  emit({
    type: "stream.user_prompt",
    payload: {
      sessionId: session.id,
      prompt: event.payload.prompt,
      displayPrompt: event.payload.displayPrompt ?? event.payload.prompt,
      displayTokens: event.payload.displayTokens
    }
  });

  runClaude({
    prompt: event.payload.prompt,
    session,
    resumeSessionId: session.claudeSessionId,
    onEvent: emit,
    onSessionUpdate: (updates) => {
      sessions.updateSession(session.id, updates);
    }
  })
    .then((handle) => {
      runnerHandles.set(session.id, handle);
    })
    .catch((error) => {
      sessions.updateSession(session.id, { status: "error" });
      emit({
        type: "session.status",
        payload: {
          sessionId: session.id,
          status: "error",
          title: session.title,
          cwd: session.cwd,
          error: String(error)
        }
      });
      log.error(`[Session] Error in continuing session ${session.id}:`, error);
    });
}

export function handleSessionStop(event: Extract<ClientEvent, { type: "session.stop" }>) {
  const sessions = getSessionStore();
  const runnerHandles = getRunnerHandles();

  const session = sessions.getSession(event.payload.sessionId);
  if (!session) return;

  cancelRightPanelUpdate(event.payload.sessionId);

  const handle = runnerHandles.get(session.id);
  if (handle) {
    handle.abort();
    runnerHandles.delete(session.id);
  }

  sessions.updateSession(session.id, { status: "idle" });
  log.info(`[Session] Stopped session: ${event.payload.sessionId}`);
  emit({
    type: "session.status",
    payload: { sessionId: session.id, status: "idle", title: session.title, cwd: session.cwd }
  });
}
