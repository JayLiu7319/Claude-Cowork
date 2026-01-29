import { create } from 'zustand';
import type { ServerEvent, SessionStatus, StreamMessage, TodoItemData, FileChangeData, FileTreeNode, Command, BrandConfig, SkillMetadata, RecentFile } from "../types";

export type PermissionRequest = {
  toolUseId: string;
  toolName: string;
  input: unknown;
};

export type SessionView = {
  id: string;
  title: string;
  status: SessionStatus;
  cwd?: string;
  messages: StreamMessage[];
  permissionRequests: PermissionRequest[];
  lastPrompt?: string;
  createdAt?: number;
  updatedAt?: number;
  hydrated: boolean;
  // Right panel data
  todos: TodoItemData[];
  fileChanges: FileChangeData[];
  fileTree: FileTreeNode | null;
  expandedFolders: Set<string>;
};

interface AppState {
  sessions: Record<string, SessionView>;
  activeSessionId: string | null;
  prompt: string;
  cwd: string;
  defaultCwd: string;
  pendingStart: boolean;
  globalError: string | null;
  sessionsLoaded: boolean;
  showStartModal: boolean;
  showSettingsModal: boolean;
  historyRequested: Set<string>;
  apiConfigChecked: boolean;
  rightPanelActiveTab: "tasksfiles" | "tree";
  planMode: boolean;
  availableCommands: Command[];
  availableSkills: SkillMetadata[];
  recentFiles: RecentFile[];
  brandConfig: BrandConfig | null;
  lastFileRefresh: number;

  setPrompt: (prompt: string) => void;
  setCwd: (cwd: string) => void;
  setDefaultCwd: (cwd: string) => void;
  setPendingStart: (pending: boolean) => void;
  setGlobalError: (error: string | null) => void;
  setShowStartModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setActiveSessionId: (id: string | null) => void;
  setApiConfigChecked: (checked: boolean) => void;
  setRightPanelActiveTab: (tab: "tasksfiles" | "tree") => void;
  setPlanMode: (enabled: boolean) => void;
  setAvailableCommands: (commands: Command[]) => void;
  setAvailableSkills: (skills: SkillMetadata[]) => void;
  setRecentFiles: (files: RecentFile[]) => void;
  setBrandConfig: (config: BrandConfig) => void;
  markHistoryRequested: (sessionId: string) => void;
  resolvePermissionRequest: (sessionId: string, toolUseId: string) => void;
  toggleFolderExpanded: (sessionId: string, folderPath: string) => void;
  handleServerEvent: (event: ServerEvent) => void;
}

function createSession(id: string): SessionView {
  return {
    id,
    title: "",
    status: "idle",
    messages: [],
    permissionRequests: [],
    hydrated: false,
    todos: [],
    fileChanges: [],
    fileTree: null,
    expandedFolders: new Set()
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: {},
  activeSessionId: null,
  prompt: "",
  cwd: "",
  defaultCwd: "",
  pendingStart: false,
  globalError: null,
  sessionsLoaded: false,
  showStartModal: false,
  showSettingsModal: false,
  historyRequested: new Set(),
  apiConfigChecked: false,
  rightPanelActiveTab: "tasksfiles",
  planMode: false,
  availableCommands: [],
  availableSkills: [],
  recentFiles: [],
  brandConfig: null,
  lastFileRefresh: 0,

  setPrompt: (prompt) => set({ prompt }),
  setCwd: (cwd) => set({ cwd }),
  setDefaultCwd: (defaultCwd) => set({ defaultCwd }),
  setPendingStart: (pendingStart) => set({ pendingStart }),
  setGlobalError: (globalError) => set({ globalError }),
  setShowStartModal: (showStartModal) => set({ showStartModal }),
  setShowSettingsModal: (showSettingsModal) => set({ showSettingsModal }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setApiConfigChecked: (apiConfigChecked) => set({ apiConfigChecked }),
  setRightPanelActiveTab: (rightPanelActiveTab) => set({ rightPanelActiveTab }),
  setPlanMode: (planMode) => set({ planMode }),
  setAvailableCommands: (availableCommands) => set({ availableCommands }),
  setAvailableSkills: (availableSkills) => set({ availableSkills }),
  setRecentFiles: (recentFiles) => set({ recentFiles }),
  setBrandConfig: (brandConfig) => set({ brandConfig }),

  markHistoryRequested: (sessionId) => {
    set((state) => {
      const next = new Set(state.historyRequested);
      next.add(sessionId);
      return { historyRequested: next };
    });
  },

  toggleFolderExpanded: (sessionId, folderPath) => {
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return {};
      const nextFolders = new Set(existing.expandedFolders);
      if (nextFolders.has(folderPath)) {
        nextFolders.delete(folderPath);
      } else {
        nextFolders.add(folderPath);
      }
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...existing,
            expandedFolders: nextFolders
          }
        }
      };
    });
  },

  resolvePermissionRequest: (sessionId, toolUseId) => {
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return {};
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...existing,
            permissionRequests: existing.permissionRequests.filter(req => req.toolUseId !== toolUseId)
          }
        }
      };
    });
  },

  handleServerEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "session.list": {
        const nextSessions: Record<string, SessionView> = {};
        for (const session of event.payload.sessions) {
          const existing = state.sessions[session.id] ?? createSession(session.id);
          nextSessions[session.id] = {
            ...existing,
            status: session.status,
            title: session.title,
            cwd: session.cwd,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          };
        }

        set({ sessions: nextSessions, sessionsLoaded: true });

        const hasSessions = event.payload.sessions.length > 0;
        set({ showStartModal: !hasSessions });

        if (!hasSessions) {
          get().setActiveSessionId(null);
        }

        if (state.activeSessionId) {
          const stillExists = event.payload.sessions.some(
            (session) => session.id === state.activeSessionId
          );
          if (!stillExists) {
            get().setActiveSessionId(null);
          }
        }
        break;
      }

      case "session.history": {
        const { sessionId, messages, status } = event.payload;
        const filteredMessages = messages.filter((msg) => msg.type !== "stream_event");
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, status, messages: filteredMessages, hydrated: true }
            }
          };
        });
        break;
      }

      case "session.status": {
        const { sessionId, status, title, cwd } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                status,
                title: title ?? existing.title,
                cwd: cwd ?? existing.cwd,
                updatedAt: Date.now()
              }
            }
          };
        });

        if (state.pendingStart) {
          get().setActiveSessionId(sessionId);
          set({ pendingStart: false, showStartModal: false });
        }
        break;
      }

      case "session.deleted": {
        const { sessionId } = event.payload;
        const state = get();

        const nextSessions = { ...state.sessions };
        delete nextSessions[sessionId];

        const nextHistoryRequested = new Set(state.historyRequested);
        nextHistoryRequested.delete(sessionId);

        const hasRemaining = Object.keys(nextSessions).length > 0;

        set({
          sessions: nextSessions,
          historyRequested: nextHistoryRequested,
          showStartModal: !hasRemaining
        });

        if (state.activeSessionId === sessionId) {
          const remaining = Object.values(nextSessions).sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
          );
          get().setActiveSessionId(remaining[0]?.id ?? null);
        }
        break;
      }

      case "stream.message": {
        const { sessionId, message } = event.payload;
        if (message.type === "stream_event") {
          break;
        }
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            lastFileRefresh: Date.now(),
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, messages: [...existing.messages, message] }
            }
          };
        });
        break;
      }

      case "stream.user_prompt": {
        const { sessionId, prompt, displayPrompt, displayTokens } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                messages: [...existing.messages, { type: "user_prompt", prompt, displayPrompt, displayTokens }]
              }
            }
          };
        });
        break;
      }

      case "permission.request": {
        const { sessionId, toolUseId, toolName, input } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                permissionRequests: [...existing.permissionRequests, { toolUseId, toolName, input }]
              }
            }
          };
        });
        break;
      }

      case "rightpanel.todos": {
        const { sessionId, todos } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId];
          if (!existing) return {};
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, todos }
            }
          };
        });
        break;
      }

      case "rightpanel.filechanges": {
        const { sessionId, changes } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId];
          if (!existing) return {};
          return {
            lastFileRefresh: Date.now(),
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, fileChanges: changes }
            }
          };
        });
        break;
      }

      case "rightpanel.filetree": {
        const { sessionId, tree } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId];
          if (!existing) return {};
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, fileTree: tree }
            }
          };
        });
        break;
      }

      case "runner.error": {
        set({ globalError: event.payload.message });
        break;
      }
    }
  }
}));
