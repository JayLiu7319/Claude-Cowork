type Statistics = {
    cpuUsage: number;
    ramUsage: number;
    storageData: number;
}

type StaticData = {
    totalStorage: number;
    cpuModel: string;
    totalMemoryGB: number;
}

type UnsubscribeFunction = () => void;

type Command = {
    name: string;
    description?: string;
    argumentHint?: string;
    filePath: string;
}

export type EventPayloadMapping = {
    statistics: Statistics;
    getStaticData: StaticData;
    "generate-session-title": string;
    "get-recent-cwds": string[];
    "select-directory": string | null;
    "get-api-config": { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null;
    "save-api-config": { success: boolean; error?: string };
    "check-api-config": { hasConfig: boolean; config: { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null };
    "load-commands": Command[];
    "read-command-content": string | null;
    "get-default-cwd": string;
    "set-default-cwd": void;
}

declare global {
    interface Window {
        electron: {
            subscribeStatistics: (callback: (statistics: Statistics) => void) => UnsubscribeFunction;
            getStaticData: () => Promise<StaticData>;
            // Claude Agent IPC APIs
            sendClientEvent: (event: import('./src/ui/types').ClientEvent) => void;
            onServerEvent: (callback: (event: import('./src/ui/types').ServerEvent) => void) => UnsubscribeFunction;
            generateSessionTitle: (userInput: string | null) => Promise<string>;
            getRecentCwds: (limit?: number) => Promise<string[]>;
            selectDirectory: () => Promise<string | null>;
            getApiConfig: () => Promise<{ apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null>;
            saveApiConfig: (config: { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" }) => Promise<{ success: boolean; error?: string }>;
            checkApiConfig: () => Promise<{ hasConfig: boolean; config: { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null }>;
            getLanguage: () => Promise<string>;
            // Welcome page APIs
            loadCommands: () => Promise<Command[]>;
            readCommandContent: (filePath: string) => Promise<string | null>;
            getDefaultCwd: () => Promise<string>;
            setDefaultCwd: (cwd: string) => Promise<void>;
        }
    }
}

export { };
