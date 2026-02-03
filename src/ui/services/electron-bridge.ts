/**
 * Electron Bridge Service
 * 
 * Abstract layer for Electron IPC communication.
 * This enables:
 * 1. Decoupling UI components from direct window.electron dependency
 * 2. Easier mocking for tests and Storybook
 * 3. Centralized error handling
 */

import type {
    Statistics,
    StaticData,
    ClientEvent,
    ServerEvent,
    ApiConfig,
    Command,
    SkillMetadata,
    FileEntry,
    RecentFile,
    DirectoryEntry,
    BrandConfig,
    UnsubscribeFunction,
} from "@ui/types";

/**
 * Interface defining all Electron IPC methods available to the UI.
 * Each method corresponds to an IPC channel exposed via preload.
 */
export interface ElectronBridge {
    // Statistics & System
    subscribeStatistics(callback: (stats: Statistics) => void): UnsubscribeFunction;
    getStaticData(): Promise<StaticData>;

    // Session Events
    sendClientEvent(event: ClientEvent): void;
    onServerEvent(callback: (event: ServerEvent) => void): UnsubscribeFunction;

    // Session Management
    generateSessionTitle(userInput: string | null): Promise<string>;
    getRecentCwds(limit?: number): Promise<string[]>;

    // Directory & File Operations
    selectDirectory(): Promise<string | null>;
    listFiles(dirPath: string): Promise<FileEntry[]>;
    readDirectoryTree(dirPath: string, depth?: number): Promise<DirectoryEntry[]>;
    getDefaultCwd(): Promise<string>;
    setDefaultCwd(cwd: string): Promise<void>;

    // Recent Files
    getRecentFiles(sessionId: string): Promise<RecentFile[]>;
    addRecentFile(filePath: string, sessionId: string): Promise<void>;

    // API Configuration
    getApiConfig(): Promise<ApiConfig | null>;
    saveApiConfig(config: ApiConfig): Promise<{ success: boolean; error?: string }>;
    checkApiConfig(): Promise<{ hasConfig: boolean; config: ApiConfig | null }>;

    // Localization
    getLanguage(): Promise<string>;

    // Commands & Skills
    loadCommands(): Promise<Command[]>;
    readCommandContent(filePath: string): Promise<string | null>;
    loadSkills(): Promise<SkillMetadata[]>;
    readSkillContent(filePath: string): Promise<string | null>;

    // Brand Configuration
    getBrandConfig(): Promise<BrandConfig>;
}

/**
 * Production implementation using actual window.electron API.
 */
export const electronBridge: ElectronBridge = {
    // Statistics & System
    subscribeStatistics: (callback) => window.electron.subscribeStatistics(callback),
    getStaticData: () => window.electron.getStaticData(),

    // Session Events
    sendClientEvent: (event) => window.electron.sendClientEvent(event),
    onServerEvent: (callback) => window.electron.onServerEvent(callback),

    // Session Management
    generateSessionTitle: (userInput) => window.electron.generateSessionTitle(userInput),
    getRecentCwds: (limit) => window.electron.getRecentCwds(limit),

    // Directory & File Operations
    selectDirectory: () => window.electron.selectDirectory(),
    listFiles: (dirPath) => window.electron.listFiles(dirPath),
    readDirectoryTree: (dirPath, depth) => window.electron.readDirectoryTree(dirPath, depth),
    getDefaultCwd: () => window.electron.getDefaultCwd(),
    setDefaultCwd: (cwd) => window.electron.setDefaultCwd(cwd),

    // Recent Files
    getRecentFiles: (sessionId) => window.electron.getRecentFiles(sessionId),
    addRecentFile: (filePath, sessionId) => window.electron.addRecentFile(filePath, sessionId),

    // API Configuration
    getApiConfig: () => window.electron.getApiConfig(),
    saveApiConfig: (config) => window.electron.saveApiConfig(config),
    checkApiConfig: () => window.electron.checkApiConfig(),

    // Localization
    getLanguage: () => window.electron.getLanguage(),

    // Commands & Skills
    loadCommands: () => window.electron.loadCommands(),
    readCommandContent: (filePath) => window.electron.readCommandContent(filePath),
    loadSkills: () => window.electron.loadSkills(),
    readSkillContent: (filePath) => window.electron.readSkillContent(filePath),

    // Brand Configuration
    getBrandConfig: () => window.electron.getBrandConfig(),
};

/**
 * Mock implementation for testing and Storybook.
 * Returns sensible default values without actual IPC calls.
 */
export const mockElectronBridge: ElectronBridge = {
    // Statistics & System
    subscribeStatistics: () => () => { },
    getStaticData: () => Promise.resolve({ totalStorage: 500, cpuModel: 'Mock CPU', totalMemoryGB: 16 }),

    // Session Events
    sendClientEvent: () => { },
    onServerEvent: () => () => { },

    // Session Management
    generateSessionTitle: () => Promise.resolve('Mock Session'),
    getRecentCwds: () => Promise.resolve(['/mock/path1', '/mock/path2']),

    // Directory & File Operations
    selectDirectory: () => Promise.resolve('/mock/selected/directory'),
    listFiles: () => Promise.resolve([]),
    readDirectoryTree: () => Promise.resolve([]),
    getDefaultCwd: () => Promise.resolve('/mock/default/cwd'),
    setDefaultCwd: () => Promise.resolve(),

    // Recent Files
    getRecentFiles: () => Promise.resolve([]),
    addRecentFile: () => Promise.resolve(),

    // API Configuration
    getApiConfig: () => Promise.resolve({ apiKey: 'mock-key', baseURL: 'https://mock.api', model: 'claude-3' }),
    saveApiConfig: () => Promise.resolve({ success: true }),
    checkApiConfig: () => Promise.resolve({ hasConfig: true, config: null }),

    // Localization
    getLanguage: () => Promise.resolve('zh-CN'),

    // Commands & Skills
    loadCommands: () => Promise.resolve([]),
    readCommandContent: () => Promise.resolve(null),
    loadSkills: () => Promise.resolve([]),
    readSkillContent: () => Promise.resolve(null),

    // Brand Configuration
    getBrandConfig: () => Promise.resolve({
        id: 'business',
        name: 'mock',
        displayName: 'Mock Brand',
        appTitle: 'Mock App',
        subtitle: 'Mock Subtitle',
        colors: { accent: '#000', accentHover: '#111', accentLight: '#222', accentSubtle: '#333' },
        icons: { app: '', logo: '' },
    }),
};
