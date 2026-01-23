/// <reference types="vite/client" />

interface Window {
  electron: {
    subscribeStatistics: (callback: (stats: any) => void) => () => void;
    getStaticData: () => Promise<any>;
    sendClientEvent: (event: any) => void;
    onServerEvent: (callback: (event: any) => void) => () => void;
    generateSessionTitle: (userInput: string | null) => Promise<string>;
    getRecentCwds: (limit?: number) => Promise<string[]>;
    selectDirectory: () => Promise<string | null>;
    getApiConfig: () => Promise<any>;
    saveApiConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
    checkApiConfig: () => Promise<{ hasConfig: boolean; config: any }>;
    getLanguage: () => Promise<string>;
  };
}
