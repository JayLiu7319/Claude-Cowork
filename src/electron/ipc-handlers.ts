import { BrowserWindow, shell } from "electron";
import type { ClientEvent, ServerEvent } from "./types.js";
import { runClaude, type RunnerHandle } from "./libs/runner.js";
import { SessionStore } from "./libs/session-store.js";
import { app } from "electron";
import { join } from "path";
import log from 'electron-log';
import { t } from "./i18n.js";
import { aggregateTodos } from "./libs/todo-extractor.js";
import { aggregateFileChanges } from "./libs/file-change-extractor.js";
import { updateFileTreeWithOperations } from "./libs/file-tree-builder.js";
import { resolveFilePath } from "./util.js";

let sessions: SessionStore;
const runnerHandles = new Map<string, RunnerHandle>();
// Debounce timers for right panel updates to avoid excessive aggregation during streaming
const rightPanelUpdateTimers = new Map<string, NodeJS.Timeout>();

function initializeSessions() {
  if (!sessions) {
    const DB_PATH = join(app.getPath("userData"), "sessions.db");
    log.info(`Initializing SessionStore at ${DB_PATH}`);
    sessions = new SessionStore(DB_PATH);
  }
  return sessions;
}

/**
 * Schedule a debounced right panel update for a session.
 * This prevents excessive aggregation during streaming - instead of aggregating
 * on every token (1000+ times), we aggregate once after 300ms of inactivity.
 */
function scheduleRightPanelUpdate(sessionId: string) {
  // Clear any existing timer for this session
  const existingTimer = rightPanelUpdateTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule aggregation to run after 300ms of no new events
  const timer = setTimeout(() => {
    const session = sessions.getSession(sessionId);
    if (!session) return;

    const history = sessions.getSessionHistory(sessionId);
    if (!history) return;

    // Perform aggregation once instead of 1000+ times
    const todos = aggregateTodos(history.messages);
    const fileChanges = aggregateFileChanges(history.messages, session.fileTree);
    const fileTree = updateFileTreeWithOperations(session.fileTree, fileChanges);

    // Update session cache
    session.todos = todos;
    session.fileChanges = fileChanges;
    session.fileTree = fileTree;

    // Broadcast updates to UI
    if (todos.length > 0) {
      broadcast({
        type: "rightpanel.todos",
        payload: { sessionId, todos }
      });
    }
    if (fileChanges.length > 0) {
      broadcast({
        type: "rightpanel.filechanges",
        payload: { sessionId, changes: fileChanges }
      });
    }
    broadcast({
      type: "rightpanel.filetree",
      payload: { sessionId, tree: fileTree }
    });

    // Clean up timer reference
    rightPanelUpdateTimers.delete(sessionId);
  }, 300); // 300ms debounce delay

  rightPanelUpdateTimers.set(sessionId, timer);
}

/**
 * Cancel any pending right panel update for a session.
 * Used when session is stopped or deleted to prevent stale updates.
 */
function cancelRightPanelUpdate(sessionId: string) {
  const timer = rightPanelUpdateTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    rightPanelUpdateTimers.delete(sessionId);
  }
}

function broadcast(event: ServerEvent) {
  const payload = JSON.stringify(event);
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send("server-event", payload);
  }
}

function hasLiveSession(sessionId: string): boolean {
  if (!sessions) return false;
  return Boolean(sessions.getSession(sessionId));
}

function emit(event: ServerEvent) {
  // If a session was deleted, drop late events that would resurrect it in the UI.
  // (Session history lookups are DB-backed, so these late events commonly lead to "Unknown session".)
  if (
    (event.type === "session.status" ||
      event.type === "stream.message" ||
      event.type === "stream.user_prompt" ||
      event.type === "permission.request") &&
    !hasLiveSession(event.payload.sessionId)
  ) {
    return;
  }

  if (event.type === "session.status") {
    sessions.updateSession(event.payload.sessionId, { status: event.payload.status });
  }
  if (event.type === "stream.message") {
    sessions.recordMessage(event.payload.sessionId, event.payload.message);

    // Schedule debounced right panel update instead of immediate aggregation.
    // This dramatically improves performance during streaming by aggregating
    // once after streaming stops instead of 1000+ times during streaming.
    scheduleRightPanelUpdate(event.payload.sessionId);
  }
  if (event.type === "stream.user_prompt") {
    sessions.recordMessage(event.payload.sessionId, {
      type: "user_prompt",
      prompt: event.payload.prompt
    });
  }
  broadcast(event);
}

export function handleClientEvent(event: ClientEvent) {
  // Initialize sessions on first event
  const sessions = initializeSessions();

  if (event.type !== "session.history" && event.type !== "session.list") {
    log.info(`[ClientEvent] ${event.type}`, event.type === 'session.start' || event.type === 'session.continue' ? event.payload : '');
  }

  if (event.type === "session.list") {
    emit({
      type: "session.list",
      payload: { sessions: sessions.listSessions() }
    });
    return;
  }

  if (event.type === "session.history") {
    const history = sessions.getSessionHistory(event.payload.sessionId);
    if (!history) {
      // Session may have been deleted (or deleted concurrently). Treat as a sync event rather than an error toast.
      emit({ type: "session.deleted", payload: { sessionId: event.payload.sessionId } });
      return;
    }
    emit({
      type: "session.history",
      payload: {
        sessionId: history.session.id,
        status: history.session.status,
        messages: history.messages
      }
    });

    // Populate Right Panel Data immediately after loading history
    const session = sessions.getSession(event.payload.sessionId);
    if (session) {
      // Re-aggregate data to ensure it's up to date
      const todos = aggregateTodos(history.messages);
      const fileChanges = aggregateFileChanges(history.messages, session.fileTree);
      const fileTree = updateFileTreeWithOperations(session.fileTree, fileChanges);

      // Update session cache
      session.todos = todos;
      session.fileChanges = fileChanges;
      session.fileTree = fileTree;

      // Broadcast right panel events
      if (todos.length > 0) {
        emit({
          type: "rightpanel.todos",
          payload: { sessionId: session.id, todos }
        });
      }
      if (fileChanges.length > 0) {
        emit({
          type: "rightpanel.filechanges",
          payload: { sessionId: session.id, changes: fileChanges }
        });
      }
      // Always send file tree, even if empty/null, to ensure UI is in sync
      emit({
        type: "rightpanel.filetree",
        payload: { sessionId: session.id, tree: fileTree }
      });
    }

    return;
  }

  if (event.type === "session.start") {
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
      payload: { sessionId: session.id, prompt: event.payload.prompt }
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

    return;
  }

  if (event.type === "session.rename") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) {
      emit({ type: "session.deleted", payload: { sessionId: event.payload.sessionId } });
      return;
    }
    sessions.updateSession(session.id, { title: event.payload.title });
    emit({
      type: "session.status",
      payload: { sessionId: session.id, status: session.status, title: event.payload.title, cwd: session.cwd }
    });
    return;
  }

  if (event.type === "session.continue") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) {
      emit({ type: "session.deleted", payload: { sessionId: event.payload.sessionId } });
      emit({
        type: "runner.error",
        payload: { sessionId: event.payload.sessionId, message: t('session.noLongerExists') }
      });
      return;
    }

    if (!session.claudeSessionId) {
      emit({
        type: "runner.error",
        payload: { sessionId: session.id, message: t('session.noResumeId') }
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
      payload: { sessionId: session.id, prompt: event.payload.prompt }
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

    return;
  }

  if (event.type === "session.stop") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) return;

    // Cancel any pending right panel updates for this session
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
    return;
  }

  if (event.type === "session.delete") {
    const sessionId = event.payload.sessionId;

    // Cancel any pending right panel updates for this session
    cancelRightPanelUpdate(sessionId);

    const handle = runnerHandles.get(sessionId);
    if (handle) {
      handle.abort();
      runnerHandles.delete(sessionId);
    }

    // Always try to delete and emit deleted event
    // Don't emit error if session doesn't exist - it may have already been deleted
    log.info(`[Session] Deleting session: ${sessionId}`);
    sessions.deleteSession(sessionId);
    emit({
      type: "session.deleted",
      payload: { sessionId }
    });
    return;
  }

  if (event.type === "permission.response") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) return;

    const pending = session.pendingPermissions.get(event.payload.toolUseId);
    if (pending) {
      pending.resolve(event.payload.result);
    }
    return;
  }

  if (event.type === "file.open") {
    const session = sessions.getSession(event.payload.sessionId);
    if (session && session.cwd) {
      // Use resolveFilePath to handle both relative and absolute paths correctly
      const absolutePath = resolveFilePath(event.payload.path, session.cwd);
      shell.showItemInFolder(absolutePath);
    }
    return;
  }
}

export function cleanupAllSessions(): void {
  for (const [, handle] of runnerHandles) {
    handle.abort();
  }
  runnerHandles.clear();
  if (sessions) {
    sessions.close();
  }
}

export { sessions };
