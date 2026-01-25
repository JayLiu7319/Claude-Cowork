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
};

export const RightPanel = memo(function RightPanel({
  todos,
  fileChanges,
  sessionCwd,
  onScrollToMessage,
  onOpenFile
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

  return (
    <aside className="fixed inset-y-0 right-0 flex flex-col h-full w-[280px] border-l border-ink-900/10 bg-surface-cream z-20">
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
        />
      </div>
    </aside>
  );
});

