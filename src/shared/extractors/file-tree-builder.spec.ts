import { describe, it, expect } from 'vitest';
import {
    createEmptyFileTreeNode,
    findNodeByPath,
    updateFileTreeWithOperations,
    toggleNodeExpanded,
    buildInitialFileTree,
} from './file-tree-builder';
import type { FileTreeNode, FileChangeData } from '../index';

describe('file-tree-builder', () => {
    describe('createEmptyFileTreeNode', () => {
        it('should create a file node', () => {
            const node = createEmptyFileTreeNode('/path/to/file.ts', 'file.ts', false);
            expect(node.path).toBe('/path/to/file.ts');
            expect(node.name).toBe('file.ts');
            expect(node.isDirectory).toBe(false);
            expect(node.children).toEqual({});
            expect(node.isExpanded).toBe(false);
            expect(node.hasRecentOperation).toBe(false);
        });

        it('should create a directory node with isExpanded true', () => {
            const node = createEmptyFileTreeNode('/path/to/dir', 'dir', true);
            expect(node.isDirectory).toBe(true);
            expect(node.isExpanded).toBe(true);
        });
    });

    describe('findNodeByPath', () => {
        const createTestTree = (): FileTreeNode => ({
            path: '/root',
            name: 'root',
            isDirectory: true,
            children: {
                src: {
                    path: '/root/src',
                    name: 'src',
                    isDirectory: true,
                    children: {
                        'index.ts': {
                            path: '/root/src/index.ts',
                            name: 'index.ts',
                            isDirectory: false,
                            children: {},
                            isExpanded: false,
                            hasRecentOperation: false,
                        },
                    },
                    isExpanded: true,
                    hasRecentOperation: false,
                },
            },
            isExpanded: true,
            hasRecentOperation: false,
        });

        it('should find root node', () => {
            const tree = createTestTree();
            const result = findNodeByPath(tree, '/root');
            expect(result).toBe(tree);
        });

        it('should find nested directory', () => {
            const tree = createTestTree();
            const result = findNodeByPath(tree, '/root/src');
            expect(result?.name).toBe('src');
        });

        it('should find nested file', () => {
            const tree = createTestTree();
            const result = findNodeByPath(tree, '/root/src/index.ts');
            expect(result?.name).toBe('index.ts');
        });

        it('should return null for non-existent path', () => {
            const tree = createTestTree();
            const result = findNodeByPath(tree, '/root/nonexistent');
            expect(result).toBeNull();
        });

        it('should normalize paths with backslashes', () => {
            const tree = createTestTree();
            const result = findNodeByPath(tree, '\\root\\src\\index.ts');
            expect(result?.name).toBe('index.ts');
        });
    });

    describe('updateFileTreeWithOperations', () => {
        const createTestTree = (): FileTreeNode => ({
            path: '/root',
            name: 'root',
            isDirectory: true,
            children: {},
            isExpanded: true,
            hasRecentOperation: false,
        });

        it('should add new file on create operation', () => {
            const tree = createTestTree();
            const changes: FileChangeData[] = [
                {
                    id: 'change1',
                    filePath: 'src/new-file.ts',
                    operationType: 'create',
                    toolName: 'Write',
                    messageIndex: 0,
                    timestamp: Date.now(),
                },
            ];

            const result = updateFileTreeWithOperations(tree, changes);
            expect(result.children['src']).toBeDefined();
            expect(result.children['src'].children['new-file.ts']).toBeDefined();
            expect(result.children['src'].children['new-file.ts'].hasRecentOperation).toBe(true);
        });

        it('should mark existing file on modify operation', () => {
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

            const changes: FileChangeData[] = [
                {
                    id: 'change1',
                    filePath: '/root/existing.ts', // Full path for findNodeByPath to match
                    operationType: 'modify',
                    toolName: 'Edit',
                    messageIndex: 1,
                    timestamp: Date.now(),
                },
            ];

            const result = updateFileTreeWithOperations(tree, changes);
            expect(result.children['existing.ts'].hasRecentOperation).toBe(true);
            expect(result.children['existing.ts'].lastOperationIndex).toBe(1);
        });

        it('should remove file on delete operation', () => {
            const tree: FileTreeNode = {
                path: '/root',
                name: 'root',
                isDirectory: true,
                children: {
                    'to-delete.ts': {
                        path: '/root/to-delete.ts',
                        name: 'to-delete.ts',
                        isDirectory: false,
                        children: {},
                        isExpanded: false,
                        hasRecentOperation: false,
                    },
                },
                isExpanded: true,
                hasRecentOperation: false,
            };

            const changes: FileChangeData[] = [
                {
                    id: 'change1',
                    filePath: 'to-delete.ts',
                    operationType: 'delete',
                    toolName: 'Bash',
                    messageIndex: 0,
                    timestamp: Date.now(),
                },
            ];

            const result = updateFileTreeWithOperations(tree, changes);
            expect(result.children['to-delete.ts']).toBeUndefined();
        });

        it('should not mutate original tree', () => {
            const tree = createTestTree();
            const changes: FileChangeData[] = [
                {
                    id: 'change1',
                    filePath: 'new.ts',
                    operationType: 'create',
                    toolName: 'Write',
                    messageIndex: 0,
                    timestamp: Date.now(),
                },
            ];

            updateFileTreeWithOperations(tree, changes);
            expect(tree.children['new.ts']).toBeUndefined();
        });
    });

    describe('toggleNodeExpanded', () => {
        it('should toggle directory expanded state', () => {
            const tree: FileTreeNode = {
                path: '/root',
                name: 'root',
                isDirectory: true,
                children: {},
                isExpanded: true,
                hasRecentOperation: false,
            };

            const result = toggleNodeExpanded(tree, '/root');
            expect(result.isExpanded).toBe(false);
        });

        it('should not toggle file nodes', () => {
            const tree: FileTreeNode = {
                path: '/root',
                name: 'root',
                isDirectory: true,
                children: {
                    'file.ts': {
                        path: '/root/file.ts',
                        name: 'file.ts',
                        isDirectory: false,
                        children: {},
                        isExpanded: false,
                        hasRecentOperation: false,
                    },
                },
                isExpanded: true,
                hasRecentOperation: false,
            };

            const result = toggleNodeExpanded(tree, '/root/file.ts');
            expect(result.children['file.ts'].isExpanded).toBe(false);
        });
    });

    describe('buildInitialFileTree', () => {
        it('should create root from cwd path', () => {
            const tree = buildInitialFileTree('/projects/myapp');
            expect(tree.path).toBe('/projects/myapp');
            expect(tree.name).toBe('myapp');
            expect(tree.isDirectory).toBe(true);
        });

        it('should add initial files', () => {
            const tree = buildInitialFileTree('/root', ['src/index.ts', 'README.md']);
            expect(tree.children['src']).toBeDefined();
            expect(tree.children['src'].children['index.ts']).toBeDefined();
            expect(tree.children['README.md']).toBeDefined();
        });

        it('should handle empty files array', () => {
            const tree = buildInitialFileTree('/root', []);
            expect(Object.keys(tree.children)).toHaveLength(0);
        });

        it('should normalize Windows paths', () => {
            const tree = buildInitialFileTree('D:\\projects\\myapp');
            expect(tree.path).toBe('D:/projects/myapp');
        });
    });
});
