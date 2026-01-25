import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { EnhancedPromptInput } from "./EnhancedPromptInput";

interface WelcomePageProps {
    onStartSession: () => void;
}

export function WelcomePage({ onStartSession }: WelcomePageProps) {
    const { t } = useTranslation();
    const cwd = useAppStore((s) => s.cwd);
    const setCwd = useAppStore((s) => s.setCwd);
    const defaultCwd = useAppStore((s) => s.defaultCwd);
    const setDefaultCwd = useAppStore((s) => s.setDefaultCwd);
    const [isSettingDefault, setIsSettingDefault] = useState(false);

    const handleSelectDirectory = useCallback(async () => {
        const result = await window.electron.selectDirectory();
        if (result) setCwd(result);
    }, [setCwd]);

    const handleSetAsDefault = useCallback(async () => {
        if (!cwd.trim()) return;
        setIsSettingDefault(true);
        try {
            await window.electron.setDefaultCwd(cwd);
            setDefaultCwd(cwd);
        } catch (error) {
            console.error("Failed to set default cwd:", error);
        } finally {
            setIsSettingDefault(false);
        }
    }, [cwd, setDefaultCwd]);

    const isCurrentDefault = cwd === defaultCwd;

    return (
        <div className="relative flex flex-1 flex-col h-full bg-surface-cream ml-[280px] mr-[280px] min-w-0">
            {/* Top Directory Bar */}
            <div
                className="flex items-center h-12 border-b border-ink-900/10 bg-surface-cream select-none px-6"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                <div className="flex items-center gap-3 w-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <span className="text-xs font-medium text-muted shrink-0">
                        {t('welcomePage.cwdLabel', '工作目录')}
                    </span>
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <input
                            type="text"
                            value={cwd}
                            onChange={(e) => setCwd(e.target.value)}
                            className="w-full text-sm text-ink-700 bg-transparent border-none focus:outline-none"
                            placeholder={t('welcomePage.cwdPlaceholder', '/path/to/project')}
                            title={cwd}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSelectDirectory}
                        className="shrink-0 rounded-lg border border-ink-900/10 bg-surface px-2.5 py-1 text-xs text-ink-700 hover:bg-surface-tertiary transition-colors"
                    >
                        {t('welcomePage.browse', '浏览')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSetAsDefault}
                        disabled={isSettingDefault || isCurrentDefault || !cwd.trim()}
                        className="shrink-0 rounded-lg border border-ink-900/10 bg-surface px-2.5 py-1 text-xs text-ink-700 hover:bg-surface-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCurrentDefault ? t('welcomePage.isDefault', '默认') : t('welcomePage.setAsDefault', '设为默认')}
                    </button>
                </div>
            </div>
            <div className="h-0.5 bg-accent/50 transition-transform duration-300" />

            {/* Hero Section */}
            <div className="flex-1 flex flex-col px-8 pb-48 overflow-y-auto">
                <div className="text-center max-w-2xl mx-auto my-auto">
                    {/* Logo */}
                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg">
                            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <h1 className="text-3xl font-bold text-ink-800 mb-3">
                        {t('welcomePage.title', 'Agent Cowork')}
                    </h1>
                    <p className="text-lg text-muted mb-10">
                        {t('welcomePage.subtitle', '您的 AI 编程助手，随时待命')}
                    </p>

                    {/* Quick Actions */}
                    <div className="flex gap-4 justify-center mb-8">
                        <QuickActionCard
                            icon={
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                </svg>
                            }
                            title={t('welcomePage.quickAction.code', '代码生成')}
                        />
                        <QuickActionCard
                            icon={
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                            }
                            title={t('welcomePage.quickAction.debug', '调试问题')}
                        />
                        <QuickActionCard
                            icon={
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                </svg>
                            }
                            title={t('welcomePage.quickAction.docs', '文档查询')}
                        />
                    </div>
                </div>
            </div>

            {/* Enhanced Prompt Input */}
            <EnhancedPromptInput onStartSession={onStartSession} />
        </div>
    );
}

interface QuickActionCardProps {
    icon: React.ReactNode;
    title: string;
}

function QuickActionCard({ icon, title }: QuickActionCardProps) {
    return (
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-ink-900/10 bg-surface hover:bg-surface-tertiary transition-colors cursor-pointer min-w-[100px]">
            <div className="text-accent">{icon}</div>
            <span className="text-xs font-medium text-ink-700">{title}</span>
        </div>
    );
}
