/**
 * Unit tests for Zustand store (useAppStore)
 * Phase 4 of testing implementation plan
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAppStore } from './useAppStore';
import type { ServerEvent, SessionInfo, StreamMessage, TodoItemData, FileChangeData, FileTreeNode } from '@ui/types';

// Helper to reset store between tests
const resetStore = () => {
    useAppStore.setState({
        sessions: {},
        activeSessionId: null,
        prompt: '',
        cwd: '',
        defaultCwd: '',
        pendingStart: false,
        globalError: null,
        sessionsLoaded: false,
        showStartModal: false,
        showSettingsModal: false,
        historyRequested: new Set(),
        apiConfigChecked: false,
        rightPanelActiveTab: 'tasksfiles',
        planMode: false,
        availableCommands: [],
        availableSkills: [],
        recentFiles: [],
        brandConfig: null,
        lastFileRefresh: 0,
        isSidebarOpen: true,
        isRightPanelOpen: true,
        isMobile: false,
        panelExpanded: { tasks: true, files: true, directory: true },
        ipcConnected: false,
    });
};

describe('useAppStore', () => {
    beforeEach(() => {
        resetStore();
    });

    // =================================================================
    // Basic State Setters
    // =================================================================
    describe('basic state setters', () => {
        it('setPrompt should update prompt', () => {
            act(() => {
                useAppStore.getState().setPrompt('Hello world');
            });
            expect(useAppStore.getState().prompt).toBe('Hello world');
        });

        it('setCwd should update cwd', () => {
            act(() => {
                useAppStore.getState().setCwd('/path/to/project');
            });
            expect(useAppStore.getState().cwd).toBe('/path/to/project');
        });

        it('setDefaultCwd should update defaultCwd', () => {
            act(() => {
                useAppStore.getState().setDefaultCwd('/default/path');
            });
            expect(useAppStore.getState().defaultCwd).toBe('/default/path');
        });

        it('setPendingStart should update pendingStart', () => {
            act(() => {
                useAppStore.getState().setPendingStart(true);
            });
            expect(useAppStore.getState().pendingStart).toBe(true);
        });

        it('setGlobalError should update globalError', () => {
            act(() => {
                useAppStore.getState().setGlobalError('Something went wrong');
            });
            expect(useAppStore.getState().globalError).toBe('Something went wrong');
        });

        it('setShowStartModal should update showStartModal', () => {
            act(() => {
                useAppStore.getState().setShowStartModal(true);
            });
            expect(useAppStore.getState().showStartModal).toBe(true);
        });

        it('setActiveSessionId should update activeSessionId', () => {
            act(() => {
                useAppStore.getState().setActiveSessionId('session-123');
            });
            expect(useAppStore.getState().activeSessionId).toBe('session-123');
        });

        it('setPlanMode should update planMode', () => {
            act(() => {
                useAppStore.getState().setPlanMode(true);
            });
            expect(useAppStore.getState().planMode).toBe(true);
        });

        it('setRightPanelActiveTab should update rightPanelActiveTab', () => {
            act(() => {
                useAppStore.getState().setRightPanelActiveTab('tree');
            });
            expect(useAppStore.getState().rightPanelActiveTab).toBe('tree');
        });
    });

    // =================================================================
    // Layout Actions
    // =================================================================
    describe('layout actions', () => {
        it('setSidebarOpen should update isSidebarOpen', () => {
            act(() => {
                useAppStore.getState().setSidebarOpen(false);
            });
            expect(useAppStore.getState().isSidebarOpen).toBe(false);
        });

        it('setRightPanelOpen should update isRightPanelOpen', () => {
            act(() => {
                useAppStore.getState().setRightPanelOpen(false);
            });
            expect(useAppStore.getState().isRightPanelOpen).toBe(false);
        });

        it('setIsMobile should update isMobile', () => {
            act(() => {
                useAppStore.getState().setIsMobile(true);
            });
            expect(useAppStore.getState().isMobile).toBe(true);
        });

        it('toggleSidebar should toggle isSidebarOpen', () => {
            expect(useAppStore.getState().isSidebarOpen).toBe(true);
            act(() => {
                useAppStore.getState().toggleSidebar();
            });
            expect(useAppStore.getState().isSidebarOpen).toBe(false);
            act(() => {
                useAppStore.getState().toggleSidebar();
            });
            expect(useAppStore.getState().isSidebarOpen).toBe(true);
        });

        it('toggleRightPanel should toggle isRightPanelOpen', () => {
            expect(useAppStore.getState().isRightPanelOpen).toBe(true);
            act(() => {
                useAppStore.getState().toggleRightPanel();
            });
            expect(useAppStore.getState().isRightPanelOpen).toBe(false);
        });
    });

    // =================================================================
    // Panel Expanded Actions
    // =================================================================
    describe('panel expanded actions', () => {
        it('setPanelExpanded should update specific panel', () => {
            act(() => {
                useAppStore.getState().setPanelExpanded('tasks', false);
            });
            expect(useAppStore.getState().panelExpanded.tasks).toBe(false);
            expect(useAppStore.getState().panelExpanded.files).toBe(true);
        });

        it('togglePanelExpanded should toggle specific panel', () => {
            expect(useAppStore.getState().panelExpanded.files).toBe(true);
            act(() => {
                useAppStore.getState().togglePanelExpanded('files');
            });
            expect(useAppStore.getState().panelExpanded.files).toBe(false);
        });
    });

    // =================================================================
    // Session Management
    // =================================================================
    describe('session management', () => {
        it('markHistoryRequested should add sessionId to historyRequested set', () => {
            act(() => {
                useAppStore.getState().markHistoryRequested('session-1');
            });
            expect(useAppStore.getState().historyRequested.has('session-1')).toBe(true);

            // Adding same id should not duplicate
            act(() => {
                useAppStore.getState().markHistoryRequested('session-1');
            });
            expect(useAppStore.getState().historyRequested.size).toBe(1);
        });

        it('toggleFolderExpanded should toggle folder in session', () => {
            // First create a session
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: {
                    sessions: [{ id: 'session-1', title: 'Test', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }]
                }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            // Toggle folder
            act(() => {
                useAppStore.getState().toggleFolderExpanded('session-1', '/src');
            });
            expect(useAppStore.getState().sessions['session-1'].expandedFolders.has('/src')).toBe(true);

            // Toggle again (should remove)
            act(() => {
                useAppStore.getState().toggleFolderExpanded('session-1', '/src');
            });
            expect(useAppStore.getState().sessions['session-1'].expandedFolders.has('/src')).toBe(false);
        });

        it('toggleFolderExpanded should do nothing for non-existent session', () => {
            act(() => {
                useAppStore.getState().toggleFolderExpanded('non-existent', '/src');
            });
            // Should not throw, just no-op
            expect(useAppStore.getState().sessions['non-existent']).toBeUndefined();
        });

        it('resolvePermissionRequest should remove permission request', () => {
            // Create session with permission request
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: {
                    sessions: [{ id: 'session-1', title: 'Test', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }]
                }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            // Add permission request
            const permEvent: ServerEvent = {
                type: 'permission.request',
                payload: { sessionId: 'session-1', toolUseId: 'tool-1', toolName: 'bash', input: {} }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(permEvent);
            });
            expect(useAppStore.getState().sessions['session-1'].permissionRequests.length).toBe(1);

            // Resolve it
            act(() => {
                useAppStore.getState().resolvePermissionRequest('session-1', 'tool-1');
            });
            expect(useAppStore.getState().sessions['session-1'].permissionRequests.length).toBe(0);
        });
    });

    // =================================================================
    // handleServerEvent - session.list
    // =================================================================
    describe('handleServerEvent - session.list', () => {
        it('should populate sessions from session.list event', () => {
            const sessions: SessionInfo[] = [
                { id: 'session-1', title: 'Session 1', status: 'running', createdAt: 1000, updatedAt: 2000 },
                { id: 'session-2', title: 'Session 2', status: 'idle', createdAt: 1500, updatedAt: 2500 }
            ];
            const event: ServerEvent = {
                type: 'session.list',
                payload: { sessions }
            };

            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(Object.keys(useAppStore.getState().sessions)).toHaveLength(2);
            expect(useAppStore.getState().sessions['session-1'].title).toBe('Session 1');
            expect(useAppStore.getState().sessions['session-2'].status).toBe('idle');
            expect(useAppStore.getState().sessionsLoaded).toBe(true);
        });

        it('should show start modal when no sessions exist', () => {
            const event: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [] }
            };

            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(useAppStore.getState().showStartModal).toBe(true);
        });

        it('should clear activeSessionId if session no longer exists', () => {
            // Set up active session first
            useAppStore.setState({ activeSessionId: 'old-session' });

            const event: ServerEvent = {
                type: 'session.list',
                payload: {
                    sessions: [{ id: 'new-session', title: 'New', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }]
                }
            };

            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(useAppStore.getState().activeSessionId).toBeNull();
        });
    });

    // =================================================================
    // handleServerEvent - session.history
    // =================================================================
    describe('handleServerEvent - session.history', () => {
        it('should populate session with history messages', () => {
            // First create the session
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const messages: StreamMessage[] = [
                { type: 'user_prompt', prompt: 'Hello' },
                { type: 'assistant', message: { role: 'assistant', content: 'Hi!' } } as StreamMessage
            ];
            const historyEvent: ServerEvent = {
                type: 'session.history',
                payload: { sessionId: 'session-1', messages, status: 'idle' }
            };

            act(() => {
                useAppStore.getState().handleServerEvent(historyEvent);
            });

            expect(useAppStore.getState().sessions['session-1'].messages).toHaveLength(2);
            expect(useAppStore.getState().sessions['session-1'].hydrated).toBe(true);
        });

        it('should filter out stream_event messages', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const messages: StreamMessage[] = [
                { type: 'user_prompt', prompt: 'Hello' },
                { type: 'stream_event', event: {} } as unknown as StreamMessage,
                { type: 'assistant', message: { role: 'assistant', content: 'Hi!' } } as StreamMessage
            ];
            const historyEvent: ServerEvent = {
                type: 'session.history',
                payload: { sessionId: 'session-1', messages, status: 'idle' }
            };

            act(() => {
                useAppStore.getState().handleServerEvent(historyEvent);
            });

            // Stream event should be filtered out
            expect(useAppStore.getState().sessions['session-1'].messages).toHaveLength(2);
        });
    });

    // =================================================================
    // handleServerEvent - session.status
    // =================================================================
    describe('handleServerEvent - session.status', () => {
        it('should update session status', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const statusEvent: ServerEvent = {
                type: 'session.status',
                payload: { sessionId: 'session-1', status: 'running', title: 'Updated Title' }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(statusEvent);
            });

            expect(useAppStore.getState().sessions['session-1'].status).toBe('running');
            expect(useAppStore.getState().sessions['session-1'].title).toBe('Updated Title');
        });

        it('should activate session when pendingStart is true', () => {
            useAppStore.setState({ pendingStart: true });

            const statusEvent: ServerEvent = {
                type: 'session.status',
                payload: { sessionId: 'new-session', status: 'running' }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(statusEvent);
            });

            expect(useAppStore.getState().activeSessionId).toBe('new-session');
            expect(useAppStore.getState().pendingStart).toBe(false);
            expect(useAppStore.getState().showStartModal).toBe(false);
        });
    });

    // =================================================================
    // handleServerEvent - session.deleted
    // =================================================================
    describe('handleServerEvent - session.deleted', () => {
        it('should remove deleted session', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: {
                    sessions: [
                        { id: 'session-1', title: 'Test 1', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() },
                        { id: 'session-2', title: 'Test 2', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }
                    ]
                }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const deleteEvent: ServerEvent = {
                type: 'session.deleted',
                payload: { sessionId: 'session-1' }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(deleteEvent);
            });

            expect(useAppStore.getState().sessions['session-1']).toBeUndefined();
            expect(useAppStore.getState().sessions['session-2']).toBeDefined();
        });

        it('should show start modal when last session is deleted', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'idle', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const deleteEvent: ServerEvent = {
                type: 'session.deleted',
                payload: { sessionId: 'session-1' }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(deleteEvent);
            });

            expect(useAppStore.getState().showStartModal).toBe(true);
        });

        it('should update activeSessionId when active session is deleted', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: {
                    sessions: [
                        { id: 'session-1', title: 'Test 1', status: 'idle', createdAt: 1000, updatedAt: 2000 },
                        { id: 'session-2', title: 'Test 2', status: 'idle', createdAt: 1500, updatedAt: 3000 }
                    ]
                }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
                useAppStore.getState().setActiveSessionId('session-1');
            });

            const deleteEvent: ServerEvent = {
                type: 'session.deleted',
                payload: { sessionId: 'session-1' }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(deleteEvent);
            });

            // Should switch to most recently updated session
            expect(useAppStore.getState().activeSessionId).toBe('session-2');
        });
    });

    // =================================================================
    // handleServerEvent - stream.message
    // =================================================================
    describe('handleServerEvent - stream.message', () => {
        it('should append message to session', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'running', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const streamEvent: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'session-1',
                    message: { type: 'assistant', message: { role: 'assistant', content: 'Hello!' } } as StreamMessage
                }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(streamEvent);
            });

            expect(useAppStore.getState().sessions['session-1'].messages).toHaveLength(1);
        });

        it('should ignore stream_event type messages', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'running', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const streamEvent: ServerEvent = {
                type: 'stream.message',
                payload: {
                    sessionId: 'session-1',
                    message: { type: 'stream_event', event: {} } as unknown as StreamMessage
                }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(streamEvent);
            });

            expect(useAppStore.getState().sessions['session-1'].messages).toHaveLength(0);
        });
    });

    // =================================================================
    // handleServerEvent - stream.user_prompt
    // =================================================================
    describe('handleServerEvent - stream.user_prompt', () => {
        it('should append user prompt to session messages', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'running', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const userPromptEvent: ServerEvent = {
                type: 'stream.user_prompt',
                payload: {
                    sessionId: 'session-1',
                    prompt: 'User question',
                    displayPrompt: 'User question (display)',
                    displayTokens: [{ type: 'text', value: 'User question' }]
                }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(userPromptEvent);
            });

            const messages = useAppStore.getState().sessions['session-1'].messages;
            expect(messages).toHaveLength(1);
            expect(messages[0].type).toBe('user_prompt');
            expect((messages[0] as { prompt: string }).prompt).toBe('User question');
        });
    });

    // =================================================================
    // handleServerEvent - permission.request
    // =================================================================
    describe('handleServerEvent - permission.request', () => {
        it('should add permission request to session', () => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'running', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });

            const permEvent: ServerEvent = {
                type: 'permission.request',
                payload: { sessionId: 'session-1', toolUseId: 'tool-1', toolName: 'bash', input: { command: 'ls' } }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(permEvent);
            });

            const requests = useAppStore.getState().sessions['session-1'].permissionRequests;
            expect(requests).toHaveLength(1);
            expect(requests[0].toolName).toBe('bash');
            expect(requests[0].toolUseId).toBe('tool-1');
        });
    });

    // =================================================================
    // handleServerEvent - rightpanel events
    // =================================================================
    describe('handleServerEvent - rightpanel events', () => {
        beforeEach(() => {
            const sessionListEvent: ServerEvent = {
                type: 'session.list',
                payload: { sessions: [{ id: 'session-1', title: 'Test', status: 'running', createdAt: Date.now(), updatedAt: Date.now() }] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(sessionListEvent);
            });
        });

        it('should update todos from rightpanel.todos event', () => {
            const todos: TodoItemData[] = [
                { id: 'todo-1', taskIndex: 0, content: 'First task', status: 'pending', messageIndex: 0, timestamp: Date.now() }
            ];
            const event: ServerEvent = {
                type: 'rightpanel.todos',
                payload: { sessionId: 'session-1', todos }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(useAppStore.getState().sessions['session-1'].todos).toHaveLength(1);
            expect(useAppStore.getState().sessions['session-1'].todos[0].content).toBe('First task');
        });

        it('should update fileChanges from rightpanel.filechanges event', () => {
            const changes: FileChangeData[] = [
                { id: 'change-1', filePath: '/src/index.ts', operationType: 'modify', toolName: 'Edit', messageIndex: 0, timestamp: Date.now() }
            ];
            const event: ServerEvent = {
                type: 'rightpanel.filechanges',
                payload: { sessionId: 'session-1', changes }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(useAppStore.getState().sessions['session-1'].fileChanges).toHaveLength(1);
            expect(useAppStore.getState().sessions['session-1'].fileChanges[0].filePath).toBe('/src/index.ts');
        });

        it('should update fileTree from rightpanel.filetree event', () => {
            const tree: FileTreeNode = {
                path: '/',
                name: 'root',
                isDirectory: true,
                children: {},
                isExpanded: true,
                hasRecentOperation: false
            };
            const event: ServerEvent = {
                type: 'rightpanel.filetree',
                payload: { sessionId: 'session-1', tree }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(useAppStore.getState().sessions['session-1'].fileTree).not.toBeNull();
            expect(useAppStore.getState().sessions['session-1'].fileTree?.name).toBe('root');
        });

        it('should ignore rightpanel events for non-existent sessions', () => {
            const event: ServerEvent = {
                type: 'rightpanel.todos',
                payload: { sessionId: 'non-existent', todos: [] }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            // Should not throw, just no-op
            expect(useAppStore.getState().sessions['non-existent']).toBeUndefined();
        });
    });

    // =================================================================
    // handleServerEvent - runner.error
    // =================================================================
    describe('handleServerEvent - runner.error', () => {
        it('should set globalError from runner.error event', () => {
            const event: ServerEvent = {
                type: 'runner.error',
                payload: { message: 'API connection failed' }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(useAppStore.getState().globalError).toBe('API connection failed');
        });

        it('should clear globalError when message is empty', () => {
            useAppStore.setState({ globalError: 'Previous error' });

            const event: ServerEvent = {
                type: 'runner.error',
                payload: { message: '' }
            };
            act(() => {
                useAppStore.getState().handleServerEvent(event);
            });

            expect(useAppStore.getState().globalError).toBeNull();
        });
    });
});
