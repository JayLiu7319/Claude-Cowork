import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@ui/store/useAppStore";
import { useElectronBridge } from "@ui/hooks/useElectronBridge";
import { EnhancedPromptInput } from "../EnhancedPromptInput/EnhancedPromptInput";
import { WaterfallBackground } from "../WaterfallBackground";
import type { WelcomePageProps } from "./types";
import { TopBar, HeroSection } from "./components";
import { useDirectorySelection } from "./hooks";

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

    const renderedTitle = brandConfig?.appTitle || t("welcomePage.title", "Agent Cowork");
    const renderedSubtitle = brandConfig?.subtitle || t("welcomePage.subtitle", "您的智能助手");
    const isWindows = navigator.userAgent.includes("Windows");
    const isCurrentDefault = cwd === defaultCwd;

    // Get logo path from brand config or fallback
    const logoSrc = useMemo(() => {
        if (!brandConfig?.icons.logo) return null;
        const rawLogo = brandConfig.icons.logo;
        if (window.location.protocol === "file:") {
            // In packaged app, assets live alongside app.asar
            const fileRelative = rawLogo.replace("./", "../");
            return new URL(fileRelative, window.location.href).toString();
        }
        // Dev server: use absolute path for assets
        return rawLogo.replace("./assets/", "/assets/");
    }, [brandConfig]);

    const { isSettingDefault, handleSelectDirectory, handleSetAsDefault } = useDirectorySelection({
        bridge,
        cwd,
        setCwd,
        setDefaultCwd
    });

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
            <TopBar
                cwd={cwd}
                isCurrentDefault={isCurrentDefault}
                isSettingDefault={isSettingDefault}
                isWindows={isWindows}
                isRightPanelOpen={isRightPanelOpen}
                isSidebarOpen={isSidebarOpen}
                onSelectDirectory={handleSelectDirectory}
                onSetAsDefault={handleSetAsDefault}
                onMenuClick={onMenuClick}
                onToggleRightPanel={onToggleRightPanel}
            />
            <div className="relative z-10 h-0.5 bg-accent/50" />

            {/* Hero Section */}
            <HeroSection
                logoSrc={logoSrc}
                renderedTitle={renderedTitle}
                renderedSubtitle={renderedSubtitle}
                brandId={brandConfig?.id}
            />

            {/* Enhanced Prompt Input */}
            <div className="relative z-20">
                <EnhancedPromptInput onStartSession={onStartSession} />
            </div>
        </div>
    );
}
