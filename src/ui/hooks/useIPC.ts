import { useCallback, useEffect, useRef, useState } from "react";
import type { ServerEvent, ClientEvent } from "@ui/types";
import { useElectronBridge } from "@ui/hooks/useElectronBridge";
import { errorService } from "@ui/services/error-service";

export function useIPC(onEvent: (event: ServerEvent) => void) {
  const [connected, setConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const bridge = useElectronBridge();

  useEffect(() => {
    // Subscribe to server events via bridge
    const unsubscribe = bridge.onServerEvent((event: ServerEvent) => {
      onEvent(event);
    });

    unsubscribeRef.current = unsubscribe;
    setTimeout(() => setConnected(true), 0);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setConnected(false);
    };
  }, [onEvent, bridge]);

  const sendEvent = useCallback((event: ClientEvent) => {
    try {
      bridge.sendClientEvent(event);
    } catch (error) {
      errorService.reportError(error as Error, { action: 'sendEvent', eventType: event.type });
    }
  }, [bridge]);

  return { connected, sendEvent };
}

