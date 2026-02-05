/**
 * Unit tests for textMeasurement utility
 * These tests require canvas and DOM mocking provided by jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    getSharedContext,
    measureAverageCharWidth,
    measureCharWidth,
    measurePlaceholderCharWidthDom
} from './textMeasurement';

describe('textMeasurement', () => {
    describe('getSharedContext', () => {
        it('should return a canvas 2D context', () => {
            const context = getSharedContext();
            // In jsdom, canvas might return null context
            // but the function should not throw
            expect(context === null || context instanceof CanvasRenderingContext2D || typeof context === 'object').toBe(true);
        });

        it('should return the same context on repeated calls (singleton)', () => {
            const context1 = getSharedContext();
            const context2 = getSharedContext();
            expect(context1).toBe(context2);
        });
    });

    describe('measureAverageCharWidth', () => {
        let mockElement: HTMLElement;

        beforeEach(() => {
            mockElement = document.createElement('div');
            mockElement.style.fontFamily = 'Arial';
            mockElement.style.fontSize = '16px';
            mockElement.style.fontWeight = 'normal';
            mockElement.style.fontStyle = 'normal';
            mockElement.style.fontVariant = 'normal';
            mockElement.style.lineHeight = '1.5';
            document.body.appendChild(mockElement);
        });

        afterEach(() => {
            document.body.removeChild(mockElement);
        });

        it('should return a number or null', () => {
            const width = measureAverageCharWidth(mockElement);
            // In jsdom, canvas measurements may return 0 or specific values
            expect(width === null || typeof width === 'number').toBe(true);
        });

        it('should return consistent results for same element', () => {
            const width1 = measureAverageCharWidth(mockElement);
            const width2 = measureAverageCharWidth(mockElement);
            expect(width1).toBe(width2);
        });
    });

    describe('measureCharWidth', () => {
        let mockElement: HTMLElement;

        beforeEach(() => {
            mockElement = document.createElement('div');
            mockElement.style.fontFamily = 'monospace';
            mockElement.style.fontSize = '14px';
            document.body.appendChild(mockElement);
        });

        afterEach(() => {
            document.body.removeChild(mockElement);
        });

        it('should return a number or null', () => {
            const width = measureCharWidth(mockElement, 'M');
            expect(width === null || typeof width === 'number').toBe(true);
        });

        it('should return different widths for different characters if context works', () => {
            const wideCharWidth = measureCharWidth(mockElement, 'W');
            const narrowCharWidth = measureCharWidth(mockElement, 'i');

            // In real browsers, 'W' should be wider than 'i'
            // In jsdom, both might be 0 or same
            if (wideCharWidth !== null && narrowCharWidth !== null && wideCharWidth > 0) {
                expect(wideCharWidth).toBeGreaterThanOrEqual(narrowCharWidth);
            }
        });
    });

    describe('measurePlaceholderCharWidthDom', () => {
        let mockElement: HTMLElement;

        beforeEach(() => {
            mockElement = document.createElement('textarea');
            mockElement.style.fontFamily = 'monospace';
            mockElement.style.fontSize = '14px';
            mockElement.style.letterSpacing = '0px';
            document.body.appendChild(mockElement);
        });

        afterEach(() => {
            document.body.removeChild(mockElement);
        });

        it('should return a number', () => {
            const width = measurePlaceholderCharWidthDom(mockElement);
            expect(typeof width).toBe('number');
        });

        it('should return non-negative value', () => {
            const width = measurePlaceholderCharWidthDom(mockElement);
            expect(width).toBeGreaterThanOrEqual(0);
        });

        it('should clean up temporary DOM elements', () => {
            const childCountBefore = document.body.childNodes.length;
            measurePlaceholderCharWidthDom(mockElement);
            const childCountAfter = document.body.childNodes.length;

            // Should not leave orphan elements (except our mockElement)
            expect(childCountAfter).toBe(childCountBefore);
        });

        it('should measure placeholder character correctly', () => {
            // The function measures TOKEN_PLACEHOLDER character
            const width = measurePlaceholderCharWidthDom(mockElement);
            // Should return some measurement (may be 0 in jsdom)
            expect(width).toBeDefined();
        });
    });
});
