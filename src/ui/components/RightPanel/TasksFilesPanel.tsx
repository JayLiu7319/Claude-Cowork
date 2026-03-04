import { useTranslation } from "react-i18next";
import type { TodoItemData, FileChangeData } from "@ui/types";
import { usePanelExpandedState } from "@ui/hooks/useAppSelectors";
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
  onPreviewFile: (path: string) => void;
  lastFileRefresh?: number;
};

export function TasksFilesPanel({
  todos,
  taskStats,
  fileChanges,
  fileStats,
  sessionCwd,
  onScrollToMessage,
  onOpenFile,
  onPreviewFile,
  lastFileRefresh
}: TasksFilesPanelProps) {
  useTranslation("ui");
  const { panelExpanded, togglePanelExpanded } = usePanelExpandedState();


  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto px-4 pb-4">
      <TasksSection
        todos={todos}
        stats={taskStats}
        isExpanded={panelExpanded.tasks}
        onToggleExpand={() => togglePanelExpanded('tasks')}
        onScrollToMessage={onScrollToMessage}
      />
      <div className="h-px bg-ink-900/5" />
      <FileChangesSection
        fileChanges={fileChanges}
        stats={fileStats}
        isExpanded={panelExpanded.files}
        onToggleExpand={() => togglePanelExpanded('files')}
        sessionCwd={sessionCwd}
        onScrollToMessage={onScrollToMessage}
        onOpenFile={onOpenFile}
        onPreviewFile={onPreviewFile}
      />
      <div className="h-px bg-ink-900/5" />
      <DirectorySection
        sessionCwd={sessionCwd}
        isExpanded={panelExpanded.directory}
        onToggleExpand={() => togglePanelExpanded('directory')}
        onOpenFile={onOpenFile}
        onPreviewFile={onPreviewFile}
        lastFileRefresh={lastFileRefresh}
      />
    </div>
  );
}
