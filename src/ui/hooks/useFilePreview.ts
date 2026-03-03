import { useState, useCallback } from 'react';
import type { FilePreviewResult } from '@ui/types';
import { useElectronBridge } from './useElectronBridge';

const PREVIEWABLE_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico',
    '.pdf',
]);

/**
 * Check if a file path is previewable (image or PDF).
 */
export function isPreviewableFile(fileName: string): boolean {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    return PREVIEWABLE_EXTENSIONS.has(ext);
}

type PreviewState = {
    path: string;
    name: string;
} | null;

/**
 * Hook for managing file preview state and loading.
 */
export function useFilePreview() {
    const bridge = useElectronBridge();
    const [previewFile, setPreviewFile] = useState<PreviewState>(null);
    const [previewData, setPreviewData] = useState<FilePreviewResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openPreview = useCallback(async (filePath: string) => {
        const fileName = filePath.split(/[/\\]/).pop() || filePath;

        if (!isPreviewableFile(fileName)) {
            return false; // Not previewable
        }

        setPreviewFile({ path: filePath, name: fileName });
        setIsLoading(true);
        setError(null);
        setPreviewData(null);

        try {
            const result = await bridge.readFileForPreview(filePath);
            if (result.type === 'error') {
                setError(result.message);
            } else if (result.type === 'unsupported') {
                setError('Unsupported file type');
            } else {
                setPreviewData(result);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }

        return true; // Preview was attempted
    }, [bridge]);

    const closePreview = useCallback(() => {
        setPreviewFile(null);
        setPreviewData(null);
        setIsLoading(false);
        setError(null);
    }, []);

    return {
        previewFile,
        previewData,
        isLoading,
        error,
        openPreview,
        closePreview,
        isOpen: previewFile !== null,
    };
}
