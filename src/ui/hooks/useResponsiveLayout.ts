import { useState, useEffect, useCallback } from 'react';

export function useResponsiveLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isRightPanelOpen, setRightPanelOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Windows specific titlebar padding logic could be handled here or in the component
    // We'll stick to core layout state here

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
    }, []);

    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const toggleRightPanel = useCallback(() => setRightPanelOpen(prev => !prev), []);
    const closeBoth = useCallback(() => {
        setSidebarOpen(false);
        setRightPanelOpen(false);
    }, []);

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
