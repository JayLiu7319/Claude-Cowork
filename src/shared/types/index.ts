/**
 * Shared data model types for both Electron main process and UI renderer.
 * This is the single source of truth for all cross-boundary types.
 */

import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";

// ============================================================
// Basic Data Types
// ============================================================

export type Statistics = {
  cpuUsage: number;
  ramUsage: number;
  storageData: number;
};

export type StaticData = {
  totalStorage: number;
  cpuModel: string;
  totalMemoryGB: number;
};

// ============================================================
// Session & Message Types
// ============================================================

export type SessionStatus = "idle" | "running" | "completed" | "error";

export type SessionInfo = {
  id: string;
  title: string;
  status: SessionStatus;
  claudeSessionId?: string;
  cwd?: string;
  createdAt: number;
  updatedAt: number;
};

export type UserPromptMessage = {
  type: "user_prompt";
  prompt: string;
  displayPrompt?: string;
  displayTokens?: InputToken[];
};

export type StreamMessage = SDKMessage | UserPromptMessage;

// ============================================================
// Input Token Types (for rich text input)
// ============================================================

export type InputToken =
  | { type: "text"; value: string }
  | { type: "command"; name: string; content: string }
  | { type: "skill"; name: string; content: string }
  | { type: "file"; name: string; path: string };

// ============================================================
// Command & Skill Types
// ============================================================

export type Command = {
  name: string;
  description?: string;
  argumentHint?: string;
  filePath: string;
};

export type SkillMetadata = {
  name: string;
  description?: string;
  pluginName: string;
  filePath: string;
};

// ============================================================
// File System Types
// ============================================================

export type FileEntry = {
  name: string;
  path: string; // Absolute path
  isDirectory: boolean;
};

export type RecentFile = {
  name: string;
  path: string; // Absolute path
  lastUsed: number; // Timestamp
};

export type DirectoryEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: DirectoryEntry[];
};

// ============================================================
// Right Panel Data Types
// ============================================================

export type TodoItemData = {
  id: string; // Tool use ID
  taskIndex: number; // Index in todos array
  content: string; // Task description
  status: "pending" | "in_progress" | "completed";
  messageIndex: number; // Index in session messages
  timestamp: number;
};

export type FileChangeData = {
  id: string; // Unique ID
  filePath: string; // Relative to cwd
  operationType: "create" | "modify" | "delete";
  toolName: "Write" | "Edit" | "Bash";
  messageIndex: number;
  timestamp: number;
};

export type FileTreeNode = {
  path: string; // Full file path
  name: string; // File/folder name
  isDirectory: boolean;
  children: Record<string, FileTreeNode>;
  isExpanded: boolean;
  hasRecentOperation: boolean;
  lastOperationIndex?: number; // Message index of last operation
};

// ============================================================
// Brand Configuration
// ============================================================

export interface BrandConfig {
  id: "business" | "bio-research";
  name: string;
  displayName: string;
  appTitle: string;
  subtitle: string;
  colors: {
    accent: string;
    accentHover: string;
    accentLight: string;
    accentSubtle: string;
    surface?: string;
    surfaceSecondary?: string;
    surfaceTertiary?: string;
    surfaceCream?: string;
  };
  waterfall?: {
    items: string[];
    enabled: boolean;
  };
  icons: {
    app: string;
    logo: string;
  };
  plugins?: string[]; // Plugin names list
}

// ============================================================
// API Configuration
// ============================================================

export interface ApiConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  apiType?: "anthropic";
}

// ============================================================
// IPC Event Types (Server -> Client)
// ============================================================

export type ServerEvent =
  | { type: "stream.message"; payload: { sessionId: string; message: StreamMessage } }
  | { type: "stream.user_prompt"; payload: { sessionId: string; prompt: string; displayPrompt?: string; displayTokens?: InputToken[] } }
  | { type: "session.status"; payload: { sessionId: string; status: SessionStatus; title?: string; cwd?: string; error?: string } }
  | { type: "session.list"; payload: { sessions: SessionInfo[] } }
  | { type: "session.history"; payload: { sessionId: string; status: SessionStatus; messages: StreamMessage[] } }
  | { type: "session.deleted"; payload: { sessionId: string } }
  | { type: "permission.request"; payload: { sessionId: string; toolUseId: string; toolName: string; input: unknown } }
  | { type: "runner.error"; payload: { sessionId?: string; message: string } }
  | { type: "rightpanel.todos"; payload: { sessionId: string; todos: TodoItemData[] } }
  | { type: "rightpanel.filechanges"; payload: { sessionId: string; changes: FileChangeData[] } }
  | { type: "rightpanel.filetree"; payload: { sessionId: string; tree: FileTreeNode } };

// ============================================================
// IPC Event Types (Client -> Server)
// ============================================================

export type ClientEvent =
  | { type: "session.start"; payload: { title: string; prompt: string; displayPrompt?: string; displayTokens?: InputToken[]; cwd?: string; allowedTools?: string; planMode?: boolean } }
  | { type: "session.rename"; payload: { sessionId: string; title: string } }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string; displayPrompt?: string; displayTokens?: InputToken[]; planMode?: boolean } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "file.open"; payload: { sessionId: string; path: string } }
  | { type: "session.delete"; payload: { sessionId: string } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }
  | { type: "permission.response"; payload: { sessionId: string; toolUseId: string; result: PermissionResult } };

// ============================================================
// IPC Payload Mappings (return types for IPC handlers)
// ============================================================

export type EventPayloadMapping = {
  getStaticData: StaticData;
  "client-event": ClientEvent;
  "server-event": ServerEvent;
  statistics: Statistics;
  "generate-session-title": string;
  "get-recent-cwds": string[];
  "select-directory": string | null;
  "get-api-config": ApiConfig | null;
  "save-api-config": { success: boolean; error?: string };
  "check-api-config": { hasConfig: boolean; config: ApiConfig | null };
  "get-language": string;
  "set-language": { success: boolean; error?: string };
  "load-commands": Command[];
  "read-command-content": string | null;
  "load-skills": SkillMetadata[];
  "read-skill-content": string | null;
  "list-files": FileEntry[];
  "get-recent-files": RecentFile[];
  "add-recent-file": void;
  "get-default-cwd": string;
  "set-default-cwd": void;
  "read-directory-tree": DirectoryEntry[];
  "get-brand-config": BrandConfig;
  "get-log-path": string;
};

// ============================================================
// IPC Arguments Mappings (parameter types for IPC handlers)
// ============================================================

export type IpcArgsMapping = {
  getStaticData: [];
  "generate-session-title": [userInput: string | null];
  "get-recent-cwds": [limit?: number];
  "select-directory": [];
  "get-api-config": [];
  "save-api-config": [config: ApiConfig];
  "check-api-config": [];
  "get-language": [];
  "set-language": [language: string];
  "load-commands": [];
  "read-command-content": [filePath: string];
  "load-skills": [];
  "read-skill-content": [filePath: string];
  "list-files": [dirPath: string];
  "get-recent-files": [sessionId: string];
  "add-recent-file": [filePath: string, sessionId: string];
  "get-default-cwd": [];
  "set-default-cwd": [cwd: string];
  "read-directory-tree": [dirPath: string, depth?: number];
  "get-brand-config": [];
  "get-log-path": [];
};

// ============================================================
// Utility Types
// ============================================================

export type UnsubscribeFunction = () => void;
