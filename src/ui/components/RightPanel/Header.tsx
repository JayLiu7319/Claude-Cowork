export function Header() {
  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center justify-center gap-2 h-12 bg-surface-cream border-b border-ink-900/10 px-4 relative select-none ${navigator.userAgent.includes('Windows') ? 'pr-40' : ''}`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >

      </div>
      <div className="h-0.5 bg-accent/50" />
    </div>
  );
}
