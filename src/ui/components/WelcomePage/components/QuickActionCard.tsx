import type { QuickActionCardProps } from "../types";

/**
 * Quick action card for the welcome page
 * Displays an icon and title in a clickable button
 */
export function QuickActionCard({ icon, title, onClick }: QuickActionCardProps) {
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
