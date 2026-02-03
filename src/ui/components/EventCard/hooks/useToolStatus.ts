import { useEffect, useState } from "react";
import type { ToolStatus } from "../types";
import { toolStatusMap, toolStatusListeners } from "../utils/toolStatusManager";

/**
 * Hook to subscribe to tool status changes.
 * Returns the current status of a tool execution.
 */
export function useToolStatus(toolUseId: string | undefined): ToolStatus | undefined {
    const [status, setStatus] = useState<ToolStatus | undefined>(() =>
        toolUseId ? toolStatusMap.get(toolUseId) : undefined
    );

    useEffect(() => {
        if (!toolUseId) return;
        const handleUpdate = () => setStatus(toolStatusMap.get(toolUseId));
        toolStatusListeners.add(handleUpdate);
        return () => {
            toolStatusListeners.delete(handleUpdate);
        };
    }, [toolUseId]);

    return status;
}
