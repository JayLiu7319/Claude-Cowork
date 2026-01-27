import { useMemo, memo } from "react";
import type { TodoItemData, FileChangeData } from "../../types";
import { Header } from "./Header";
import { TasksFilesPanel } from "./TasksFilesPanel";

type RightPanelProps = {
  todos: TodoItemData[];
  fileChanges: FileChangeData[];
  sessionCwd?: string;
  onScrollToMessage: (index: number) => void;
  onOpenFile: (path: string) => void;
  lastFileRefresh?: number;
  className?: string;
  onClose?: () => void;
};

export const RightPanel = memo(function RightPanel({
  todos,
  fileChanges,
  sessionCwd,
  onScrollToMessage,
  onOpenFile,
  lastFileRefresh,
  className = "",
  onClose
}: RightPanelProps) {
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

  // Combined classes
  const panelClasses = `flex flex-col h-full bg-surface-cream border-l border-ink-900/10 transition-all duration-300 ease-in-out ${className}`;

  return (
    <aside className={panelClasses}>
      {/* Mobile header for close button */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-ink-900/5">
        <span className="text-xs font-medium text-muted">Panel</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-ink-900/5 text-ink-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <Header />
      <div className="flex-1 overflow-hidden">
        <TasksFilesPanel
          todos={todos}
          taskStats={taskStats}
          fileChanges={fileChanges}
          fileStats={fileStats}
          sessionCwd={sessionCwd}
          onScrollToMessage={onScrollToMessage}
          onOpenFile={onOpenFile}
          lastFileRefresh={lastFileRefresh}
        />
      </div>
    </aside>
  );
});

