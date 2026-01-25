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
