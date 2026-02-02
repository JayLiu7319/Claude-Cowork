import { createContext, useContext } from 'react';
import { electronBridge, type ElectronBridge } from '../services/electron-bridge';

// Create context with production bridge as default
export const ElectronBridgeContext = createContext<ElectronBridge>(electronBridge);

/**
 * Hook to access ElectronBridge from any component.
 * 
 * @returns The ElectronBridge instance (production or mock depending on context)
 * 
 * @example
 * function MyComponent() {
 *   const bridge = useElectronBridge();
 *   const handleClick = async () => {
 *     const dir = await bridge.selectDirectory();
 *     console.log('Selected:', dir);
 *   };
 *   return <button onClick={handleClick}>Select</button>;
 * }
 */
export function useElectronBridge(): ElectronBridge {
    return useContext(ElectronBridgeContext);
}

// Re-export types for convenience
export type { ElectronBridge } from '../services/electron-bridge';
