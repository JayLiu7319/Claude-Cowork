import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { FileChangeData } from "../../types";
import { FileChangeItem } from "./FileChangeItem";

type FileChangesSectionProps = {
  fileChanges: FileChangeData[];
  stats: { created: number; modified: number; deleted: number; total: number };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onScrollToMessage: (index: number) => void;
};

export const FileChangesSection = memo(function FileChangesSection({
  fileChanges,
  stats,
  isExpanded,
  onToggleExpand,
  onScrollToMessage
}: FileChangesSectionProps) {
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{t("rightpanel.artifacts") || "Artifacts"}</span>
        </div>
        {stats.total > 0 && (
          <span className="text-xs font-mono text-ink-400 ml-auto bg-ink-900/5 px-1.5 py-0.5 rounded">
            {stats.total}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="pb-3 space-y-2 grid grid-rows-[1fr] overflow-hidden transition-all duration-200">
          {stats.total === 0 ? (
            <div className="py-2 text-xs text-ink-500">
              {t("rightpanel.noChanges") || "No changes yet"}
            </div>
          ) : (
            fileChanges.map((change) => (
              <FileChangeItem
                key={change.id}
                change={change}
                onScrollToMessage={onScrollToMessage}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});
