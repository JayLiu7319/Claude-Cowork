import { memo, useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useElectronBridge } from "@ui/hooks/useElectronBridge";
import { isPreviewableFile } from "@ui/hooks/useFilePreview";
import type { DirectoryEntry } from "@ui/types";

type DirectorySectionProps = {
    sessionCwd?: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onOpenFile: (path: string) => void;
    onPreviewFile: (path: string) => void;
    lastFileRefresh?: number;
};

// File icon based on extension
function getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
            return '🔷';
        case 'js':
        case 'jsx':
            return '🟨';
        case 'json':
            return '📋';
        case 'md':
            return '📝';
        case 'css':
        case 'scss':
        case 'less':
            return '🎨';
        case 'html':
            return '🌐';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return '🖼️';
        case 'pdf':
            return '📕';
        case 'zip':
        case 'tar':
        case 'gz':
            return '📦';
        default:
            return '📄';
    }
}

// Directory tree node component with elegant expand/collapse
const DirectoryTreeNode = memo(function DirectoryTreeNode({
    entry,
    depth,
    expandedPaths,
    onTogglePath,
    onOpenFile,
    onPreviewFile
}: {
    entry: DirectoryEntry;
    depth: number;
    expandedPaths: Set<string>;
    onTogglePath: (path: string) => void;
    onOpenFile: (path: string) => void;
    onPreviewFile: (path: string) => void;
}) {
    const isExpanded = expandedPaths.has(entry.path);
    const hasChildren = entry.isDirectory && entry.children && entry.children.length > 0;
    const canPreview = !entry.isDirectory && isPreviewableFile(entry.name);

    // Sort children: directories first, then files, alphabetically
    const sortedChildren = useMemo(() => {
        if (!entry.children) return [];
        return [...entry.children].sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [entry.children]);

    const handleClick = () => {
        if (entry.isDirectory) {
            onTogglePath(entry.path);
        } else if (canPreview) {
            // Previewable files open in preview modal
            onPreviewFile(entry.path);
        } else {
            onOpenFile(entry.path);
        }
    };

    const icon = entry.isDirectory ? (isExpanded ? '📂' : '📁') : getFileIcon(entry.name);

    return (
        <div className="flex flex-col">
            <button
                onClick={handleClick}
                className={`flex items-center gap-1.5 py-1.5 rounded-md hover:bg-accent/5 transition-colors text-left text-xs text-ink-700 hover:text-ink-900 group ${canPreview ? 'cursor-pointer' : ''}`}
                style={{ paddingLeft: `${depth * 14 + 4}px` }}
                title={canPreview ? `🔍 ${entry.name}` : entry.name}
            >
                {/* Elegant expand/collapse indicator - using plus/minus instead of triangles */}
                {entry.isDirectory && (
                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-ink-400 group-hover:text-accent transition-colors">
                        {hasChildren ? (
                            <span className={`text-[10px] font-medium transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'rotate-0'}`}>
                                {isExpanded ? '−' : '+'}
                            </span>
                        ) : (
                            <span className="text-[10px] opacity-30">·</span>
                        )}
                    </span>
                )}
                {!entry.isDirectory && (
                    <span className="flex-shrink-0 w-4" />
                )}

                <span className="flex-shrink-0 text-sm">{icon}</span>
                <span className="flex-1 truncate">{entry.name}</span>
                {/* Preview indicator for previewable files */}
                {canPreview && (
                    <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-accent">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </span>
                )}
            </button>

            {/* Animated children container */}
            {entry.isDirectory && isExpanded && hasChildren && (
                <div className="relative">
                    {/* Subtle vertical guide line */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-px bg-ink-900/5"
                        style={{ marginLeft: `${depth * 14 + 11}px` }}
                    />
                    {sortedChildren.map((child) => (
                        <DirectoryTreeNode
                            key={child.path}
                            entry={child}
                            depth={depth + 1}
                            expandedPaths={expandedPaths}
                            onTogglePath={onTogglePath}
                            onOpenFile={onOpenFile}
                            onPreviewFile={onPreviewFile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export const DirectorySection = memo(function DirectorySection({
    sessionCwd,
    isExpanded,
    onToggleExpand,
    onOpenFile,
    onPreviewFile,
    lastFileRefresh
}: DirectorySectionProps) {
    const { t } = useTranslation("ui");
    const bridge = useElectronBridge();
    const [directoryData, setDirectoryData] = useState<{
        tree: DirectoryEntry[] | null;
        cwd: string | undefined;
    }>({ tree: null, cwd: undefined });
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Derive actual tree to display - reset when cwd changes or section collapses
    const directoryTree = sessionCwd === directoryData.cwd && isExpanded
        ? directoryData.tree
        : null;

    // Load directory contents when cwd changes or section expands
    useEffect(() => {
        if (!sessionCwd || !isExpanded) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        bridge.readDirectoryTree(sessionCwd, 2) // Load 2 levels deep initially
            .then((tree) => {
                setDirectoryData({ tree, cwd: sessionCwd });
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load directory:", err);
                setError(String(err));
                setIsLoading(false);
            });
    }, [sessionCwd, isExpanded, lastFileRefresh, bridge]);

    const handleTogglePath = useCallback((path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
                // When expanding, load children if not already loaded
                // This is handled by the tree structure itself
            }
            return next;
        });
    }, []);

    const itemCount = directoryTree?.length ?? 0;

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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>{t("rightpanel.directory") || "Directory"}</span>
                </div>
                {itemCount > 0 && (
                    <span className="text-xs font-mono text-ink-400 ml-auto bg-ink-900/5 px-1.5 py-0.5 rounded">
                        {itemCount}
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="pb-3 flex flex-col gap-0.5" style={{ contentVisibility: 'auto' }}>
                    {!sessionCwd ? (
                        <div className="py-2 text-xs text-ink-500">
                            {t("rightpanel.noCwd") || "No working directory"}
                        </div>
                    ) : isLoading ? (
                        <div className="py-2 text-xs text-ink-500 flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            {t("common.loading") || "Loading…"}
                        </div>
                    ) : error ? (
                        <div className="py-2 text-xs text-red-500">
                            {error}
                        </div>
                    ) : !directoryTree || directoryTree.length === 0 ? (
                        <div className="py-2 text-xs text-ink-500">
                            {t("rightpanel.emptyDirectory") || "Empty directory"}
                        </div>
                    ) : (
                        directoryTree.map((entry) => (
                            <DirectoryTreeNode
                                key={entry.path}
                                entry={entry}
                                depth={0}
                                expandedPaths={expandedPaths}
                                onTogglePath={handleTogglePath}
                                onOpenFile={onOpenFile}
                                onPreviewFile={onPreviewFile}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
});
