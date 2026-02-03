import type { ServerEvent } from "../types.js";
import { broadcast } from "./broadcast-service.js";
import { updateSessionState } from "./session-state-updater.js";

export function emit(event: ServerEvent) {
  if (!updateSessionState(event)) {
    return;
  }
  broadcast(event);
}
