import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { FilePreviewResult } from '@ui/types';

type FilePreviewModalProps = {
    fileName: string;
    previewData: FilePreviewResult | null;
    isLoading: boolean;
    error: string | null;
    isWindows?: boolean;
    onClose: () => void;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const TITLE_BAR_SAFE_TOP = 48;

/**
 * Convert a local file path to a file:// URL.
 * Handles Windows backslashes and special characters.
 */
function toFileUrl(filePath: string): string {
    // Normalize Windows backslashes to forward slashes
    const normalized = filePath.replace(/\\/g, '/');
    // Encode special characters but keep slashes and colons (for drive letter)
    const encoded = normalized.split('/').map((segment, i) => {
        // Don't encode drive letter (e.g., "C:")
        if (i === 0 && /^[a-zA-Z]:$/.test(segment)) return segment;
        return encodeURIComponent(segment);
    }).join('/');
    return `file:///${encoded.replace(/^\/+/, '')}`;
}

/**
 * Full-screen modal for previewing images and PDFs.
 * Uses top padding to account for Electron's hidden title bar overlay (48px).
 */
export const FilePreviewModal = memo(function FilePreviewModal({
    fileName,
    previewData,
    isLoading,
    error,
    isWindows = false,
    onClose,
}: FilePreviewModalProps) {
    const { t } = useTranslation('ui');
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const posStart = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfBlobUrl = useMemo(() => {
        if (previewData?.type !== 'pdf') {
            return null;
        }
        try {
            const binary = atob(previewData.base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            return URL.createObjectURL(blob);
        } catch {
            return null;
        }
    }, [previewData]);

    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    // Build file:// URLs for image and PDF
    const fileUrl = useMemo(() => {
        if (previewData?.type === 'image') {
            if (previewData.dataUrl) {
                return previewData.dataUrl;
            }
            return toFileUrl(previewData.filePath);
        }
        if (previewData?.type === 'pdf') {
            return pdfBlobUrl;
        }
        return null;
    }, [previewData, pdfBlobUrl]);

    // Wheel zoom for images
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(prev => {
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
        });
    }, []);

    // Drag to pan for images
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        posStart.current = { ...position };
    }, [position]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: posStart.current.x + (e.clientX - dragStart.current.x),
            y: posStart.current.y + (e.clientY - dragStart.current.y),
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const zoomIn = useCallback(() => {
        setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
    }, []);

    const zoomOut = useCallback(() => {
        setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
    }, []);

    const resetZoom = useCallback(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === containerRef.current) {
            onClose();
        }
    }, [onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    const fileExt = useMemo(() => {
        const i = fileName.lastIndexOf('.');
        return i >= 0 ? fileName.slice(i + 1).toUpperCase() : 'FILE';
    }, [fileName]);
    const zoomPercent = Math.round(zoom * 100);
    const isImage = previewData?.type === 'image';
    const isPdf = previewData?.type === 'pdf';

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col bg-surface-cream/72 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label={t('filePreview.preview', 'Preview')}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <div className="shrink-0" style={{ paddingTop: TITLE_BAR_SAFE_TOP + 4 }}>
                <div
                    className="flex items-center gap-3 px-4 pb-2"
                >
                    <div className="min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-surface/95 px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-ink-800 truncate">
                                {fileName}
                            </span>
                            <span className="shrink-0 rounded-md border border-ink-900/10 bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-ink-500">
                                {fileExt}
                            </span>
                            {isImage && (
                                <span className="shrink-0 rounded-md border border-ink-900/10 bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-ink-500 tabular-nums">
                                    {zoomPercent}%
                                </span>
                            )}
                            {isPdf && previewData?.type === 'pdf' && (
                                <span className="shrink-0 rounded-md border border-ink-900/10 bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-ink-500 tabular-nums">
                                    {(previewData.fileSize / 1024 / 1024).toFixed(1)}MB
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isImage && (
                            <div className="flex items-center gap-1 rounded-xl border border-ink-900/10 bg-surface-secondary p-1 shadow-sm">
                                <ToolbarButton
                                    onClick={zoomOut}
                                    title={t('filePreview.zoomOut', 'Zoom Out')}
                                    disabled={zoom <= MIN_ZOOM}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" />
                                    </svg>
                                </ToolbarButton>
                                <ToolbarButton
                                    onClick={resetZoom}
                                    title={t('filePreview.resetZoom', 'Reset Zoom')}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L3 8" /><path d="M3 3v5h5" />
                                    </svg>
                                </ToolbarButton>
                                <ToolbarButton
                                    onClick={zoomIn}
                                    title={t('filePreview.zoomIn', 'Zoom In')}
                                    disabled={zoom >= MAX_ZOOM}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" />
                                    </svg>
                                </ToolbarButton>
                            </div>
                        )}

                        {!isWindows && (
                            <ToolbarButton onClick={onClose} title={t('filePreview.close', 'Close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                </svg>
                            </ToolbarButton>
                        )}
                    </div>
                </div>
            </div>

            <div
                ref={containerRef}
                className="flex-1 overflow-hidden p-4"
                onClick={handleBackdropClick}
            >
                <div className="h-full w-full rounded-2xl border border-ink-900/10 bg-surface shadow-xl overflow-hidden flex items-center justify-center">
                    {isLoading && (
                        <div className="flex flex-col items-center gap-3 text-ink-500">
                            <div className="w-8 h-8 border-2 border-ink-900/20 border-t-accent rounded-full animate-spin" />
                            <span className="text-sm">{t('filePreview.loading', 'Loading preview...')}</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center gap-3 text-ink-600 max-w-sm text-center px-6">
                            <svg className="w-12 h-12 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m15 9-6 6" /><path d="m9 9 6 6" />
                            </svg>
                            <span className="text-sm text-error">
                                {t('filePreview.error', 'Failed to load preview')}
                            </span>
                            <span className="text-xs text-ink-500">{error}</span>
                            <button
                                onClick={onClose}
                                className="mt-2 px-4 py-2 text-sm text-ink-700 border border-ink-900/10 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
                            >
                                {t('filePreview.close', 'Close')}
                            </button>
                        </div>
                    )}

                    {isImage && fileUrl && (
                        <div
                            className={`select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <img
                                src={fileUrl}
                                alt={fileName}
                                className="max-w-none"
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    maxHeight: '84vh',
                                    maxWidth: '90vw',
                                    objectFit: 'contain',
                                }}
                                draggable={false}
                            />
                        </div>
                    )}

                    {isPdf && fileUrl && (
                        <iframe
                            src={fileUrl}
                            className="h-full w-full border-0 bg-surface-secondary"
                            title={fileName}
                        />
                    )}
                </div>
            </div>
        </div>
    );
});

/** Small toolbar button component */
function ToolbarButton({
    onClick,
    title,
    disabled,
    children,
}: {
    onClick: () => void;
    title: string;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className="p-2 rounded-lg text-ink-600 hover:text-ink-800 hover:bg-surface-tertiary transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
            {children}
        </button>
    );
}
