export function isMarkdown(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    const patterns: RegExp[] = [/^#{1,6}\s+/m, /```[\s\S]*?```/];
    return patterns.some((pattern) => pattern.test(text));
}
