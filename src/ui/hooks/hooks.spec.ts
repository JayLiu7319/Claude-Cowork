/**
 * Unit tests for React hooks
 * Phase 3 of testing implementation plan
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessageWindow } from './useMessageWindow';
import { useBrandTheme } from './useBrandTheme';
import type { StreamMessage, BrandConfig } from '@ui/types';

// =================================================================
// useMessageWindow Tests
// =================================================================

describe('useMessageWindow', () => {
    // Helper to create mock messages
    const createUserMessage = (prompt: string): StreamMessage => ({
        type: 'user_prompt',
        prompt,
    });

    const createAssistantMessage = (text: string): StreamMessage => ({
        type: 'assistant',
        message: { role: 'assistant', content: text },
    } as StreamMessage);

    describe('basic functionality', () => {
        it('should return empty visibleMessages for empty input', () => {
            const { result } = renderHook(() => useMessageWindow([], null));

            expect(result.current.visibleMessages).toEqual([]);
            expect(result.current.totalMessages).toBe(0);
            expect(result.current.totalUserInputs).toBe(0);
            expect(result.current.hasMoreHistory).toBe(false);
            expect(result.current.isAtBeginning).toBe(false);
        });

        it('should show all messages when fewer than window size', () => {
            const messages: StreamMessage[] = [
                createUserMessage('Hello'),
                createAssistantMessage('Hi there!'),
            ];

            const { result } = renderHook(() => useMessageWindow(messages, 'session-1'));

            expect(result.current.visibleMessages.length).toBe(2);
            expect(result.current.totalMessages).toBe(2);
            expect(result.current.totalUserInputs).toBe(1);
            expect(result.current.hasMoreHistory).toBe(false);
            expect(result.current.isAtBeginning).toBe(true);
        });

        it('should correctly count user inputs', () => {
            const messages: StreamMessage[] = [
                createUserMessage('First'),
                createAssistantMessage('Response 1'),
                createUserMessage('Second'),
                createAssistantMessage('Response 2'),
                createUserMessage('Third'),
            ];

            const { result } = renderHook(() => useMessageWindow(messages, 'session-1'));

            expect(result.current.totalUserInputs).toBe(3);
        });
    });

    describe('message windowing', () => {
        it('should limit visible messages based on window size', () => {
            // Create messages with more than 3 user inputs (window size)
            const messages: StreamMessage[] = [
                createUserMessage('User 1'),
                createAssistantMessage('Response 1'),
                createUserMessage('User 2'),
                createAssistantMessage('Response 2'),
                createUserMessage('User 3'),
                createAssistantMessage('Response 3'),
                createUserMessage('User 4'),
                createAssistantMessage('Response 4'),
                createUserMessage('User 5'),
                createAssistantMessage('Response 5'),
            ];

            const { result } = renderHook(() => useMessageWindow(messages, 'session-1'));

            // Should have more history
            expect(result.current.hasMoreHistory).toBe(true);
            // Should only show last 3 user inputs worth of messages
            expect(result.current.visibleUserInputs).toBe(3);
        });

        it('should preserve originalIndex in visible messages', () => {
            const messages: StreamMessage[] = [
                createUserMessage('User 1'),
                createAssistantMessage('Response 1'),
            ];

            const { result } = renderHook(() => useMessageWindow(messages, 'session-1'));

            expect(result.current.visibleMessages[0].originalIndex).toBe(0);
            expect(result.current.visibleMessages[1].originalIndex).toBe(1);
        });
    });

    describe('load more functionality', () => {
        it('should load more messages when loadMoreMessages is called', async () => {
            // Create 6 user inputs
            const messages: StreamMessage[] = [];
            for (let i = 1; i <= 6; i++) {
                messages.push(createUserMessage(`User ${i}`));
                messages.push(createAssistantMessage(`Response ${i}`));
            }

            const { result } = renderHook(() => useMessageWindow(messages, 'session-1'));

            const initialVisibleCount = result.current.visibleUserInputs;
            expect(initialVisibleCount).toBe(3);

            // Load more
            act(() => {
                result.current.loadMoreMessages();
            });

            // Wait for RAF and timeout
            await waitFor(() => {
                expect(result.current.visibleUserInputs).toBeGreaterThan(initialVisibleCount);
            }, { timeout: 500 });
        });

        it('should not load more when already at beginning', () => {
            const messages: StreamMessage[] = [
                createUserMessage('Hello'),
                createAssistantMessage('Hi'),
            ];

            const { result } = renderHook(() => useMessageWindow(messages, 'session-1'));

            expect(result.current.hasMoreHistory).toBe(false);

            // This should be a no-op
            act(() => {
                result.current.loadMoreMessages();
            });

            expect(result.current.isAtBeginning).toBe(true);
        });
    });

    describe('session change handling', () => {
        it('should reset window on session change', () => {
            // Create 6 user inputs
            const messages: StreamMessage[] = [];
            for (let i = 1; i <= 6; i++) {
                messages.push(createUserMessage(`User ${i}`));
                messages.push(createAssistantMessage(`Response ${i}`));
            }

            const { result, rerender } = renderHook(
                ({ sessionId }) => useMessageWindow(messages, sessionId),
                { initialProps: { sessionId: 'session-1' } }
            );

            // Load more to expand visible window
            act(() => {
                result.current.loadMoreMessages();
            });

            // Change session
            rerender({ sessionId: 'session-2' });

            // Should reset to default window size (3 user inputs)
            expect(result.current.visibleUserInputs).toBe(3);
        });
    });

    describe('resetToLatest', () => {
        it('should reset visible messages to latest', async () => {
            // Create 6 user inputs
            const messages: StreamMessage[] = [];
            for (let i = 1; i <= 6; i++) {
                messages.push(createUserMessage(`User ${i}`));
                messages.push(createAssistantMessage(`Response ${i}`));
            }

            const { result } = renderHook(() => useMessageWindow(messages, 'session-1'));

            // Load more first
            act(() => {
                result.current.loadMoreMessages();
            });

            await waitFor(() => {
                expect(result.current.visibleUserInputs).toBeGreaterThan(3);
            }, { timeout: 500 });

            // Reset to latest
            act(() => {
                result.current.resetToLatest();
            });

            expect(result.current.visibleUserInputs).toBe(3);
        });
    });
});

// =================================================================
// useBrandTheme Tests
// =================================================================

describe('useBrandTheme', () => {
    let originalDocumentTitle: string;

    beforeEach(() => {
        originalDocumentTitle = document.title;
    });

    afterEach(() => {
        document.title = originalDocumentTitle;
        // Clean up CSS custom properties
        const root = document.documentElement;
        root.style.removeProperty('--color-accent');
        root.style.removeProperty('--color-accent-hover');
        root.style.removeProperty('--color-accent-light');
        root.style.removeProperty('--color-accent-subtle');
        root.style.removeProperty('--color-surface');
        root.style.removeProperty('--color-surface-secondary');
        root.style.removeProperty('--color-surface-tertiary');
        root.style.removeProperty('--color-surface-cream');
    });

    const createMockBrandConfig = (overrides?: Partial<BrandConfig>): BrandConfig => ({
        id: 'business',
        name: 'test-brand',
        displayName: 'Test Brand',
        appTitle: 'Test App',
        subtitle: 'Test Subtitle',
        colors: {
            accent: '#ff0000',
            accentHover: '#cc0000',
            accentLight: '#ff6666',
            accentSubtle: '#ffcccc',
        },
        icons: {
            app: 'app-icon.png',
            logo: 'logo.png',
        },
        ...overrides,
    });

    it('should do nothing when brandConfig is null', () => {
        const initialTitle = document.title;

        renderHook(() => useBrandTheme(null));

        expect(document.title).toBe(initialTitle);
    });

    it('should set CSS custom properties for accent colors', () => {
        const brandConfig = createMockBrandConfig();

        renderHook(() => useBrandTheme(brandConfig));

        const root = document.documentElement;
        expect(root.style.getPropertyValue('--color-accent')).toBe('#ff0000');
        expect(root.style.getPropertyValue('--color-accent-hover')).toBe('#cc0000');
        expect(root.style.getPropertyValue('--color-accent-light')).toBe('#ff6666');
        expect(root.style.getPropertyValue('--color-accent-subtle')).toBe('#ffcccc');
    });

    it('should update document title', () => {
        const brandConfig = createMockBrandConfig({ appTitle: 'Custom App Title' });

        renderHook(() => useBrandTheme(brandConfig));

        expect(document.title).toBe('Custom App Title');
    });

    it('should set optional surface colors when provided', () => {
        const brandConfig = createMockBrandConfig({
            colors: {
                accent: '#ff0000',
                accentHover: '#cc0000',
                accentLight: '#ff6666',
                accentSubtle: '#ffcccc',
                surface: '#ffffff',
                surfaceSecondary: '#f0f0f0',
                surfaceTertiary: '#e0e0e0',
                surfaceCream: '#fefefe',
            },
        });

        renderHook(() => useBrandTheme(brandConfig));

        const root = document.documentElement;
        expect(root.style.getPropertyValue('--color-surface')).toBe('#ffffff');
        expect(root.style.getPropertyValue('--color-surface-secondary')).toBe('#f0f0f0');
        expect(root.style.getPropertyValue('--color-surface-tertiary')).toBe('#e0e0e0');
        expect(root.style.getPropertyValue('--color-surface-cream')).toBe('#fefefe');
    });

    it('should not set optional surface colors when not provided', () => {
        const brandConfig = createMockBrandConfig();

        renderHook(() => useBrandTheme(brandConfig));

        const root = document.documentElement;
        expect(root.style.getPropertyValue('--color-surface')).toBe('');
        expect(root.style.getPropertyValue('--color-surface-secondary')).toBe('');
    });

    it('should update when brandConfig changes', () => {
        const brandConfig1 = createMockBrandConfig({ appTitle: 'App 1' });
        const brandConfig2 = createMockBrandConfig({ appTitle: 'App 2' });

        const { rerender } = renderHook(
            ({ config }) => useBrandTheme(config),
            { initialProps: { config: brandConfig1 } }
        );

        expect(document.title).toBe('App 1');

        rerender({ config: brandConfig2 });

        expect(document.title).toBe('App 2');
    });
});
