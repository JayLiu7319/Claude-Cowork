import { useEffect, useCallback } from 'react';
import { useLayoutState, useLayoutActions } from './useAppSelectors';

/**
 * 响应式布局 Hook - 使用 Zustand store 管理状态
 * 监听窗口大小变化，自动切换移动端/桌面端布局
 */
export function useResponsiveLayout() {
    const { isSidebarOpen, isRightPanelOpen, isMobile } = useLayoutState();
    const {
        setSidebarOpen,
        setRightPanelOpen,
        setIsMobile,
        toggleSidebar,
        toggleRightPanel
    } = useLayoutActions();

    // 窗口大小监听
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768; // Tailwind md breakpoint
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
                setRightPanelOpen(false);
            } else {
                setSidebarOpen(true);
                setRightPanelOpen(window.innerWidth >= 1280); // Open right panel only on XL screens by default
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile, { passive: true });
        return () => window.removeEventListener('resize', checkMobile);
    }, [setIsMobile, setSidebarOpen, setRightPanelOpen]);

    const closeBoth = useCallback(() => {
        setSidebarOpen(false);
        setRightPanelOpen(false);
    }, [setSidebarOpen, setRightPanelOpen]);

    return {
        isSidebarOpen,
        setSidebarOpen,
        isRightPanelOpen,
        setRightPanelOpen,
        isMobile,
        toggleSidebar,
        toggleRightPanel,
        closeBoth
    };
}
