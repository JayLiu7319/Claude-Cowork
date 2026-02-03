import { useState, useCallback } from "react";
import type { ElectronBridge } from "@ui/services/electron-bridge";

interface UseDirectorySelectionOptions {
    bridge: ElectronBridge;
    cwd: string;
    setCwd: (cwd: string) => void;
    setDefaultCwd: (cwd: string) => void;
}

interface UseDirectorySelectionReturn {
    isSettingDefault: boolean;
    handleSelectDirectory: () => Promise<void>;
    handleSetAsDefault: () => Promise<void>;
}

/**
 * Hook for managing directory selection and default cwd setting
 */
export function useDirectorySelection({
    bridge,
    cwd,
    setCwd,
    setDefaultCwd
}: UseDirectorySelectionOptions): UseDirectorySelectionReturn {
    const [isSettingDefault, setIsSettingDefault] = useState(false);

    const handleSelectDirectory = useCallback(async () => {
        const result = await bridge.selectDirectory();
        if (result) setCwd(result);
    }, [setCwd, bridge]);

    const handleSetAsDefault = useCallback(async () => {
        if (!cwd.trim()) return;
        setIsSettingDefault(true);
        try {
            await bridge.setDefaultCwd(cwd);
            setDefaultCwd(cwd);
        } catch (error) {
            console.error("Failed to set default cwd:", error);
        } finally {
            setIsSettingDefault(false);
        }
    }, [cwd, setDefaultCwd, bridge]);

    return {
        isSettingDefault,
        handleSelectDirectory,
        handleSetAsDefault
    };
}
