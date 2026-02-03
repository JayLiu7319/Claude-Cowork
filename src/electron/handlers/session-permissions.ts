import type { ClientEvent } from "../types.js";
import { getSessionStore } from "../libs/session/index.js";

export function handlePermissionResponse(event: Extract<ClientEvent, { type: "permission.response" }>) {
  const sessions = getSessionStore();
  const session = sessions.getSession(event.payload.sessionId);
  if (!session) return;

  const pending = session.pendingPermissions.get(event.payload.toolUseId);
  if (pending) {
    pending.resolve(event.payload.result);
  }
}
