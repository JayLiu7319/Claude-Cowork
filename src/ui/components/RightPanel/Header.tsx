import { useTranslation } from "react-i18next";

export function Header() {
  const { t } = useTranslation("ui");

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 h-12 bg-surface-cream border-b border-ink-900/10 px-4">
        <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <span className="text-sm font-medium text-ink-900">{t("rightpanel.tasks") || "Tasks"}</span>
      </div>
      <div className="h-0.5 bg-accent/50" />
    </div>
  );
}
