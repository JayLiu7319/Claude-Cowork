import { getSessionStore } from "../libs/session/index.js";
import { broadcast } from "../services/broadcast-service.js";
import { aggregateTodos, aggregateFileChanges, updateFileTreeWithOperations } from "../../shared/index.js";

const rightPanelUpdateTimers = new Map<string, NodeJS.Timeout>();

export function scheduleRightPanelUpdate(sessionId: string) {
  const existingTimer = rightPanelUpdateTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    const sessions = getSessionStore();
    const session = sessions.getSession(sessionId);
    if (!session) return;

    const history = sessions.getSessionHistory(sessionId);
    if (!history) return;

    const todos = aggregateTodos(history.messages);
    const fileChanges = aggregateFileChanges(history.messages, session.fileTree);
    const fileTree = updateFileTreeWithOperations(session.fileTree, fileChanges);

    session.todos = todos;
    session.fileChanges = fileChanges;
    session.fileTree = fileTree;

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

    rightPanelUpdateTimers.delete(sessionId);
  }, 300);

  rightPanelUpdateTimers.set(sessionId, timer);
}

export function cancelRightPanelUpdate(sessionId: string) {
  const timer = rightPanelUpdateTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    rightPanelUpdateTimers.delete(sessionId);
  }
}
