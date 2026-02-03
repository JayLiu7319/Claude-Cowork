// 规则: js-hoist-regexp - 缓存正则表达式避免重复创建
const tagRegexCache = new Map<string, RegExp>();

function getTagRegex(tag: string): RegExp {
    if (!tagRegexCache.has(tag)) {
        tagRegexCache.set(tag, new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    }
    return tagRegexCache.get(tag)!;
}

/**
 * Extract content between XML-style tags.
 * @param input - The input string containing the tag
 * @param tag - The tag name to extract content from
 * @returns The content between the tags, or null if not found
 */
export function extractTagContent(input: string, tag: string): string | null {
    const match = input.match(getTagRegex(tag));
    return match ? match[1] : null;
}
