import { memo, useMemo } from "react";
import type { FileTreeNode as FileTreeNodeData } from "../../types";

type FileTreeNodeComponentProps = {
  node: FileTreeNodeData;
  isRoot?: boolean;
  depth?: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onScrollToMessage: (index: number) => void;
};

const operationIndicators: Record<string, string> = {
  create: "🆕",
  modify: "✏️",
  delete: "🗑️"
};

export const FileTreeNode = memo(function FileTreeNode({
  node,

  depth = 0,
  expandedFolders,
  onToggleFolder,
  onScrollToMessage
}: FileTreeNodeComponentProps) {
  const isExpanded = expandedFolders.has(node.path);
  const hasChildren = Object.keys(node.children).length > 0;

  const sortedChildren = useMemo(() => {
    return Object.values(node.children).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [node.children]);

  const icon = node.isDirectory ? "📁" : "📄";
  const indicator = node.hasRecentOperation ? operationIndicators["modify"] : "";

  const handleClick = () => {
    if (node.isDirectory) {
      onToggleFolder(node.path);
    } else if (node.lastOperationIndex !== undefined) {
      onScrollToMessage(node.lastOperationIndex);
    }
  };

  return (
    <div className="flex flex-col text-sm">
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 py-1 px-0 rounded hover:bg-accent/5 transition-colors text-left text-xs ${node.hasRecentOperation ? "text-accent font-medium" : "text-ink-700"
          } group`}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {node.isDirectory && hasChildren && (
          <span className={`transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}>
            ▶
          </span>
        )}
        {node.isDirectory && !hasChildren && (
          <span className="flex-shrink-0 w-4" />
        )}
        {!node.isDirectory && (
          <span className="flex-shrink-0 w-4" />
        )}

        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 truncate">{node.name}</span>

        {indicator && (
          <span className="flex-shrink-0 text-xs opacity-70">{indicator}</span>
        )}

        {!node.isDirectory && node.lastOperationIndex !== undefined && (
          <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
        )}
      </button>

      {node.isDirectory && isExpanded && hasChildren && (
        <div>
          {sortedChildren.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onScrollToMessage={onScrollToMessage}
            />
          ))}
        </div>
      )}
    </div>
  );
});
