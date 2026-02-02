import { type ReactNode } from 'react';
import { electronBridge, type ElectronBridge } from '../services/electron-bridge';
import { ElectronBridgeContext } from '../hooks/useElectronBridge';

interface ElectronBridgeProviderProps {
    children: ReactNode;
    bridge?: ElectronBridge;
}

/**
 * Provider component for ElectronBridge.
 * 
 * @example
 * // Production usage (default bridge)
 * <ElectronBridgeProvider>
 *   <App />
 * </ElectronBridgeProvider>
 * 
 * @example
 * // Test/Storybook usage (mock bridge)
 * import { mockElectronBridge } from '../services/electron-bridge';
 * <ElectronBridgeProvider bridge={mockElectronBridge}>
 *   <ComponentUnderTest />
 * </ElectronBridgeProvider>
 */
export function ElectronBridgeProvider({
    children,
    bridge = electronBridge,
}: ElectronBridgeProviderProps) {
    return (
        <ElectronBridgeContext.Provider value={bridge}>
            {children}
        </ElectronBridgeContext.Provider>
    );
}
