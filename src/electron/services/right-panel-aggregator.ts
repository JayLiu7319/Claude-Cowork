import { getSessionStore } from "./session-instance.js";
import { broadcast } from "./broadcast-service.js";
import { aggregateTodos } from "../libs/todo-extractor.js";
import { aggregateFileChanges } from "../libs/file-change-extractor.js";
import { updateFileTreeWithOperations } from "../libs/file-tree-builder.js";

// Debounce timers for right panel updates to avoid excessive aggregation during streaming
const rightPanelUpdateTimers = new Map<string, NodeJS.Timeout>();

/**
 * Schedule a debounced right panel update for a session.
 * This prevents excessive aggregation during streaming - instead of aggregating
 * on every token (1000+ times), we aggregate once after 300ms of inactivity.
 */
export function scheduleRightPanelUpdate(sessionId: string) {
    // Clear any existing timer for this session
    const existingTimer = rightPanelUpdateTimers.get(sessionId);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // Schedule aggregation to run after 300ms of no new events
    const timer = setTimeout(() => {
        const sessions = getSessionStore();
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
export function cancelRightPanelUpdate(sessionId: string) {
    const timer = rightPanelUpdateTimers.get(sessionId);
    if (timer) {
        clearTimeout(timer);
        rightPanelUpdateTimers.delete(sessionId);
    }
}
