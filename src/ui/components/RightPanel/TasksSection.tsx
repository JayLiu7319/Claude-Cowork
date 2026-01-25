import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { TodoItemData } from "../../types";
import { TaskItem } from "./TaskItem";

type TasksSectionProps = {
  todos: TodoItemData[];
  stats: { completed: number; inProgress: number; pending: number; total: number };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onScrollToMessage: (index: number) => void;
};

export const TasksSection = memo(function TasksSection({
  todos,
  stats,
  isExpanded,
  onToggleExpand,
  onScrollToMessage
}: TasksSectionProps) {
  const { t } = useTranslation("ui");

  return (
    <div className="flex flex-col border-b border-ink-900/5">
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-2 py-3 px-0 text-sm font-medium text-ink-700 hover:text-ink-900 transition-colors text-left group select-none"
      >
        <span className={`text-ink-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-ink-500 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t("rightpanel.tasks") || "Tasks"}</span>
        </div>
        {stats.total > 0 && (
          <span className="text-xs font-mono text-ink-400 ml-auto bg-ink-900/5 px-1.5 py-0.5 rounded">
            {stats.completed}/{stats.total}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="pb-3 space-y-2 grid grid-rows-[1fr] overflow-hidden transition-all duration-200">
          {stats.total === 0 ? (
            <div className="py-2 text-xs text-ink-500">
              {t("rightpanel.noTasks") || "No tasks yet"}
            </div>
          ) : (
            todos.map((todo) => (
              <TaskItem
                // Use content as stable key for deduplicated tasks to enable
                // smooth status transitions (animations) when status updates
                key={todo.content}
                todo={todo}
                onScrollToMessage={onScrollToMessage}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});
