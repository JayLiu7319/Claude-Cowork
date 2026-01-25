import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { EnhancedPromptInput } from "./EnhancedPromptInput";
import { BusinessWisdomWaterfall } from "./BusinessWisdomWaterfall";
import logo from "../assets/logo.png";

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
        <div className="relative flex flex-1 flex-col h-full bg-surface-cream ml-[280px] mr-[280px] min-w-0 overflow-hidden">
            {/* Background Waterfall Animation */}
            <BusinessWisdomWaterfall />

            {/* Top Directory Bar */}
            <div
                className="relative z-10 flex items-center h-12 border-b border-ink-900/10 bg-surface-cream/80 backdrop-blur-sm select-none px-6"
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
            <div className="relative z-10 h-0.5 bg-accent/50" />

            {/* Hero Section */}
            <div className="relative z-10 flex-1 flex flex-col px-8 pb-48 overflow-y-auto">
                <div className="text-center max-w-2xl mx-auto my-auto">
                    {/* Logo */}
                    <div className="mb-8 flex justify-center">
                        <div className="w-24 h-24 rounded-3xl bg-surface-cream flex items-center justify-center shadow-2xl shadow-ink-900/10 ring-1 ring-ink-900/5 overflow-hidden">
                            <img src={logo} alt="观复君Cowork" className="w-full h-full object-cover" />
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <h1 className="text-4xl font-bold text-ink-900 mb-4 tracking-tight">
                        {t('welcomePage.title', '观复君Cowork')}
                    </h1>
                    <p className="text-xl text-ink-500 mb-12 font-medium">
                        {t('welcomePage.subtitle', '商业咨询与分析 · 您的智能参谋')}
                    </p>

                    {/* Quick Actions */}
                    <div className="flex gap-4 justify-center mb-8">
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
