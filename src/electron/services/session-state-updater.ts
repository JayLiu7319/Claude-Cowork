import type { ServerEvent } from "../types.js";
import { getSessionStore } from "../libs/session-instance.js";
import { scheduleRightPanelUpdate } from "../aggregators/right-panel-aggregator.js";

function hasLiveSession(sessionId: string): boolean {
  const sessions = getSessionStore();
  return Boolean(sessions.getSession(sessionId));
}

export function updateSessionState(event: ServerEvent): boolean {
  const sessions = getSessionStore();

  if (
    (event.type === "session.status" ||
      event.type === "stream.message" ||
      event.type === "stream.user_prompt" ||
      event.type === "permission.request") &&
    !hasLiveSession(event.payload.sessionId)
  ) {
    return false;
  }

  if (event.type === "session.status") {
    sessions.updateSession(event.payload.sessionId, { status: event.payload.status });
  }
  if (event.type === "stream.message") {
    sessions.recordMessage(event.payload.sessionId, event.payload.message);
    scheduleRightPanelUpdate(event.payload.sessionId);
  }
  if (event.type === "stream.user_prompt") {
    sessions.recordMessage(event.payload.sessionId, {
      type: "user_prompt",
      prompt: event.payload.prompt,
      displayPrompt: event.payload.displayPrompt,
      displayTokens: event.payload.displayTokens
    });
  }

  return true;
}
