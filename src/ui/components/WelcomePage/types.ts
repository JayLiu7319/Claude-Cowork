import type { InputToken } from "@shared/types";

export interface WelcomePageProps {
    onStartSession: (options?: {
        promptOverride?: string;
        titleOverride?: string;
        displayTokensOverride?: InputToken[];
    }) => void;
    onMenuClick?: () => void;
    onToggleRightPanel?: () => void;
    isRightPanelOpen?: boolean;
    isSidebarOpen?: boolean;
}

export interface TopBarProps {
    cwd: string;
    isCurrentDefault: boolean;
    isSettingDefault: boolean;
    isWindows: boolean;
    isRightPanelOpen?: boolean;
    isSidebarOpen?: boolean;
    onSelectDirectory: () => void;
    onSetAsDefault: () => void;
    onMenuClick?: () => void;
    onToggleRightPanel?: () => void;
}

export interface HeroSectionProps {
    logoSrc: string | null;
    renderedTitle: string;
    renderedSubtitle: string;
    brandId?: string;
}

export interface QuickActionCardProps {
    icon: React.ReactNode;
    title: string;
    onClick?: () => void;
}
