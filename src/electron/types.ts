import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";


export type UserPromptMessage = {
  type: "user_prompt";
  prompt: string;
};

export type StreamMessage = SDKMessage | UserPromptMessage;

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

import type { ApiConfig } from "./libs/config-store.js";

// Right panel data types
export type TodoItemData = {
  id: string;                    // Tool use ID
  taskIndex: number;             // Index in todos array
  content: string;               // Task description
  status: "pending" | "in_progress" | "completed";
  messageIndex: number;          // Index in session messages
  timestamp: number;
};

export type FileChangeData = {
  id: string;                    // Unique ID
  filePath: string;              // Relative to cwd
  operationType: "create" | "modify" | "delete";
  toolName: "Write" | "Edit" | "Bash";
  messageIndex: number;
  timestamp: number;
};

export type FileTreeNode = {
  path: string;                  // Full file path
  name: string;                  // File/folder name
  isDirectory: boolean;
  children: Record<string, FileTreeNode>;
  isExpanded: boolean;
  hasRecentOperation: boolean;
  lastOperationIndex?: number;   // Message index of last operation
};

// Server -> Client events
export type ServerEvent =
  | { type: "stream.message"; payload: { sessionId: string; message: StreamMessage } }
  | { type: "stream.user_prompt"; payload: { sessionId: string; prompt: string } }
  | { type: "session.status"; payload: { sessionId: string; status: SessionStatus; title?: string; cwd?: string; error?: string } }
  | { type: "session.list"; payload: { sessions: SessionInfo[] } }
  | { type: "session.history"; payload: { sessionId: string; status: SessionStatus; messages: StreamMessage[] } }
  | { type: "session.deleted"; payload: { sessionId: string } }
  | { type: "permission.request"; payload: { sessionId: string; toolUseId: string; toolName: string; input: unknown } }
  | { type: "runner.error"; payload: { sessionId?: string; message: string } }
  | { type: "rightpanel.todos"; payload: { sessionId: string; todos: TodoItemData[] } }
  | { type: "rightpanel.filechanges"; payload: { sessionId: string; changes: FileChangeData[] } }
  | { type: "rightpanel.filetree"; payload: { sessionId: string; tree: FileTreeNode } };

// Client -> Server events
export type ClientEvent =
  | { type: "session.start"; payload: { title: string; prompt: string; cwd?: string; allowedTools?: string } }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "file.open"; payload: { sessionId: string; path: string } }
  | { type: "session.delete"; payload: { sessionId: string } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }
  | { type: "permission.response"; payload: { sessionId: string; toolUseId: string; result: PermissionResult } };

export type Command = {
  name: string;
  description?: string;
  argumentHint?: string;
  filePath: string;
};

export type StaticData = {
  totalStorage: number;
  cpuModel: string;
  totalMemoryGB: number;
};

export type Statistics = {
  cpuUsage: number;
  ramUsage: number;
  storageData: number;
};

// Directory entry type for file system tree
export type DirectoryEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: DirectoryEntry[];
};

// IPC Event Payload Mapping for type-safe IPC communication
export type EventPayloadMapping = {
  "getStaticData": StaticData;
  "client-event": ClientEvent;
  "server-event": ServerEvent;
  "statistics": Statistics;
  "generate-session-title": string;
  "get-recent-cwds": string[];
  "select-directory": string | null;
  "get-api-config": ApiConfig | null;
  "save-api-config": { success: boolean; error?: string };
  "check-api-config": { hasConfig: boolean; config: ApiConfig | null };
  "get-language": string;
  "load-commands": Command[];
  "read-command-content": string | null;
  "get-default-cwd": string;
  "set-default-cwd": void;
  "read-directory-tree": DirectoryEntry[];
};

