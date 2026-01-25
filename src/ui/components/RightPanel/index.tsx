import { useMemo } from "react";
// import { useTranslation } from "react-i18next"; // Unused import
import type { TodoItemData, FileChangeData, FileTreeNode } from "../../types";
import { Header } from "./Header";
import { TasksFilesPanel } from "./TasksFilesPanel";
import { FileTreePanel } from "./FileTreePanel";

type RightPanelProps = {
  activeTab: "tasksfiles" | "tree";
  onTabChange: (tab: "tasksfiles" | "tree") => void;
  todos: TodoItemData[];
  fileChanges: FileChangeData[];
  fileTree: FileTreeNode | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onScrollToMessage: (index: number) => void;
};

export function RightPanel({
  activeTab,
  onTabChange,
  todos,
  fileChanges,
  fileTree,
  expandedFolders,
  onToggleFolder,
  onScrollToMessage
}: RightPanelProps) {
  // const { t } = useTranslation("ui"); // t is unused, commented out to fix lint

  const taskStats = useMemo(() => {
    return {
      completed: todos.filter(t => t.status === "completed").length,
      inProgress: todos.filter(t => t.status === "in_progress").length,
      pending: todos.filter(t => t.status === "pending").length,
      total: todos.length
    };
  }, [todos]);

  const fileStats = useMemo(() => {
    return {
      created: fileChanges.filter(f => f.operationType === "create").length,
      modified: fileChanges.filter(f => f.operationType === "modify").length,
      deleted: fileChanges.filter(f => f.operationType === "delete").length,
      total: fileChanges.length
    };
  }, [fileChanges]);

  return (
    <aside className="fixed inset-y-0 right-0 flex flex-col h-full w-[280px] border-l border-ink-900/10 bg-surface-cream z-20">
      <Header activeTab={activeTab} onTabChange={onTabChange} />

      <div className="flex-1 overflow-hidden px-4 pb-4">
        {activeTab === "tasksfiles" ? (
          <TasksFilesPanel
            todos={todos}
            taskStats={taskStats}
            fileChanges={fileChanges}
            fileStats={fileStats}
            onScrollToMessage={onScrollToMessage}
          />
        ) : (
          <FileTreePanel
            fileTree={fileTree}
            expandedFolders={expandedFolders}
            onToggleFolder={onToggleFolder}
            onScrollToMessage={onScrollToMessage}
          />
        )}
      </div>
    </aside>
  );
}
