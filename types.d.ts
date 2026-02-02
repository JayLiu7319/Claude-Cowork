/**
 * Global type declarations for the Electron window API.
 * Types are imported from the shared module as the single source of truth.
 */

import type {
    Statistics,
    StaticData,
    ClientEvent,
    ServerEvent,
    Command,
    SkillMetadata,
    FileEntry,
    RecentFile,
    DirectoryEntry,
    BrandConfig,
    ApiConfig,
    UnsubscribeFunction,
} from './src/shared/index';

declare global {
    interface Window {
        electron: {
            // System statistics
            subscribeStatistics: (callback: (statistics: Statistics) => void) => UnsubscribeFunction;
            getStaticData: () => Promise<StaticData>;

            // Claude Agent IPC APIs
            sendClientEvent: (event: ClientEvent) => void;
            onServerEvent: (callback: (event: ServerEvent) => void) => UnsubscribeFunction;
            generateSessionTitle: (userInput: string | null) => Promise<string>;
            getRecentCwds: (limit?: number) => Promise<string[]>;
            selectDirectory: () => Promise<string | null>;

            // API Configuration
            getApiConfig: () => Promise<ApiConfig | null>;
            saveApiConfig: (config: ApiConfig) => Promise<{ success: boolean; error?: string }>;
            checkApiConfig: () => Promise<{ hasConfig: boolean; config: ApiConfig | null }>;

            // Localization
            getLanguage: () => Promise<string>;

            // Commands & Skills
            loadCommands: () => Promise<Command[]>;
            readCommandContent: (filePath: string) => Promise<string | null>;
            loadSkills: () => Promise<SkillMetadata[]>;
            readSkillContent: (filePath: string) => Promise<string | null>;

            // File System
            listFiles: (dirPath: string) => Promise<FileEntry[]>;
            getRecentFiles: (sessionId: string) => Promise<RecentFile[]>;
            addRecentFile: (filePath: string, sessionId: string) => Promise<void>;
            readDirectoryTree: (dirPath: string, depth?: number) => Promise<DirectoryEntry[]>;

            // Working Directory
            getDefaultCwd: () => Promise<string>;
            setDefaultCwd: (cwd: string) => Promise<void>;

            // Brand Configuration
            getBrandConfig: () => Promise<BrandConfig>;

            // Logging
            getLogPath: () => Promise<string>;
        };
    }
}

export { };
