import log from "electron-log";
import type { ClientEvent } from "../types.js";
import { getSessionStore, getRunnerHandles } from "../libs/session/index.js";
import { emit } from "../services/server-event-emitter.js";
import { cancelRightPanelUpdate } from "../aggregators/right-panel-aggregator.js";
import { aggregateTodos, aggregateFileChanges, updateFileTreeWithOperations } from "../../shared/index.js";

export function handleListSessions() {
  const sessions = getSessionStore();
  emit({
    type: "session.list",
    payload: { sessions: sessions.listSessions() }
  });
}

export function handleSessionHistory(event: Extract<ClientEvent, { type: "session.history" }>) {
  const sessions = getSessionStore();
  const history = sessions.getSessionHistory(event.payload.sessionId);

  if (!history) {
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

  const session = sessions.getSession(event.payload.sessionId);
  if (session) {
    const todos = aggregateTodos(history.messages);
    const fileChanges = aggregateFileChanges(history.messages, session.fileTree);
    const fileTree = updateFileTreeWithOperations(session.fileTree, fileChanges);

    session.todos = todos;
    session.fileChanges = fileChanges;
    session.fileTree = fileTree;

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
    emit({
      type: "rightpanel.filetree",
      payload: { sessionId: session.id, tree: fileTree }
    });
  }
}

export function handleSessionDelete(event: Extract<ClientEvent, { type: "session.delete" }>) {
  const sessions = getSessionStore();
  const runnerHandles = getRunnerHandles();
  const sessionId = event.payload.sessionId;

  cancelRightPanelUpdate(sessionId);

  const handle = runnerHandles.get(sessionId);
  if (handle) {
    handle.abort();
    runnerHandles.delete(sessionId);
  }

  log.info(`[Session] Deleting session: ${sessionId}`);
  sessions.deleteSession(sessionId);
  emit({
    type: "session.deleted",
    payload: { sessionId }
  });
}

export function handleSessionRename(event: Extract<ClientEvent, { type: "session.rename" }>) {
  const sessions = getSessionStore();
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
}
