import { readFileSync, statSync } from 'fs';
import { extname } from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const IMAGE_MIME_MAP: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
};

const PREVIEWABLE_EXTENSIONS = new Set([
    ...Object.keys(IMAGE_MIME_MAP),
    '.pdf',
]);

export type FilePreviewResult =
    | { type: 'image'; mimeType: string; filePath: string; dataUrl: string }
    | { type: 'pdf'; mimeType: 'application/pdf'; filePath: string; fileSize: number; base64Data: string }
    | { type: 'unsupported' }
    | { type: 'error'; message: string };

/**
 * Check if a file extension is previewable.
 */
export function isPreviewableFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return PREVIEWABLE_EXTENSIONS.has(ext);
}

/**
 * Validate and return file metadata for preview.
 * Returns the file type and absolute path for direct file:// loading.
 */
export function readFileForPreview(absolutePath: string): FilePreviewResult {
    try {
        const ext = extname(absolutePath).toLowerCase();

        if (!PREVIEWABLE_EXTENSIONS.has(ext)) {
            return { type: 'unsupported' };
        }

        // Check file exists and get size
        const stats = statSync(absolutePath);
        if (stats.size > MAX_FILE_SIZE) {
            return { type: 'error', message: `File too large (${Math.round(stats.size / 1024 / 1024)}MB). Max ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
        }

        // Image files
        const imageMime = IMAGE_MIME_MAP[ext];
        if (imageMime) {
            const fileBuffer = readFileSync(absolutePath);
            const dataUrl = `data:${imageMime};base64,${fileBuffer.toString('base64')}`;
            return { type: 'image', mimeType: imageMime, filePath: absolutePath, dataUrl };
        }

        // PDF files
        if (ext === '.pdf') {
            const fileBuffer = readFileSync(absolutePath);
            const base64Data = fileBuffer.toString('base64');
            return { type: 'pdf', mimeType: 'application/pdf', filePath: absolutePath, fileSize: stats.size, base64Data };
        }

        return { type: 'unsupported' };
    } catch (error) {
        return {
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
        };
    }
}
