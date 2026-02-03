/**
 * Format the working directory path for display
 * Shows only the last 2 path segments for brevity
 */
export function formatCwd(cwd: string | undefined, fallbackText: string): string {
    if (!cwd) return fallbackText;
    const parts = cwd.split(/[\\/]+/).filter(Boolean);
    const tail = parts.slice(-2).join("/");
    return `/${tail || cwd}`;
}
