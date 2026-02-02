import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { InputToken } from "../types";
import { EnhancedPromptInput } from "./EnhancedPromptInput";
import { WaterfallBackground } from "./WaterfallBackground";
import { useElectronBridge } from "../hooks/useElectronBridge";

interface WelcomePageProps {
    onStartSession: (options?: { promptOverride?: string; titleOverride?: string; displayTokensOverride?: InputToken[] }) => void;
    onMenuClick?: () => void;
    onToggleRightPanel?: () => void;
    isRightPanelOpen?: boolean;
    isSidebarOpen?: boolean;
}

export function WelcomePage({
    onStartSession,
    onMenuClick,
    onToggleRightPanel,
    isRightPanelOpen,
    isSidebarOpen
}: WelcomePageProps) {
    const { t } = useTranslation();
    const bridge = useElectronBridge();
    const cwd = useAppStore((s) => s.cwd);
    const setCwd = useAppStore((s) => s.setCwd);
    const defaultCwd = useAppStore((s) => s.defaultCwd);
    const setDefaultCwd = useAppStore((s) => s.setDefaultCwd);
    const brandConfig = useAppStore((s) => s.brandConfig);
    const [isSettingDefault, setIsSettingDefault] = useState(false);

    const renderedTitle = brandConfig?.appTitle || t('welcomePage.title', 'Agent Cowork');
    const renderedSubtitle = brandConfig?.subtitle || t('welcomePage.subtitle', '您的智能助手');
    const isWindows = navigator.userAgent.includes('Windows');

    // Get logo path from brand config or fallback
    const logoSrc = useMemo(() => {
        if (!brandConfig?.icons.logo) return null;
        const rawLogo = brandConfig.icons.logo;
        if (window.location.protocol === 'file:') {
            // In packaged app, assets live alongside app.asar
            const fileRelative = rawLogo.replace('./', '../');
            return new URL(fileRelative, window.location.href).toString();
        }
        // Dev server: use absolute path for assets
        return rawLogo.replace('./assets/', '/assets/');
    }, [brandConfig]);

    const handleSelectDirectory = useCallback(async () => {
        const result = await bridge.selectDirectory();
        if (result) setCwd(result);
    }, [setCwd, bridge]);

    const handleSetAsDefault = useCallback(async () => {
        if (!cwd.trim()) return;
        setIsSettingDefault(true);
        try {
            await bridge.setDefaultCwd(cwd);
            setDefaultCwd(cwd);
        } catch (error) {
            console.error("Failed to set default cwd:", error);
        } finally {
            setIsSettingDefault(false);
        }
    }, [cwd, setDefaultCwd, bridge]);

    const isCurrentDefault = cwd === defaultCwd;

    return (
        <div className="relative flex flex-1 flex-col h-full bg-surface-cream min-w-0 overflow-hidden">
            {/* Background Waterfall Animation */}
            {brandConfig?.waterfall && (
                <WaterfallBackground
                    items={brandConfig.waterfall.items}
                    enabled={brandConfig.waterfall.enabled}
                />
            )}

            {/* Top Directory Bar */}
            <div
                className="relative z-10 flex items-center h-12 bg-surface-cream/95 backdrop-blur-sm select-none px-4 transition-colors"
                style={{
                    WebkitAppRegion: 'drag',
                    paddingRight: (isWindows && !isRightPanelOpen) ? '160px' : undefined
                } as React.CSSProperties}
            >
                {/* Left: Sidebar Toggles */}
                <div className="flex items-center gap-2 shrink-0 pr-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    {/* Mobile Menu Button - Hamburger */}
                    <div className="md:hidden">
                        {onMenuClick && (
                            <button
                                onClick={onMenuClick}
                                className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-ink-900/5 text-ink-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                aria-label={t('sidebar.toggle', '切换菜单')}
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
                                className={`flex items-center justify-center w-8 h-8 rounded-md hover:bg-ink-900/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${!isSidebarOpen ? 'text-ink-400' : 'text-accent bg-accent/10'}`}
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
                        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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
                            title={cwd || t('welcomePage.cwdPlaceholder', '/path/to/project')}
                            onClick={handleSelectDirectory}
                        >
                            {cwd || t('welcomePage.cwdPlaceholder', '/path/to/project')}
                        </button>

                        {/* Actions & Status */}
                        <div className="shrink-0 flex items-center pr-1 h-full">
                            {/* Actions Group */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                                <button
                                    type="button"
                                    onClick={handleSelectDirectory}
                                    className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-ink-900/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    title={t('welcomePage.browse', '浏览')}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                                    </svg>
                                </button>
                            </div>

                            {/* Default/Pin Status */}
                            <div className={`${!isCurrentDefault && 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                <button
                                    type="button"
                                    onClick={handleSetAsDefault}
                                    disabled={isSettingDefault || isCurrentDefault || !cwd.trim()}
                                    className={`p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isCurrentDefault
                                        ? 'text-accent bg-accent/10 cursor-default'
                                        : 'text-ink-400 hover:text-ink-900 hover:bg-ink-900/10'
                                        } disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                                    title={isCurrentDefault ? t('welcomePage.isDefault', '当前为默认 (Pinned)') : t('welcomePage.setAsDefault', '设为默认')}
                                >
                                    <svg className={`w-4 h-4 ${isCurrentDefault ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                <div className="flex items-center justify-end shrink-0 pl-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    {onToggleRightPanel && (
                        <button
                            onClick={onToggleRightPanel}
                            className={`flex items-center justify-center w-8 h-8 rounded-md hover:bg-ink-900/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isRightPanelOpen ? 'text-accent bg-accent/10' : 'text-ink-400'}`}
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
            <div className="relative z-10 h-0.5 bg-accent/50" />

            {/* Hero Section */}
            <div className="relative z-10 flex-1 flex flex-col px-8 pb-48 overflow-y-auto">
                <div className="text-center max-w-2xl mx-auto my-auto">
                    {/* Logo */}
                    {logoSrc && (
                        <div className="mb-8 flex justify-center">
                            <div className="w-24 h-24 rounded-3xl bg-surface-cream flex items-center justify-center shadow-2xl shadow-ink-900/10 ring-1 ring-ink-900/5 overflow-hidden">
                                <img src={logoSrc} alt={brandConfig?.appTitle || 'App Logo'} className="w-full h-full object-cover" width={96} height={96} />
                            </div>
                        </div>
                    )}

                    {/* Welcome Text */}
                    <h1 className="text-4xl font-bold text-ink-900 mb-4 tracking-tight">
                        {renderedTitle}
                    </h1>
                    <p className="text-xl text-ink-500 mb-12 font-medium">
                        {renderedSubtitle}
                    </p>

                    {/* Quick Actions - Brand-specific */}
                    <div className="flex gap-4 justify-center mb-8">
                        {brandConfig?.id === 'bio-research' ? (
                            <>
                                <QuickActionCard
                                    icon={
                                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                                        </svg>
                                    }
                                    title={t('welcomePage.quickAction.experiment', '实验设计')}
                                />
                                <QuickActionCard
                                    icon={
                                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                        </svg>
                                    }
                                    title={t('welcomePage.quickAction.dataAnalysis', '数据分析')}
                                />
                                <QuickActionCard
                                    icon={
                                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                        </svg>
                                    }
                                    title={t('welcomePage.quickAction.literature', '文献综述')}
                                />
                            </>
                        ) : (
                            <>
                                <QuickActionCard
                                    icon={
                                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                        </svg>
                                    }
                                    title={t('welcomePage.quickAction.analyze', '商业分析')}
                                />
                                <QuickActionCard
                                    icon={
                                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.854 1.591-2.16 2.613-.857 5.203-1.782 5.203-4.092 0-2.262-2.316-3.87-4.385-3.32a9.585 9.585 0 00-6.666 0c-2.068-.55-4.385 1.058-4.385 3.32 0 2.31 2.59 3.235 5.203 4.092.933.306 1.591 1.177 1.591 2.16v.192" />
                                        </svg>
                                    }
                                    title={t('welcomePage.quickAction.strategy', '战略咨询')}
                                />
                                <QuickActionCard
                                    icon={
                                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                    }
                                    title={t('welcomePage.quickAction.report', '生成报告')}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Prompt Input */}
            <div className="relative z-20">
                <EnhancedPromptInput onStartSession={onStartSession} />
            </div>
        </div>
    );
}

export interface QuickActionCardProps {
    icon: React.ReactNode;
    title: string;
    onClick?: () => void;
}

function QuickActionCard({ icon, title, onClick }: QuickActionCardProps) {
    return (
        <button
            type="button"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-ink-900/10 bg-surface hover:bg-surface-tertiary transition-colors cursor-pointer min-w-[100px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            onClick={onClick}
        >
            <div className="text-accent" aria-hidden="true">{icon}</div>
            <span className="text-xs font-medium text-ink-700">{title}</span>
        </button>
    );
}
