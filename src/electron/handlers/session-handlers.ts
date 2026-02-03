import log from 'electron-log';
import { runClaude } from "../libs/runner.js";
import { t } from "../i18n.js";
import type { ClientEvent } from "../types.js";
import { getSessionStore, getRunnerHandles } from "../services/session-instance.js";
import { emit } from "../services/broadcast-service.js";
import { cancelRightPanelUpdate } from "../services/right-panel-aggregator.js";
import { aggregateTodos } from "../libs/todo-extractor.js";
import { aggregateFileChanges } from "../libs/file-change-extractor.js";
import { updateFileTreeWithOperations } from "../libs/file-tree-builder.js";

// Session List Handler
export function handleListSessions() {
    const sessions = getSessionStore();
    emit({
        type: "session.list",
        payload: { sessions: sessions.listSessions() }
    });
}

// Session History Handler
export function handleSessionHistory(event: Extract<ClientEvent, { type: 'session.history' }>) {
    const sessions = getSessionStore();
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
}

// Session Start Handler
export function handleSessionStart(event: Extract<ClientEvent, { type: 'session.start' }>) {
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

// Session Continue Handler
export function handleSessionContinue(event: Extract<ClientEvent, { type: 'session.continue' }>) {
    const sessions = getSessionStore();
    const runnerHandles = getRunnerHandles();

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

// Session Stop Handler
export function handleSessionStop(event: Extract<ClientEvent, { type: 'session.stop' }>) {
    const sessions = getSessionStore();
    const runnerHandles = getRunnerHandles();

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
}

// Session Delete Handler
export function handleSessionDelete(event: Extract<ClientEvent, { type: 'session.delete' }>) {
    const sessions = getSessionStore();
    const runnerHandles = getRunnerHandles();
    const sessionId = event.payload.sessionId;

    // Cancel any pending right panel updates for this session
    cancelRightPanelUpdate(sessionId);

    const handle = runnerHandles.get(sessionId);
    if (handle) {
        handle.abort();
        runnerHandles.delete(sessionId);
    }

    // Always try to delete and emit deleted event
    log.info(`[Session] Deleting session: ${sessionId}`);
    sessions.deleteSession(sessionId);
    emit({
        type: "session.deleted",
        payload: { sessionId }
    });
}

// Session Rename Handler
export function handleSessionRename(event: Extract<ClientEvent, { type: 'session.rename' }>) {
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

// Permission Response Handler
export function handlePermissionResponse(event: Extract<ClientEvent, { type: 'permission.response' }>) {
    const sessions = getSessionStore();
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) return;

    const pending = session.pendingPermissions.get(event.payload.toolUseId);
    if (pending) {
        pending.resolve(event.payload.result);
    }
}
