// Cache Intl.RelativeTimeFormat instances to avoid recreation
const rtfCache = new Map<string, Intl.RelativeTimeFormat>();

function getRtf(lang: string): Intl.RelativeTimeFormat {
    if (!rtfCache.has(lang)) {
        rtfCache.set(lang, new Intl.RelativeTimeFormat(lang, { numeric: "auto" }));
    }
    return rtfCache.get(lang)!;
}

/**
 * Get relative time string from a timestamp
 * @param timestamp - Unix timestamp in milliseconds
 * @param now - Current time in milliseconds
 * @param lang - Language code for formatting
 */
export function getRelativeTime(
    timestamp: number | undefined,
    now: number,
    lang: string
): string {
    if (!timestamp) return "";
    const diff = (timestamp - now) / 1000;
    const rtf = getRtf(lang);

    if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), "second");
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    return rtf.format(Math.round(diff / 86400), "day");
}
