import { memo } from "react";
import type { TodoItemData } from "../../types";

type TaskItemProps = {
  todo: TodoItemData;
  onScrollToMessage: (index: number) => void;
};

export const TaskItem = memo(function TaskItem({ todo, onScrollToMessage }: TaskItemProps) {
  const isCompleted = todo.status === "completed";
  const isInProgress = todo.status === "in_progress";

  return (
    <button
      onClick={() => onScrollToMessage(todo.messageIndex)}
      className={`
        flex items-start gap-3 px-3 py-2 rounded-lg w-full text-left transition-all duration-200 group
        ${isCompleted ? "bg-accent/5 text-ink-400" : "hover:bg-accent/5 text-ink-700"}
      `}
    >
      <div className={`
        flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center border transition-colors duration-200
        ${isCompleted
          ? "border-accent bg-accent text-white"
          : isInProgress
            ? "border-accent text-accent"
            : "border-ink-300 text-transparent group-hover:border-ink-400"}
      `}>
        {isCompleted && (
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 9 4.5 9 11 1" />
          </svg>
        )}
        {isInProgress && (
          <svg viewBox="0 0 24 24" className="w-3 h-3 animate-spin" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className={`
          block text-xs leading-5 transition-all duration-200
          ${isCompleted ? "line-through opacity-70" : ""}
          ${isInProgress ? "font-medium text-ink-900" : ""}
        `}>
          {todo.content}
        </span>
      </div>

      <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-400">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </button>
  );
});
