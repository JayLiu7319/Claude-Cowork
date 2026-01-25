import { memo } from "react";
import type { FileChangeData } from "../../types";

type FileChangeItemProps = {
  change: FileChangeData;
  onScrollToMessage: (index: number) => void;
};

const getOperationIcon = (type: "create" | "modify" | "delete") => {
  switch (type) {
    case "create":
      return (
        <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "modify":
      return (
        <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case "delete":
      return (
        <svg className="h-3.5 w-3.5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    default:
      return (
        <svg className="h-3.5 w-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
  }
};

export const FileChangeItem = memo(function FileChangeItem({
  change,
  onScrollToMessage
}: FileChangeItemProps) {
  const icon = getOperationIcon(change.operationType);
  const fileName = change.filePath.split(/[/\\]/).pop() || change.filePath;
  const filePath = change.filePath;

  return (
    <button
      onClick={() => onScrollToMessage(change.messageIndex)}
      className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-accent/5 transition-colors text-left text-xs text-ink-700 hover:text-accent group"
      title={filePath}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="line-clamp-1 text-xs font-medium">{fileName}</div>
        <div className="text-xs text-ink-500 line-clamp-1">{filePath}</div>
      </div>
      <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
    </button>
  );
});
