import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractTodosFromMessage, aggregateTodos } from './todo-extractor';
import type { StreamMessage } from '../index';

describe('todo-extractor', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-04T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('extractTodosFromMessage', () => {
        it('should extract todos from TodoWrite tool', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'todo_1',
                            name: 'TodoWrite',
                            input: {
                                todos: [
                                    { content: 'Task 1', status: 'pending' },
                                    { content: 'Task 2', status: 'in_progress' },
                                ],
                            },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractTodosFromMessage(message, 0);
            expect(result).toHaveLength(2);
            expect(result[0].content).toBe('Task 1');
            expect(result[0].status).toBe('pending');
            expect(result[0].taskIndex).toBe(0);
            expect(result[1].content).toBe('Task 2');
            expect(result[1].status).toBe('in_progress');
            expect(result[1].taskIndex).toBe(1);
        });

        it('should default status to pending', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'todo_1',
                            name: 'TodoWrite',
                            input: {
                                todos: [{ content: 'Task without status' }],
                            },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractTodosFromMessage(message, 0);
            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('pending');
        });

        it('should return empty array for non-TodoWrite tools', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_1',
                            name: 'Write',
                            input: { file_path: '/file.ts' },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractTodosFromMessage(message, 0);
            expect(result).toHaveLength(0);
        });

        it('should return empty array for user prompt message', () => {
            const message: StreamMessage = {
                type: 'user_prompt',
                prompt: 'Hello',
            };

            const result = extractTodosFromMessage(message, 0);
            expect(result).toHaveLength(0);
        });

        it('should skip todos without content', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'todo_1',
                            name: 'TodoWrite',
                            input: {
                                todos: [
                                    { content: 'Valid task' },
                                    { status: 'pending' }, // No content
                                    null,
                                ],
                            },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractTodosFromMessage(message, 0);
            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('Valid task');
        });

        it('should include correct message index', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'todo_1',
                            name: 'TodoWrite',
                            input: {
                                todos: [{ content: 'Task' }],
                            },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractTodosFromMessage(message, 5);
            expect(result[0].messageIndex).toBe(5);
        });
    });

    describe('aggregateTodos', () => {
        it('should aggregate todos from multiple messages', () => {
            const messages: StreamMessage[] = [
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'todo_1',
                                name: 'TodoWrite',
                                input: { todos: [{ content: 'Task 1' }] },
                            },
                        ],
                    },
                } as StreamMessage,
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'todo_2',
                                name: 'TodoWrite',
                                input: { todos: [{ content: 'Task 2' }] },
                            },
                        ],
                    },
                } as StreamMessage,
            ];

            const result = aggregateTodos(messages);
            expect(result).toHaveLength(2);
        });

        it('should deduplicate todos by content, keeping first occurrence index', () => {
            const messages: StreamMessage[] = [
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'todo_1',
                                name: 'TodoWrite',
                                input: { todos: [{ content: 'Same task', status: 'pending' }] },
                            },
                        ],
                    },
                } as StreamMessage,
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'todo_2',
                                name: 'TodoWrite',
                                input: { todos: [{ content: 'Same task', status: 'completed' }] },
                            },
                        ],
                    },
                } as StreamMessage,
            ];

            const result = aggregateTodos(messages);
            expect(result).toHaveLength(1);
            // Status should be updated to completed (from second message)
            expect(result[0].status).toBe('completed');
            // But messageIndex should be from first occurrence
            expect(result[0].messageIndex).toBe(0);
        });

        it('should sort by message index then task index', () => {
            const messages: StreamMessage[] = [
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'todo_1',
                                name: 'TodoWrite',
                                input: {
                                    todos: [
                                        { content: 'Task 1a' },
                                        { content: 'Task 1b' },
                                    ],
                                },
                            },
                        ],
                    },
                } as StreamMessage,
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'todo_2',
                                name: 'TodoWrite',
                                input: { todos: [{ content: 'Task 2' }] },
                            },
                        ],
                    },
                } as StreamMessage,
            ];

            const result = aggregateTodos(messages);
            expect(result).toHaveLength(3);
            expect(result[0].content).toBe('Task 1a');
            expect(result[1].content).toBe('Task 1b');
            expect(result[2].content).toBe('Task 2');
        });

        it('should handle empty messages array', () => {
            const result = aggregateTodos([]);
            expect(result).toHaveLength(0);
        });
    });
});
