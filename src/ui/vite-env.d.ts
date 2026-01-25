/// <reference types="vite/client" />

interface Window {
  electron: {
    subscribeStatistics: (callback: (stats: import('./types').Statistics) => void) => () => void;
    getStaticData: () => Promise<import('./types').StaticData>;
    sendClientEvent: (event: import('./types').ClientEvent) => void;
    onServerEvent: (callback: (event: import('./types').ServerEvent) => void) => () => void;
    generateSessionTitle: (userInput: string | null) => Promise<string>;
    getRecentCwds: (limit?: number) => Promise<string[]>;
    selectDirectory: () => Promise<string | null>;
    getApiConfig: () => Promise<import('../electron/libs/config-store').ApiConfig | null>;
    saveApiConfig: (config: import('../electron/libs/config-store').ApiConfig) => Promise<{ success: boolean; error?: string }>;
    checkApiConfig: () => Promise<{ hasConfig: boolean; config: import('../electron/libs/config-store').ApiConfig | null }>;
    getLanguage: () => Promise<string>;
  };
}
