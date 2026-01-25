import { useTranslation } from "react-i18next";

type HeaderProps = {
  activeTab: "tasksfiles" | "tree";
  onTabChange: (tab: "tasksfiles" | "tree") => void;
};

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const { t } = useTranslation("ui");

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 p-0 h-12 bg-surface-cream border-b border-ink-900/10 px-2">
        <button
          onClick={() => onTabChange("tasksfiles")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "tasksfiles"
            ? "bg-surface-secondary text-ink-900"
            : "text-ink-500 hover:text-ink-700 hover:bg-ink-900/5"
            }`}
        >
          <svg className={`h-4 w-4 ${activeTab === "tasksfiles" ? "text-accent" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          {t("rightpanel.tasks") || "Tasks"}
        </button>
        <button
          onClick={() => onTabChange("tree")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "tree"
            ? "bg-surface-secondary text-ink-900"
            : "text-ink-500 hover:text-ink-700 hover:bg-ink-900/5"
            }`}
        >
          <svg className={`h-4 w-4 ${activeTab === "tree" ? "text-accent" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {t("rightpanel.files") || "Files"}
        </button>
      </div>
      {activeTab === "tasksfiles" && (
        <div className="h-0.5 bg-accent/50 transition-transform duration-300" />
      )}
    </div>
  );
}
