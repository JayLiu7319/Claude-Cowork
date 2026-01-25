import { memo } from "react";
import type { FileChangeData } from "../../types";
import { formatPathForDisplay } from "../../utils/formatters";

type FileChangeItemProps = {
  change: FileChangeData;
  sessionCwd?: string;
  onScrollToMessage: (index: number) => void;
  onOpenFile: (path: string) => void;
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
  sessionCwd,
  onScrollToMessage,
  onOpenFile
}: FileChangeItemProps) {
  const icon = getOperationIcon(change.operationType);
  const displayPath = formatPathForDisplay(change.filePath, sessionCwd);
  const fileName = displayPath.split('/').pop() || displayPath;

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/5 transition-colors text-left text-xs text-ink-700">
      <button
        onClick={() => onScrollToMessage(change.messageIndex)}
        className="flex items-start gap-2 flex-1 min-w-0 hover:text-accent text-left overflow-hidden"
        title={change.filePath}
      >
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="truncate text-xs font-medium">{fileName}</div>
          <div className="text-xs text-ink-500 truncate">{displayPath}</div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenFile(change.filePath);
        }}
        className="flex-shrink-0 p-1 hover:bg-ink-900/10 rounded transition-all text-ink-400 hover:text-ink-700"
        title="Show in Folder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <polyline points="9 14 12 11 15 14" />
        </svg>
      </button>
    </div>
  );
});
