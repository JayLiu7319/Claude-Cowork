import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";

export type UserPromptMessage = {
  type: "user_prompt";
  prompt: string;
  displayPrompt?: string;
  displayTokens?: InputToken[];
};

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

export type FileEntry = {
  name: string;
  path: string;  // Absolute path
  isDirectory: boolean;
};

export type RecentFile = {
  name: string;
  path: string;  // Absolute path
  lastUsed: number;  // Timestamp
};

export type InputToken =
  | { type: 'text'; value: string }
  | { type: 'command'; name: string; content: string }
  | { type: 'skill'; name: string; content: string }
  | { type: 'file'; name: string; path: string };

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

export type TodoItemData = {
  id: string;
  taskIndex: number;
  content: string;
  status: "pending" | "in_progress" | "completed";
  messageIndex: number;
  timestamp: number;
};

export type FileChangeData = {
  id: string;
  filePath: string;
  operationType: "create" | "modify" | "delete";
  toolName: "Write" | "Edit" | "Bash";
  messageIndex: number;
  timestamp: number;
};

export type FileTreeNode = {
  path: string;
  name: string;
  isDirectory: boolean;
  children: Record<string, FileTreeNode>;
  isExpanded: boolean;
  hasRecentOperation: boolean;
  lastOperationIndex?: number;
};

// Server -> Client events
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

// Client -> Server events
export type ClientEvent =
  | { type: "session.start"; payload: { title: string; prompt: string; displayPrompt?: string; displayTokens?: InputToken[]; cwd?: string; allowedTools?: string } }
  | { type: "session.rename"; payload: { sessionId: string; title: string } }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string; displayPrompt?: string; displayTokens?: InputToken[] } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "file.open"; payload: { sessionId: string; path: string } }
  | { type: "session.delete"; payload: { sessionId: string } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }
  | { type: "permission.response"; payload: { sessionId: string; toolUseId: string; result: PermissionResult } };

// Brand configuration type (shared with electron)
export interface BrandConfig {
  id: 'business' | 'bio-research';
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
}
