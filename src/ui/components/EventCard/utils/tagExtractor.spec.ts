/**
 * Unit tests for tagExtractor utility
 */
import { describe, it, expect } from 'vitest';
import { extractTagContent } from './tagExtractor';

describe('tagExtractor', () => {
    describe('extractTagContent', () => {
        it('should extract content from simple tags', () => {
            const input = '<thinking>This is my thought process</thinking>';
            expect(extractTagContent(input, 'thinking')).toBe('This is my thought process');
        });

        it('should extract content from nested text', () => {
            const input = 'Some prefix <result>extracted value</result> some suffix';
            expect(extractTagContent(input, 'result')).toBe('extracted value');
        });

        it('should return null when tag is not found', () => {
            const input = 'No tags here';
            expect(extractTagContent(input, 'thinking')).toBeNull();
        });

        it('should return null for empty input', () => {
            expect(extractTagContent('', 'tag')).toBeNull();
        });

        it('should handle multiline content', () => {
            const input = `<code>
function hello() {
    console.log("world");
}
</code>`;
            const expected = `
function hello() {
    console.log("world");
}
`;
            expect(extractTagContent(input, 'code')).toBe(expected);
        });

        it('should handle empty tag content', () => {
            const input = '<empty></empty>';
            expect(extractTagContent(input, 'empty')).toBe('');
        });

        it('should extract first occurrence when multiple tags exist', () => {
            const input = '<item>first</item> <item>second</item>';
            expect(extractTagContent(input, 'item')).toBe('first');
        });

        it('should handle tags with special characters in content', () => {
            const input = '<data>value with <, >, & symbols</data>';
            expect(extractTagContent(input, 'data')).toBe('value with <, >, & symbols');
        });

        it('should handle tags with whitespace', () => {
            const input = '<tag>   spaces around   </tag>';
            expect(extractTagContent(input, 'tag')).toBe('   spaces around   ');
        });

        it('should return null for unclosed tags', () => {
            const input = '<open>content without closing';
            expect(extractTagContent(input, 'open')).toBeNull();
        });

        it('should return null for mismatched tags', () => {
            const input = '<start>content</end>';
            expect(extractTagContent(input, 'start')).toBeNull();
        });

        it('should handle different tag names', () => {
            expect(extractTagContent('<a>A</a>', 'a')).toBe('A');
            expect(extractTagContent('<longTagName>content</longTagName>', 'longTagName')).toBe('content');
            expect(extractTagContent('<tag-with-dash>value</tag-with-dash>', 'tag-with-dash')).toBe('value');
        });

        it('should cache regex for repeated calls with same tag', () => {
            // This tests that the caching works without errors
            const input = '<test>value</test>';
            expect(extractTagContent(input, 'test')).toBe('value');
            expect(extractTagContent(input, 'test')).toBe('value');
            expect(extractTagContent('<test>other</test>', 'test')).toBe('other');
        });
    });
});
