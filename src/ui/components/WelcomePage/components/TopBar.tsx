import { useTranslation } from "react-i18next";
import type { TopBarProps } from "../types";

/**
 * Top directory navigation bar for the welcome page
 * Contains sidebar toggle, directory selector, and panel toggles
 */
export function TopBar({
    cwd,
    isCurrentDefault,
    isSettingDefault,
    isWindows,
    isRightPanelOpen,
    isSidebarOpen,
    onSelectDirectory,
    onSetAsDefault,
    onMenuClick,
    onToggleRightPanel
}: TopBarProps) {
    const { t } = useTranslation();

    return (
        <div
            className="relative z-10 flex items-center h-12 bg-surface-cream/95 backdrop-blur-sm select-none px-4 transition-colors"
            style={{
                WebkitAppRegion: "drag",
                paddingRight: isWindows && !isRightPanelOpen ? "160px" : undefined
            } as React.CSSProperties}
        >
            {/* Left: Sidebar Toggles */}
            <div className="flex items-center gap-2 shrink-0 pr-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                {/* Mobile Menu Button - Hamburger */}
                <div className="md:hidden">
                    {onMenuClick && (
                        <button
                            onClick={onMenuClick}
                            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-ink-900/5 text-ink-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            aria-label={t("sidebar.toggle", "切换菜单")}
                        >
                            <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Desktop Sidebar Toggle */}
                <div className="hidden md:block">
                    {onMenuClick && (
                        <button
                            onClick={onMenuClick}
                            className={`flex items-center justify-center w-8 h-8 rounded-md hover:bg-ink-900/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${!isSidebarOpen ? "text-ink-400" : "text-accent bg-accent/10"}`}
                            aria-label="Toggle Sidebar"
                        >
                            <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Center: Flexible Centered Location Bar */}
            <div className="flex-1 flex justify-center items-center min-w-0 px-2">
                <div
                    className="group relative flex items-center w-full max-w-xl h-8 bg-ink-900/5 hover:bg-ink-900/10 rounded-lg transition-colors overflow-hidden mx-auto"
                    style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                    {/* Folder Icon */}
                    <div className="shrink-0 pl-3 pr-2 text-ink-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                    </div>

                    {/* Path Text */}
                    <button
                        type="button"
                        className="flex-1 min-w-0 text-sm text-ink-700 truncate cursor-pointer select-text selection:bg-accent/20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm pr-2"
                        title={cwd || t("welcomePage.cwdPlaceholder", "/path/to/project")}
                        onClick={onSelectDirectory}
                    >
                        {cwd || t("welcomePage.cwdPlaceholder", "/path/to/project")}
                    </button>

                    {/* Actions & Status */}
                    <div className="shrink-0 flex items-center pr-1 h-full">
                        {/* Actions Group */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                            <button
                                type="button"
                                onClick={onSelectDirectory}
                                className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-ink-900/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                title={t("welcomePage.browse", "浏览")}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                                </svg>
                            </button>
                        </div>

                        {/* Default/Pin Status */}
                        <div className={`${!isCurrentDefault && "opacity-0 group-hover:opacity-100 transition-opacity"}`}>
                            <button
                                type="button"
                                onClick={onSetAsDefault}
                                disabled={isSettingDefault || isCurrentDefault || !cwd.trim()}
                                className={`p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isCurrentDefault
                                        ? "text-accent bg-accent/10 cursor-default"
                                        : "text-ink-400 hover:text-ink-900 hover:bg-ink-900/10"
                                    } disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                                title={isCurrentDefault ? t("welcomePage.isDefault", "当前为默认 (Pinned)") : t("welcomePage.setAsDefault", "设为默认")}
                            >
                                <svg className={`w-4 h-4 ${isCurrentDefault ? "fill-current" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    {isCurrentDefault ? (
                                        <path d="M17 19V5H7v14l5-2.5 5 2.5z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Panel Toggle */}
            <div className="flex items-center justify-end shrink-0 pl-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                {onToggleRightPanel && (
                    <button
                        onClick={onToggleRightPanel}
                        className={`flex items-center justify-center w-8 h-8 rounded-md hover:bg-ink-900/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isRightPanelOpen ? "text-accent bg-accent/10" : "text-ink-400"}`}
                        aria-label="Toggle Info Panel"
                    >
                        <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="15" y1="3" x2="15" y2="21" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
