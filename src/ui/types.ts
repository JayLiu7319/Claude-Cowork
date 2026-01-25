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
