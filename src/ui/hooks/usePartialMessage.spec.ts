/**
 * Extended tests for React hooks - usePartialMessage
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePartialMessage } from './usePartialMessage';
import type { ServerEvent, StreamMessage } from '@ui/types';

describe('usePartialMessage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial state', () => {
        it('should return empty partial message initially', () => {
            const { result } = renderHook(() =>
                usePartialMessage({ activeSessionId: 'session-1', shouldAutoScroll: true })
            );

            expect(result.current.partialMessage).toBe('');
            expect(result.current.showPartialMessage).toBe(false);
        });

        it('should provide handlePartialMessages function', () => {
            const { result } = renderHook(() =>
                usePartialMessage({ activeSessionId: 'session-1', shouldAutoScroll: true })
            );

            expect(typeof result.current.handlePartialMessages).toBe('function');
        });
    });

    describe('handlePartialMessages', () => {
        it('should ignore non-stream.message events', () => {
            const { result } = renderHook(() =>
                usePartialMessage({ activeSessionId: 'session-1', shouldAutoScroll: true })
            );

            const event: ServerEvent = {
                type: 'session.status',
                payload: { sessionId: 'session-1', status: 'running' }
            };

            act(() => {
                result.current.handlePartialMessages(event);
            });

            expect(result.current.showPartialMessage).toBe(false);
        });

        it('should ignore events from different sessions', () => {
            const { result } = renderHook(() =>
                usePartialMessage({ activeSessionId: 'session-1', shouldAutoScroll: true })
            );

            const event: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'different-session',
                    message: {
                        type: 'stream_event',
                        event: { type: 'content_block_start' }
                    } as StreamMessage
                }
            };

            act(() => {
                result.current.handlePartialMessages(event);
            });

            expect(result.current.showPartialMessage).toBe(false);
        });

        it('should set showPartialMessage true on content_block_start', () => {
            const { result } = renderHook(() =>
                usePartialMessage({ activeSessionId: 'session-1', shouldAutoScroll: true })
            );

            const event: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'session-1',
                    message: {
                        type: 'stream_event',
                        event: { type: 'content_block_start' }
                    } as StreamMessage
                }
            };

            act(() => {
                result.current.handlePartialMessages(event);
            });

            expect(result.current.showPartialMessage).toBe(true);
            expect(result.current.partialMessage).toBe('');
        });

        it('should call onContentUpdate callback on delta', () => {
            const onContentUpdate = vi.fn();
            const { result } = renderHook(() =>
                usePartialMessage({
                    activeSessionId: 'session-1',
                    shouldAutoScroll: true,
                    onContentUpdate
                })
            );

            const deltaEvent: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'session-1',
                    message: {
                        type: 'stream_event',
                        event: {
                            type: 'content_block_delta',
                            delta: { type: 'text_delta', text: 'test' }
                        }
                    } as StreamMessage
                }
            };

            act(() => {
                result.current.handlePartialMessages(deltaEvent);
            });

            expect(onContentUpdate).toHaveBeenCalled();
        });

        it('should reset on content_block_stop', () => {
            const { result } = renderHook(() =>
                usePartialMessage({ activeSessionId: 'session-1', shouldAutoScroll: true })
            );

            // Start
            act(() => {
                const startEvent: ServerEvent = {
                    type: 'stream.message',
                    payload: {
                        sessionId: 'session-1',
                        message: {
                            type: 'stream_event',
                            event: { type: 'content_block_start' }
                        } as StreamMessage
                    }
                };
                result.current.handlePartialMessages(startEvent);
            });

            expect(result.current.showPartialMessage).toBe(true);

            // Stop
            const stopEvent: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'session-1',
                    message: {
                        type: 'stream_event',
                        event: { type: 'content_block_stop' }
                    } as StreamMessage
                }
            };

            act(() => {
                result.current.handlePartialMessages(stopEvent);
            });

            expect(result.current.showPartialMessage).toBe(false);
            expect(result.current.partialMessage).toBe('');
        });
    });

    describe('session change', () => {
        it('should reset state when activeSessionId changes', async () => {
            const { result, rerender } = renderHook(
                ({ sessionId }) => usePartialMessage({ activeSessionId: sessionId, shouldAutoScroll: true }),
                { initialProps: { sessionId: 'session-1' } }
            );

            // Simulate some state
            const startEvent: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'session-1',
                    message: {
                        type: 'stream_event',
                        event: { type: 'content_block_start' }
                    } as StreamMessage
                }
            };

            act(() => {
                result.current.handlePartialMessages(startEvent);
            });

            expect(result.current.showPartialMessage).toBe(true);

            // Change session
            rerender({ sessionId: 'session-2' });

            // Advance timers to trigger the setTimeout
            await act(async () => {
                vi.advanceTimersByTime(10);
            });

            expect(result.current.showPartialMessage).toBe(false);
            expect(result.current.partialMessage).toBe('');
        });
    });

    describe('non-stream_event messages', () => {
        it('should ignore messages that are not stream_event type', () => {
            const { result } = renderHook(() =>
                usePartialMessage({ activeSessionId: 'session-1', shouldAutoScroll: true })
            );

            const event: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'session-1',
                    message: { type: 'assistant', message: { role: 'assistant', content: 'hi' } } as StreamMessage
                }
            };

            act(() => {
                result.current.handlePartialMessages(event);
            });

            expect(result.current.showPartialMessage).toBe(false);
        });
    });
});
