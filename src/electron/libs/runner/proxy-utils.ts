/**
 * Normalize proxy URL to ensure it has a valid protocol prefix.
 * Adds 'http://' if no protocol is specified.
 */
export function normalizeProxyUrl(value?: string): string | undefined {
    if (!value) return value;
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }
    return `http://${trimmed}`;
}
