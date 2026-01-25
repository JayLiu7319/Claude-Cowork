import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TodoItemData, FileChangeData } from "../../types";
import { TasksSection } from "./TasksSection";
import { FileChangesSection } from "./FileChangesSection";

type TasksFilesPanelProps = {
  todos: TodoItemData[];
  taskStats: { completed: number; inProgress: number; pending: number; total: number };
  fileChanges: FileChangeData[];
  fileStats: { created: number; modified: number; deleted: number; total: number };
  onScrollToMessage: (index: number) => void;
};

export function TasksFilesPanel({
  todos,
  taskStats,
  fileChanges,
  fileStats,
  onScrollToMessage
}: TasksFilesPanelProps) {
  const { t } = useTranslation("ui");
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(true);

  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto">
      <TasksSection
        todos={todos}
        stats={taskStats}
        isExpanded={tasksExpanded}
        onToggleExpand={() => setTasksExpanded(!tasksExpanded)}
        onScrollToMessage={onScrollToMessage}
      />
      <div className="h-px bg-ink-900/5" />
      <FileChangesSection
        fileChanges={fileChanges}
        stats={fileStats}
        isExpanded={filesExpanded}
        onToggleExpand={() => setFilesExpanded(!filesExpanded)}
        onScrollToMessage={onScrollToMessage}
      />
    </div>
  );
}
