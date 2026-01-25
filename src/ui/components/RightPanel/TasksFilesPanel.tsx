import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TodoItemData, FileChangeData } from "../../types";
import { TasksSection } from "./TasksSection";
import { FileChangesSection } from "./FileChangesSection";
import { DirectorySection } from "./DirectorySection";

type TasksFilesPanelProps = {
  todos: TodoItemData[];
  taskStats: { completed: number; inProgress: number; pending: number; total: number };
  fileChanges: FileChangeData[];
  fileStats: { created: number; modified: number; deleted: number; total: number };
  sessionCwd?: string;
  onScrollToMessage: (index: number) => void;
  onOpenFile: (path: string) => void;
};

export function TasksFilesPanel({
  todos,
  taskStats,
  fileChanges,
  fileStats,
  sessionCwd,
  onScrollToMessage,
  onOpenFile
}: TasksFilesPanelProps) {
  useTranslation("ui");
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [directoryExpanded, setDirectoryExpanded] = useState(true);

  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto px-4 pb-4">
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
        sessionCwd={sessionCwd}
        onScrollToMessage={onScrollToMessage}
        onOpenFile={onOpenFile}
      />
      <div className="h-px bg-ink-900/5" />
      <DirectorySection
        sessionCwd={sessionCwd}
        isExpanded={directoryExpanded}
        onToggleExpand={() => setDirectoryExpanded(!directoryExpanded)}
        onOpenFile={onOpenFile}
      />
    </div>
  );
}

