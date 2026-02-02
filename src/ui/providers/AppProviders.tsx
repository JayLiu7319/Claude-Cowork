/**
 * Application Providers
 * 
 * Centralized provider composition for the application.
 * Wraps all global context providers in the correct order.
 */

import type { ReactNode } from 'react';
import type { i18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { ElectronBridgeProvider } from './ElectronBridgeProvider';
import type { ElectronBridge } from '../services/electron-bridge';
import ErrorBoundary from '../components/ErrorBoundary';

interface AppProvidersProps {
    children: ReactNode;
    i18nInstance: i18n;
    bridge?: ElectronBridge;
}

/**
 * Compose all application-level providers.
 * Order matters: outermost providers wrap innermost.
 * 
 * Provider order (outermost to innermost):
 * 1. I18nextProvider - Internationalization
 * 2. ElectronBridgeProvider - IPC abstraction
 * 3. ErrorBoundary - Error handling
 * 
 * @example
 * <AppProviders i18nInstance={i18n}>
 *   <AppShell />
 * </AppProviders>
 */
export function AppProviders({
    children,
    i18nInstance,
    bridge,
}: AppProvidersProps) {
    return (
        <I18nextProvider i18n={i18nInstance}>
            <ElectronBridgeProvider bridge={bridge}>
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </ElectronBridgeProvider>
        </I18nextProvider>
    );
}
