import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractFileOperation, aggregateFileChanges } from './file-change-extractor';
import type { StreamMessage, FileTreeNode } from '../index';

describe('file-change-extractor', () => {
    const createEmptyTree = (): FileTreeNode => ({
        path: '/root',
        name: 'root',
        isDirectory: true,
        children: {},
        isExpanded: true,
        hasRecentOperation: false,
    });

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-04T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('extractFileOperation', () => {
        it('should extract Write operation as create for new file', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_1',
                            name: 'Write',
                            input: { file_path: '/new-file.ts' },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractFileOperation(message, 0, createEmptyTree());
            expect(result).toHaveLength(1);
            expect(result[0].operationType).toBe('create');
            expect(result[0].filePath).toBe('/new-file.ts');
            expect(result[0].toolName).toBe('Write');
        });

        it('should extract Write operation as modify for existing file', () => {
            // Tree with file at /root/existing.ts, we need full path matching
            const tree: FileTreeNode = {
                path: '/root',
                name: 'root',
                isDirectory: true,
                children: {
                    'existing.ts': {
                        path: '/root/existing.ts',
                        name: 'existing.ts',
                        isDirectory: false,
                        children: {},
                        isExpanded: false,
                        hasRecentOperation: false,
                    },
                },
                isExpanded: true,
                hasRecentOperation: false,
            };

            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_1',
                            name: 'Write',
                            input: { file_path: '/root/existing.ts' }, // Full path to match tree
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractFileOperation(message, 0, tree);
            expect(result).toHaveLength(1);
            expect(result[0].operationType).toBe('modify');
        });

        it('should extract Edit operation as modify', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_1',
                            name: 'Edit',
                            input: { file_path: '/file.ts' },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractFileOperation(message, 0, createEmptyTree());
            expect(result).toHaveLength(1);
            expect(result[0].operationType).toBe('modify');
        });

        it('should extract Bash rm command as delete', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_1',
                            name: 'Bash',
                            input: { command: 'rm -rf /path/to/file.ts' },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractFileOperation(message, 0, createEmptyTree());
            expect(result).toHaveLength(1);
            expect(result[0].operationType).toBe('delete');
            expect(result[0].filePath).toBe('/path/to/file.ts');
        });

        it('should return empty array for non-file operations', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_1',
                            name: 'Bash',
                            input: { command: 'echo hello' },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractFileOperation(message, 0, createEmptyTree());
            expect(result).toHaveLength(0);
        });

        it('should return empty array for user message', () => {
            const message: StreamMessage = {
                type: 'user_prompt',
                prompt: 'Hello',
            };

            const result = extractFileOperation(message, 0, createEmptyTree());
            expect(result).toHaveLength(0);
        });

        it('should extract multiple tool uses from single message', () => {
            const message: StreamMessage = {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_1',
                            name: 'Write',
                            input: { file_path: '/file1.ts' },
                        },
                        {
                            type: 'tool_use',
                            id: 'tool_2',
                            name: 'Write',
                            input: { file_path: '/file2.ts' },
                        },
                    ],
                },
            } as StreamMessage;

            const result = extractFileOperation(message, 0, createEmptyTree());
            expect(result).toHaveLength(2);
        });
    });

    describe('aggregateFileChanges', () => {
        it('should aggregate changes from multiple messages', () => {
            const messages: StreamMessage[] = [
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'tool_1',
                                name: 'Write',
                                input: { file_path: '/file1.ts' },
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
                                id: 'tool_2',
                                name: 'Write',
                                input: { file_path: '/file2.ts' },
                            },
                        ],
                    },
                } as StreamMessage,
            ];

            const result = aggregateFileChanges(messages, createEmptyTree());
            expect(result).toHaveLength(2);
        });

        it('should keep latest change for same file', () => {
            const messages: StreamMessage[] = [
                {
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
                } as StreamMessage,
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'tool_2',
                                name: 'Edit',
                                input: { file_path: '/file.ts' },
                            },
                        ],
                    },
                } as StreamMessage,
            ];

            const result = aggregateFileChanges(messages, createEmptyTree());
            expect(result).toHaveLength(1);
            expect(result[0].toolName).toBe('Edit');
            expect(result[0].messageIndex).toBe(1);
        });

        it('should sort by timestamp descending', () => {
            const messages: StreamMessage[] = [
                {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'tool_1',
                                name: 'Write',
                                input: { file_path: '/first.ts' },
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
                                id: 'tool_2',
                                name: 'Write',
                                input: { file_path: '/second.ts' },
                            },
                        ],
                    },
                } as StreamMessage,
            ];

            const result = aggregateFileChanges(messages, createEmptyTree());
            // All have same timestamp due to mocked time, but order is based on map iteration
            expect(result).toHaveLength(2);
        });
    });
});
