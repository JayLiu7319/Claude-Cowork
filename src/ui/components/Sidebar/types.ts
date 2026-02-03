import type { SessionView } from "@ui/store/useAppStore";

export interface SidebarProps {
    connected: boolean;
    onNewSession: () => void;
    onDeleteSession: (sessionId: string) => void;
    className?: string;
    onClose?: () => void;
}

export interface SessionItemProps {
    session: SessionView;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onResume: () => void;
    formatCwd: (cwd?: string) => string;
    getRelativeTime: (timestamp?: number) => string;
}

export interface StatusIconProps {
    status?: string;
}

export interface ResumeDialogProps {
    sessionId: string | null;
    onClose: () => void;
}

export interface DeleteDialogProps {
    sessionId: string | null;
    onClose: () => void;
    onConfirm: () => void;
}
