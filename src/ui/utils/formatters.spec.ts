import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  formatDuration,
  formatPathForDisplay,
} from './formatters';

describe('formatters', () => {
  describe('formatNumber', () => {
    it('should format numbers with default locale', () => {
      const result = formatNumber(1234567.89, 'en-US');
      expect(result).toBe('1,234,567.89');
    });

    it('should format numbers with specified locale', () => {
      const result = formatNumber(1234567.89, 'de-DE');
      expect(result).toBe('1.234.567,89');
    });

    it('should handle zero', () => {
      expect(formatNumber(0, 'en-US')).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234.56, 'en-US');
      expect(result).toBe('-1,234.56');
    });

    it('should handle large numbers', () => {
      const result = formatNumber(1000000000, 'en-US');
      expect(result).toBe('1,000,000,000');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in USD for en-US locale', () => {
      const result = formatCurrency(1234.56, 'en-US');
      expect(result).toBe('$1,234.56');
    });

    it('should format currency with minimum 2 decimal places', () => {
      const result = formatCurrency(100, 'en-US');
      expect(result).toBe('$100.00');
    });

    it('should format currency with up to 4 decimal places', () => {
      const result = formatCurrency(0.1234, 'en-US');
      expect(result).toBe('$0.1234');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0, 'en-US')).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-50.5, 'en-US');
      expect(result).toBe('-$50.50');
    });
  });

  describe('formatRelativeTime', () => {
    // Note: formatRelativeTime uses Date.now() internally
    // We test with actual dates relative to current time

    it('should format past days', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = formatRelativeTime(date, 'en-US');
      expect(result).toMatch(/\d+ days? ago|yesterday/);
    });

    it('should format future days', () => {
      const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // in 3 days
      const result = formatRelativeTime(date, 'en-US');
      expect(result).toMatch(/in \d+ days/);
    });

    it('should format past hours', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const result = formatRelativeTime(date, 'en-US');
      expect(result).toMatch(/\d+ hours? ago|yesterday/);
    });

    it('should format past minutes', () => {
      const date = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const result = formatRelativeTime(date, 'en-US');
      expect(result).toMatch(/\d+ minutes? ago|\d+ hours? ago|yesterday/);
    });

    it('should format seconds for very recent times', () => {
      const date = new Date(Date.now() - 15 * 1000); // 15 seconds ago
      const result = formatRelativeTime(date, 'en-US');
      expect(result).toMatch(/\d+ seconds? ago|now|\d+ minutes? ago|yesterday/);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(45000)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3661000)).toBe('1h 1m 1s');
      expect(formatDuration(7325000)).toBe('2h 2m 5s');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle exact hour boundaries', () => {
      expect(formatDuration(3600000)).toBe('1h 0m 0s');
    });

    it('should handle exact minute boundaries', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
    });
  });

  describe('formatPathForDisplay', () => {
    describe('relative paths', () => {
      it('should return relative paths as-is', () => {
        expect(formatPathForDisplay('src/utils/file.ts')).toBe('src/utils/file.ts');
        expect(formatPathForDisplay('./test.ts')).toBe('./test.ts');
      });

      it('should handle paths with backslashes', () => {
        expect(formatPathForDisplay('src\\utils\\file.ts')).toBe('src/utils/file.ts');
      });
    });

    describe('absolute paths with cwd', () => {
      it('should convert absolute path to relative when under cwd', () => {
        const result = formatPathForDisplay(
          'D:/projects/myapp/src/file.ts',
          'D:/projects/myapp'
        );
        expect(result).toBe('src/file.ts');
      });

      it('should handle Windows backslashes', () => {
        const result = formatPathForDisplay(
          'D:\\projects\\myapp\\src\\file.ts',
          'D:\\projects\\myapp'
        );
        expect(result).toBe('src/file.ts');
      });

      it('should return dot for exact cwd match with trailing slash', () => {
        const result = formatPathForDisplay(
          'D:/projects/myapp/',
          'D:/projects/myapp'
        );
        expect(result).toBe('.');
      });

      it('should simplify path when cwd equals path exactly', () => {
        // When path equals cwd exactly (no trailing slash), it becomes relative
        const result = formatPathForDisplay(
          'D:/projects/myapp',
          'D:/projects/myapp'
        );
        expect(result).toBe('projects/myapp');
      });

      it('should handle case-insensitive comparison on Windows', () => {
        const result = formatPathForDisplay(
          'd:/Projects/MyApp/src/file.ts',
          'D:/projects/myapp'
        );
        expect(result).toBe('src/file.ts');
      });

      it('should handle Unix-style paths on Windows', () => {
        const result = formatPathForDisplay(
          '/d/projects/myapp/src/file.ts',
          '/d/projects/myapp'
        );
        expect(result).toBe('src/file.ts');
      });
    });

    describe('absolute paths without cwd', () => {
      it('should simplify Windows absolute paths', () => {
        const result = formatPathForDisplay('C:/Users/test/project/file.ts');
        expect(result).toBe('Users/test/project/file.ts');
      });

      it('should simplify Unix-style paths on Windows', () => {
        const result = formatPathForDisplay('/d/projects/file.ts');
        expect(result).toBe('projects/file.ts');
      });

      it('should preserve special directories in Unix paths', () => {
        const result = formatPathForDisplay('/home/user/.claude/config.json');
        expect(result).toBe('.claude/config.json');
      });

      it('should preserve node_modules in path', () => {
        const result = formatPathForDisplay('/home/user/project/node_modules/pkg/index.js');
        expect(result).toBe('node_modules/pkg/index.js');
      });
    });

    describe('edge cases', () => {
      it('should handle empty paths', () => {
        expect(formatPathForDisplay('')).toBe('');
      });

      it('should handle single filename', () => {
        expect(formatPathForDisplay('file.ts')).toBe('file.ts');
      });

      it('should handle paths with trailing slash', () => {
        const result = formatPathForDisplay(
          'D:/projects/myapp/src/',
          'D:/projects/myapp'
        );
        expect(result).toBe('src/');
      });
    });
  });
});
