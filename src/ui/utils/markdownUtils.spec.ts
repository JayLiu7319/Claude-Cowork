import { describe, it, expect } from 'vitest';
import { isMarkdown } from './markdownUtils';

describe('markdownUtils', () => {
    describe('isMarkdown', () => {
        describe('headers', () => {
            it('should detect h1 headers', () => {
                expect(isMarkdown('# Title')).toBe(true);
            });

            it('should detect h2 headers', () => {
                expect(isMarkdown('## Subtitle')).toBe(true);
            });

            it('should detect h3 headers', () => {
                expect(isMarkdown('### Section')).toBe(true);
            });

            it('should detect h4-h6 headers', () => {
                expect(isMarkdown('#### H4')).toBe(true);
                expect(isMarkdown('##### H5')).toBe(true);
                expect(isMarkdown('###### H6')).toBe(true);
            });

            it('should require space after hash for headers', () => {
                expect(isMarkdown('#NoSpace')).toBe(false);
            });

            it('should detect headers in multiline text', () => {
                expect(isMarkdown('Some text\n# Header\nMore text')).toBe(true);
            });
        });

        describe('code blocks', () => {
            it('should detect fenced code blocks with language', () => {
                expect(isMarkdown('```javascript\ncode\n```')).toBe(true);
            });

            it('should detect fenced code blocks without language', () => {
                expect(isMarkdown('```\nplain code\n```')).toBe(true);
            });

            it('should detect code blocks with content', () => {
                expect(isMarkdown('Some text\n```python\ndef foo():\n    pass\n```')).toBe(true);
            });
        });

        describe('plain text', () => {
            it('should return false for plain text', () => {
                expect(isMarkdown('Just plain text')).toBe(false);
            });

            it('should return false for text without markdown', () => {
                expect(isMarkdown('No markdown here')).toBe(false);
            });

            it('should return false for text with hash not as header', () => {
                expect(isMarkdown('Issue #123 is fixed')).toBe(false);
            });

            it('should return false for text with backticks but not code blocks', () => {
                expect(isMarkdown('Use `code` inline')).toBe(false);
            });
        });

        describe('edge cases', () => {
            it('should return false for empty string', () => {
                expect(isMarkdown('')).toBe(false);
            });

            it('should return false for null', () => {
                expect(isMarkdown(null as unknown as string)).toBe(false);
            });

            it('should return false for undefined', () => {
                expect(isMarkdown(undefined as unknown as string)).toBe(false);
            });

            it('should return false for non-string types', () => {
                expect(isMarkdown(123 as unknown as string)).toBe(false);
                expect(isMarkdown({} as unknown as string)).toBe(false);
                expect(isMarkdown([] as unknown as string)).toBe(false);
            });

            it('should handle whitespace-only strings', () => {
                expect(isMarkdown('   ')).toBe(false);
                expect(isMarkdown('\n\n')).toBe(false);
            });
        });
    });
});
