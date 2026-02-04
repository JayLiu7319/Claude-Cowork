/**
 * App Store Selectors - 聚合的 Store 选择器
 * 将相关的 store 状态和 actions 分组，减少组件中的样板代码
 * 使用 useShallow 防止不必要的重新渲染
 */

import { useShallow } from 'zustand/shallow';
import { useAppStore } from '../store/useAppStore';

/**
 * 会话相关的状态选择器
 */
export function useSessionState() {
    return useAppStore(
        useShallow((s) => ({
            sessions: s.sessions,
            activeSessionId: s.activeSessionId,
            historyRequested: s.historyRequested,
        }))
    );
}

/**
 * UI 状态选择器
 */
export function useUIState() {
    return useAppStore(
        useShallow((s) => ({
            showSettingsModal: s.showSettingsModal,
            globalError: s.globalError,
            brandConfig: s.brandConfig,
            cwd: s.cwd,
            apiConfigChecked: s.apiConfigChecked,
            lastFileRefresh: s.lastFileRefresh,
        }))
    );
}

/**
 * UI 状态更新 Actions
 */
export function useUIActions() {
    return useAppStore(
        useShallow((s) => ({
            setShowSettingsModal: s.setShowSettingsModal,
            setGlobalError: s.setGlobalError,
            setCwd: s.setCwd,
            setApiConfigChecked: s.setApiConfigChecked,
            setDefaultCwd: s.setDefaultCwd,
            setBrandConfig: s.setBrandConfig,
            setRecentFiles: s.setRecentFiles,
        }))
    );
}

/**
 * 会话相关的 Actions
 */
export function useSessionActions() {
    return useAppStore(
        useShallow((s) => ({
            markHistoryRequested: s.markHistoryRequested,
            resolvePermissionRequest: s.resolvePermissionRequest,
            handleServerEvent: s.handleServerEvent,
        }))
    );
}

/**
 * 从 activeSession 派生的状态
 * 注意：这是一个普通函数，需要传入 sessions 和 activeSessionId
 */
export function useActiveSession() {
    const { sessions, activeSessionId } = useSessionState();

    if (!activeSessionId) {
        return {
            activeSession: undefined,
            messages: [],
            permissionRequests: [],
            isRunning: false,
            rightPanelTodos: [],
            rightPanelFileChanges: [],
        };
    }

    const activeSession = sessions[activeSessionId];
    return {
        activeSession,
        messages: activeSession?.messages ?? [],
        permissionRequests: activeSession?.permissionRequests ?? [],
        isRunning: activeSession?.status === 'running',
        rightPanelTodos: activeSession?.todos ?? [],
        rightPanelFileChanges: activeSession?.fileChanges ?? [],
    };
}

/**
 * 布局状态选择器
 */
export function useLayoutState() {
    return useAppStore(
        useShallow((s) => ({
            isSidebarOpen: s.isSidebarOpen,
            isRightPanelOpen: s.isRightPanelOpen,
            isMobile: s.isMobile,
        }))
    );
}

/**
 * 布局 Actions 选择器
 */
export function useLayoutActions() {
    return useAppStore(
        useShallow((s) => ({
            setSidebarOpen: s.setSidebarOpen,
            setRightPanelOpen: s.setRightPanelOpen,
            setIsMobile: s.setIsMobile,
            toggleSidebar: s.toggleSidebar,
            toggleRightPanel: s.toggleRightPanel,
        }))
    );
}

/**
 * 面板展开状态选择器
 */
export function usePanelExpandedState() {
    return useAppStore(
        useShallow((s) => ({
            panelExpanded: s.panelExpanded,
            setPanelExpanded: s.setPanelExpanded,
            togglePanelExpanded: s.togglePanelExpanded,
        }))
    );
}

/**
 * IPC 连接状态选择器
 */
export function useIpcConnectionState() {
    return useAppStore(
        useShallow((s) => ({
            ipcConnected: s.ipcConnected,
            setIpcConnected: s.setIpcConnected,
        }))
    );
}
