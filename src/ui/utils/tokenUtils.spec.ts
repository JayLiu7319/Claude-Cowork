import { describe, it, expect } from 'vitest';
import {
    TOKEN_PLACEHOLDER,
    TOKEN_PADDING_CHARS,
    TOKEN_SEPARATOR,
    createTokenId,
    createTokenPlaceholder,
    parseDisplayTokens,
    serializePrompt,
    findTrigger,
    countPlaceholders,
    getPlaceholderRuns,
    replacePlaceholderRuns,
    removePlaceholderBeforeCursor,
    removePlaceholderAtCursor,
    computeDiffRange,
    type TokenRegistryItem,
} from './tokenUtils';

describe('tokenUtils', () => {
    describe('constants', () => {
        it('should export TOKEN_PLACEHOLDER', () => {
            expect(TOKEN_PLACEHOLDER).toBe('\uFFFC');
        });

        it('should export TOKEN_PADDING_CHARS', () => {
            expect(TOKEN_PADDING_CHARS).toBe(2);
        });

        it('should export TOKEN_SEPARATOR', () => {
            expect(TOKEN_SEPARATOR).toBe('\u200B');
        });
    });

    describe('createTokenId', () => {
        it('should generate unique IDs', () => {
            const id1 = createTokenId();
            const id2 = createTokenId();
            expect(id1).not.toBe(id2);
        });

        it('should generate non-empty strings', () => {
            const id = createTokenId();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });
    });

    describe('createTokenPlaceholder', () => {
        it('should return single placeholder for undefined token', () => {
            expect(createTokenPlaceholder(undefined)).toBe(TOKEN_PLACEHOLDER);
        });

        it('should return single placeholder for text token', () => {
            const token: TokenRegistryItem = {
                id: 'test-id',
                type: 'text',
                value: 'hello',
            };
            expect(createTokenPlaceholder(token)).toBe(TOKEN_PLACEHOLDER);
        });

        it('should return placeholders based on name length for command token', () => {
            const token: TokenRegistryItem = {
                id: 'test-id',
                type: 'command',
                name: 'plan',
                content: '/plan',
            };
            // name.length (4) + TOKEN_PADDING_CHARS (2) = 6
            expect(createTokenPlaceholder(token)).toBe(TOKEN_PLACEHOLDER.repeat(6));
        });

        it('should return at least one placeholder', () => {
            const token: TokenRegistryItem = {
                id: 'test-id',
                type: 'command',
                name: '',
                content: '',
            };
            expect(createTokenPlaceholder(token).length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('parseDisplayTokens', () => {
        it('should parse plain text', () => {
            const result = parseDisplayTokens('hello world', []);
            expect(result).toEqual([{ type: 'text', value: 'hello world' }]);
        });

        it('should parse text with token placeholders', () => {
            const tokens: TokenRegistryItem[] = [
                { id: 'id1', type: 'command', name: 'plan', content: '/plan' },
            ];
            const value = `Hello ${TOKEN_PLACEHOLDER.repeat(6)} world`;
            const result = parseDisplayTokens(value, tokens);
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ type: 'text', value: 'Hello ' });
            expect(result[1]).toBe(tokens[0]);
            expect(result[2]).toEqual({ type: 'text', value: ' world' });
        });

        it('should skip TOKEN_SEPARATOR', () => {
            const value = `hello${TOKEN_SEPARATOR}world`;
            const result = parseDisplayTokens(value, []);
            expect(result).toEqual([{ type: 'text', value: 'helloworld' }]);
        });

        it('should handle multiple tokens', () => {
            const tokens: TokenRegistryItem[] = [
                { id: 'id1', type: 'command', name: 'a', content: '/a' },
                { id: 'id2', type: 'skill', name: 'b', content: '@b' },
            ];
            const value = `${TOKEN_PLACEHOLDER.repeat(3)} and ${TOKEN_PLACEHOLDER.repeat(3)}`;
            const result = parseDisplayTokens(value, tokens);
            expect(result).toHaveLength(3);
            expect(result[0]).toBe(tokens[0]);
            expect(result[1]).toEqual({ type: 'text', value: ' and ' });
            expect(result[2]).toBe(tokens[1]);
        });
    });

    describe('serializePrompt', () => {
        it('should serialize plain text', () => {
            expect(serializePrompt('hello', [], 'send')).toBe('hello');
            expect(serializePrompt('hello', [], 'title')).toBe('hello');
        });

        it('should serialize command token in send mode', () => {
            const tokens: TokenRegistryItem[] = [
                { id: 'id1', type: 'command', name: 'plan', content: 'Please create a plan' },
            ];
            const value = `${TOKEN_PLACEHOLDER}`;
            expect(serializePrompt(value, tokens, 'send')).toBe('Please create a plan');
        });

        it('should serialize command token in title mode', () => {
            const tokens: TokenRegistryItem[] = [
                { id: 'id1', type: 'command', name: 'plan', content: 'Please create a plan' },
            ];
            const value = `${TOKEN_PLACEHOLDER}`;
            expect(serializePrompt(value, tokens, 'title')).toBe('/plan');
        });

        it('should serialize skill token', () => {
            const tokens: TokenRegistryItem[] = [
                { id: 'id1', type: 'skill', name: 'coding', content: 'Use coding skill' },
            ];
            const value = `${TOKEN_PLACEHOLDER}`;
            expect(serializePrompt(value, tokens, 'send')).toBe('Use coding skill');
            expect(serializePrompt(value, tokens, 'title')).toBe('@coding');
        });

        it('should serialize file token', () => {
            const tokens: TokenRegistryItem[] = [
                { id: 'id1', type: 'file', name: 'readme.md', path: '/path/to/readme.md' },
            ];
            const value = `${TOKEN_PLACEHOLDER}`;
            expect(serializePrompt(value, tokens, 'send')).toBe('/path/to/readme.md');
            expect(serializePrompt(value, tokens, 'title')).toBe('@readme.md');
        });
    });

    describe('findTrigger', () => {
        it('should find / trigger', () => {
            const result = findTrigger('hello /plan', 11, '/');
            expect(result).toEqual({ rawIndex: 6, filter: 'plan' });
        });

        it('should find @ trigger', () => {
            const result = findTrigger('use @skill', 10, '@');
            expect(result).toEqual({ rawIndex: 4, filter: 'skill' });
        });

        it('should return null if no trigger found', () => {
            expect(findTrigger('hello world', 11, '/')).toBeNull();
        });

        it('should return null if space after trigger', () => {
            expect(findTrigger('hello /plan mode', 16, '/')).toBeNull();
        });

        it('should handle partial filter', () => {
            const result = findTrigger('/pla', 4, '/');
            expect(result).toEqual({ rawIndex: 0, filter: 'pla' });
        });

        it('should skip placeholder chars', () => {
            const value = `${TOKEN_PLACEHOLDER.repeat(3)}/cmd`;
            const result = findTrigger(value, value.length, '/');
            expect(result).toEqual({ rawIndex: 3, filter: 'cmd' });
        });
    });

    describe('countPlaceholders', () => {
        it('should count zero for empty string', () => {
            expect(countPlaceholders('')).toBe(0);
        });

        it('should count zero for no placeholders', () => {
            expect(countPlaceholders('hello')).toBe(0);
        });

        it('should count single placeholder run as 1', () => {
            expect(countPlaceholders(TOKEN_PLACEHOLDER.repeat(5))).toBe(1);
        });

        it('should count multiple runs', () => {
            const value = `${TOKEN_PLACEHOLDER.repeat(3)}text${TOKEN_PLACEHOLDER.repeat(2)}`;
            expect(countPlaceholders(value)).toBe(2);
        });

        it('should respect endIndex', () => {
            const value = `${TOKEN_PLACEHOLDER.repeat(3)}text${TOKEN_PLACEHOLDER.repeat(2)}`;
            expect(countPlaceholders(value, 5)).toBe(1);
        });
    });

    describe('getPlaceholderRuns', () => {
        it('should return empty array for no placeholders', () => {
            expect(getPlaceholderRuns('hello')).toEqual([]);
        });

        it('should return run lengths', () => {
            const value = `${TOKEN_PLACEHOLDER.repeat(3)}text${TOKEN_PLACEHOLDER.repeat(5)}`;
            expect(getPlaceholderRuns(value)).toEqual([3, 5]);
        });

        it('should handle trailing placeholder run', () => {
            expect(getPlaceholderRuns(TOKEN_PLACEHOLDER.repeat(4))).toEqual([4]);
        });
    });

    describe('replacePlaceholderRuns', () => {
        it('should replace placeholder runs with new lengths', () => {
            const value = `text${TOKEN_PLACEHOLDER.repeat(3)}more${TOKEN_PLACEHOLDER.repeat(2)}`;
            const result = replacePlaceholderRuns(value, [5, 7]);
            expect(result.nextValue).toBe(`text${TOKEN_PLACEHOLDER.repeat(5)}more${TOKEN_PLACEHOLDER.repeat(7)}`);
            expect(result.runCount).toBe(2);
        });

        it('should keep original length if desired not provided', () => {
            const value = `${TOKEN_PLACEHOLDER.repeat(4)}`;
            const result = replacePlaceholderRuns(value, []);
            expect(result.nextValue).toBe(TOKEN_PLACEHOLDER.repeat(4));
        });
    });

    describe('removePlaceholderBeforeCursor', () => {
        it('should return null for cursor at start', () => {
            expect(removePlaceholderBeforeCursor('text', 0)).toBeNull();
        });

        it('should return null if not on placeholder', () => {
            expect(removePlaceholderBeforeCursor('text', 2)).toBeNull();
        });

        it('should remove placeholder run before cursor', () => {
            const value = `hello${TOKEN_PLACEHOLDER.repeat(4)}world`;
            const result = removePlaceholderBeforeCursor(value, 7);
            expect(result).not.toBeNull();
            expect(result!.newValue).toBe('helloworld');
        });

        it('should also remove separator before placeholder', () => {
            const value = `hello${TOKEN_SEPARATOR}${TOKEN_PLACEHOLDER.repeat(3)}world`;
            const result = removePlaceholderBeforeCursor(value, 8);
            expect(result).not.toBeNull();
            expect(result!.newValue).toBe('helloworld');
        });
    });

    describe('removePlaceholderAtCursor', () => {
        it('should return null for cursor at end', () => {
            const value = 'text';
            expect(removePlaceholderAtCursor(value, value.length)).toBeNull();
        });

        it('should return null if not on placeholder', () => {
            expect(removePlaceholderAtCursor('text', 1)).toBeNull();
        });

        it('should remove placeholder run at cursor', () => {
            const value = `hello${TOKEN_PLACEHOLDER.repeat(4)}world`;
            const result = removePlaceholderAtCursor(value, 5);
            expect(result).not.toBeNull();
            expect(result!.newValue).toBe('helloworld');
        });
    });

    describe('computeDiffRange', () => {
        it('should handle identical strings', () => {
            const result = computeDiffRange('hello', 'hello');
            expect(result.start).toBe(5);
            expect(result.endPrev).toBe(4);
            expect(result.endNext).toBe(4);
        });

        it('should find insertion point', () => {
            const result = computeDiffRange('helo', 'hello');
            expect(result.start).toBe(3);
            expect(result.endPrev).toBe(2);
            expect(result.endNext).toBe(3);
        });

        it('should find deletion point', () => {
            const result = computeDiffRange('hello', 'helo');
            expect(result.start).toBe(3);
            expect(result.endPrev).toBe(3);
            expect(result.endNext).toBe(2);
        });

        it('should handle replacement', () => {
            const result = computeDiffRange('hello', 'hallo');
            expect(result.start).toBe(1);
            expect(result.endPrev).toBe(1);
            expect(result.endNext).toBe(1);
        });

        it('should handle empty strings', () => {
            const result = computeDiffRange('', 'hello');
            expect(result.start).toBe(0);
            expect(result.endPrev).toBe(-1);
            expect(result.endNext).toBe(4);
        });
    });
});
