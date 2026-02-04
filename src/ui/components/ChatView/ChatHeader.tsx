/**
 * ChatHeader - 聊天视图顶部标题栏
 * 包含侧边栏和右侧面板的切换按钮
 */

import type { ChatHeaderProps } from './types';

export function ChatHeader({
    title,
    isSidebarOpen,
    isRightPanelOpen,
    isWindows,
    onToggleSidebar,
    onToggleRightPanel,
}: ChatHeaderProps) {
    const titlebarRightPadding = isWindows && !isRightPanelOpen ? '160px' : undefined;

    return (
        <div className="flex flex-col">
            <div
                className={`relative flex items-center justify-between h-12 border-b border-ink-900/10 bg-surface-cream select-none px-4 ${isWindows && !isRightPanelOpen ? 'pr-[160px]' : ''}`}
                style={{ WebkitAppRegion: 'drag', paddingRight: titlebarRightPadding } as React.CSSProperties}
            >
                {/* Left Sidebar Toggle */}
                <div className="flex items-center z-10" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <button
                        onClick={onToggleSidebar}
                        className={`p-1.5 rounded-lg hover:bg-ink-900/5 ${!isSidebarOpen ? 'text-ink-400' : 'text-accent bg-accent/5'} transition-colors`}
                        aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                    >
                        <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                    </button>
                </div>

                {/* Centered Title */}
                <div
                    className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none transition-[left,right] duration-300"
                    style={{
                        left: '60px',
                        right: isWindows && !isRightPanelOpen ? '190px' : '60px'
                    }}
                >
                    <span
                        className="text-sm font-medium text-ink-700 truncate max-w-full"
                        title={title}
                    >
                        {title}
                    </span>
                </div>

                {/* Right Panel Toggle */}
                <div className="flex items-center z-10" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <button
                        onClick={onToggleRightPanel}
                        className={`p-1.5 rounded-lg hover:bg-ink-900/5 ${!isRightPanelOpen ? 'text-ink-400' : 'text-accent bg-accent/5'} transition-colors`}
                        aria-label={isRightPanelOpen ? "Close Info Panel" : "Open Info Panel"}
                    >
                        <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="15" y1="3" x2="15" y2="21" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="h-0.5 bg-accent/50 transition-transform duration-300" />
        </div>
    );
}
