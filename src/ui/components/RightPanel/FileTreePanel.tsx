import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { FileTreeNode } from "../../types";
import { FileTreeNode as FileTreeNodeComponent } from "./FileTreeNode";

type FileTreePanelProps = {
  fileTree: FileTreeNode | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onScrollToMessage: (index: number) => void;
};

export const FileTreePanel = memo(function FileTreePanel({
  fileTree,
  expandedFolders,
  onToggleFolder,
  onScrollToMessage
}: FileTreePanelProps) {
  const { t } = useTranslation("ui");

  if (!fileTree) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-ink-500">
        {t("rightpanel.noFileTree") || "No file tree available"}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      <FileTreeNodeComponent
        node={fileTree}
        isRoot={true}
        expandedFolders={expandedFolders}
        onToggleFolder={onToggleFolder}
        onScrollToMessage={onScrollToMessage}
      />
    </div>
  );
});
