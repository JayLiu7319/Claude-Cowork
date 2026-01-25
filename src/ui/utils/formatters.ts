/**
 * Locale-aware formatting utilities
 * These utilities provide internationalized number, currency, and time formatting
 */

/**
 * Locale-aware number formatter
 * @param value - The number to format
 * @param locale - Optional locale override (defaults to browser language)
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale?: string): string {
  const userLocale = locale || navigator.language;
  return new Intl.NumberFormat(userLocale).format(value);
}

/**
 * Currency formatter (USD)
 * @param value - The amount to format
 * @param locale - Optional locale override (defaults to browser language)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, locale?: string): string {
  const userLocale = locale || navigator.language;
  return new Intl.NumberFormat(userLocale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Relative time formatter
 * @param date - The date to format relative to now
 * @param locale - Optional locale override (defaults to browser language)
 * @returns Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date, locale?: string): string {
  const userLocale = locale || navigator.language;
  const rtf = new Intl.RelativeTimeFormat(userLocale, { numeric: 'auto' });

  const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (Math.abs(days) > 0) return rtf.format(days, 'day');
  if (Math.abs(hours) > 0) return rtf.format(hours, 'hour');
  if (Math.abs(minutes) > 0) return rtf.format(minutes, 'minute');
  return rtf.format(seconds, 'second');
}

/**
 * Duration formatter (e.g., "2h 30m 45s")
 * @param ms - Duration in milliseconds
 * @param _locale - Optional locale override (not currently used, reserved for future)
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Formats a file path for display in the UI as a relative path
 *
 * Handles various path formats:
 * - Relative paths: returned as-is
 * - Absolute paths under cwd: converted to relative paths from cwd
 * - Absolute paths outside cwd: simplified for display
 * - Unix-style paths on Windows (/d/projects/...): normalized to relative format
 *
 * @param filePath - The file path to format (can be relative or absolute)
 * @param cwd - The current working directory (optional)
 * @returns A relative-style path for display
 */
export function formatPathForDisplay(filePath: string, cwd?: string): string {
  // Normalize path separators to forward slashes for consistent processing
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedCwd = cwd?.replace(/\\/g, '/');

  // Helper function to check if path is absolute
  const isAbsolute = (path: string): boolean => {
    // Windows absolute: C:/ or D:/
    if (/^[a-zA-Z]:\//.test(path)) return true;
    // Unix absolute: /
    if (path.startsWith('/')) return true;
    return false;
  };

  // If path is already relative, return as-is
  if (!isAbsolute(normalizedPath)) {
    return normalizedPath;
  }

  // If we have a cwd, try to make the path relative to it
  if (normalizedCwd && isAbsolute(normalizedCwd)) {
    // Normalize both paths for comparison
    let pathToCompare = normalizedPath;
    let cwdToCompare = normalizedCwd;

    // Handle Unix-style paths on Windows (e.g., /d/projects -> D:/projects)
    if (/^\/[a-zA-Z]\//.test(pathToCompare)) {
      pathToCompare = pathToCompare[1].toUpperCase() + ':' + pathToCompare.substring(2);
    }
    if (/^\/[a-zA-Z]\//.test(cwdToCompare)) {
      cwdToCompare = cwdToCompare[1].toUpperCase() + ':' + cwdToCompare.substring(2);
    }

    // Ensure cwd ends with /
    if (!cwdToCompare.endsWith('/')) {
      cwdToCompare += '/';
    }

    // If path starts with cwd, make it relative
    if (pathToCompare.startsWith(cwdToCompare)) {
      const relativePath = pathToCompare.substring(cwdToCompare.length);
      return relativePath || '.';
    }

    // Check case-insensitive on Windows
    if (pathToCompare.toLowerCase().startsWith(cwdToCompare.toLowerCase())) {
      const relativePath = pathToCompare.substring(cwdToCompare.length);
      return relativePath || '.';
    }
  }

  // For absolute paths not under cwd, simplify the display:
  // - Remove Unix-style drive mount points (/d/projects -> projects)
  // - Keep special directories like .claude, node_modules visible

  let displayPath = normalizedPath;

  // Handle Unix-style paths on Windows: /d/projects/... -> projects/...
  if (/^\/[a-zA-Z]\//.test(displayPath)) {
    displayPath = displayPath.substring(3); // Remove /d/
  }
  // Handle Windows absolute paths: C:/Users/... -> Users/...
  else if (/^[a-zA-Z]:\//.test(displayPath)) {
    displayPath = displayPath.substring(3); // Remove C:/
  }
  // Handle Unix absolute paths: try to shorten by removing leading parts
  else if (displayPath.startsWith('/')) {
    // Keep paths starting with special directories
    const parts = displayPath.split('/').filter(Boolean);
    // If path contains .claude, node_modules, or other special dirs, keep from there
    const specialDirs = ['.claude', 'node_modules', '.config', '.local'];
    const specialIndex = parts.findIndex(p => specialDirs.includes(p));
    if (specialIndex !== -1) {
      displayPath = parts.slice(specialIndex).join('/');
    } else if (parts.length > 2) {
      // Otherwise, remove the first directory level
      displayPath = parts.slice(1).join('/');
    }
  }

  return displayPath;
}
