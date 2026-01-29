import { promises as fs } from "fs";
import path from "path";
import type { FileEntry, RecentFile } from "../types.js";

// Patterns to ignore (same as in main.ts readDirectoryTree)
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    '__pycache__',
    '.DS_Store',
    'Thumbs.db',
    '.vscode',
    '.idea',
    'dist',
    'build',
    'out',
    'target',
    '.next',
    '.nuxt',
    '.cache',
    'coverage',
    '.pytest_cache',
    '.tox',
    'venv',
    '.venv',
    'env',
    '.env'
];

/**
 * Check if a file/directory should be ignored
 */
function shouldIgnore(name: string): boolean {
    return IGNORE_PATTERNS.includes(name) || name.startsWith('.');
}

/**
 * List files and directories in a given directory (non-recursive, immediate children only)
 */
export async function listFilesInDirectory(dirPath: string): Promise<FileEntry[]> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const fileEntries: FileEntry[] = [];

        for (const entry of entries) {
            // Skip ignored files/directories
            if (shouldIgnore(entry.name)) continue;

            const fullPath = path.join(dirPath, entry.name);
            fileEntries.push({
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory()
            });
        }

        // Sort: directories first, then files, alphabetically within each group
        fileEntries.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return fileEntries;
    } catch (err) {
        console.error(`Failed to list files in directory ${dirPath}:`, err);
        return [];
    }
}

/**
 * Storage for recent files per session
 * Key: sessionId, Value: Set of file paths with timestamps
 */
const recentFilesCache = new Map<string, Map<string, number>>();

/**
 * Get recent files for a session
 */
export function getRecentFiles(sessionId: string): RecentFile[] {
    const sessionFiles = recentFilesCache.get(sessionId);
    if (!sessionFiles || sessionFiles.size === 0) {
        return [];
    }

    // Convert to array and sort by lastUsed (most recent first)
    const files: RecentFile[] = Array.from(sessionFiles.entries()).map(([filePath, lastUsed]) => ({
        name: path.basename(filePath),
        path: filePath,
        lastUsed
    }));

    files.sort((a, b) => b.lastUsed - a.lastUsed);

    // Return only top 20
    return files.slice(0, 20);
}

/**
 * Add a file to recent files for a session
 */
export function addRecentFile(filePath: string, sessionId: string): void {
    let sessionFiles = recentFilesCache.get(sessionId);

    if (!sessionFiles) {
        sessionFiles = new Map();
        recentFilesCache.set(sessionId, sessionFiles);
    }

    // Add or update the file with current timestamp
    sessionFiles.set(filePath, Date.now());

    // If we have more than 20, remove the oldest
    if (sessionFiles.size > 20) {
        // Find the oldest entry
        let oldestPath: string | null = null;
        let oldestTime = Infinity;

        for (const [filePath, timestamp] of sessionFiles.entries()) {
            if (timestamp < oldestTime) {
                oldestTime = timestamp;
                oldestPath = filePath;
            }
        }

        if (oldestPath) {
            sessionFiles.delete(oldestPath);
        }
    }
}

/**
 * Clear recent files for a session (called when session is deleted)
 */
export function clearRecentFiles(sessionId: string): void {
    recentFilesCache.delete(sessionId);
}
