import fs from "fs/promises";
import path from "path";

export interface DirectoryEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: DirectoryEntry[];
}

// Patterns to ignore
const ignorePatterns = [
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
    '.next',
    '.nuxt',
    'coverage',
    '.cache',
    '.turbo'
];

async function readDir(currentPath: string, currentDepth: number): Promise<DirectoryEntry[]> {
    if (currentDepth <= 0) return [];

    try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const result: DirectoryEntry[] = [];

        for (const entry of entries) {
            // Skip ignored patterns
            if (ignorePatterns.includes(entry.name) || entry.name.startsWith('.')) {
                continue;
            }

            const fullPath = path.join(currentPath, entry.name);
            const isDir = entry.isDirectory();

            const item: DirectoryEntry = {
                name: entry.name,
                path: fullPath,
                isDirectory: isDir
            };

            if (isDir && currentDepth > 1) {
                item.children = await readDir(fullPath, currentDepth - 1);
            } else if (isDir) {
                item.children = []; // Mark as directory but don't load children yet
            }

            result.push(item);
        }

        // Sort: directories first, then files, alphabetically
        result.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        return result;
    } catch {
        return [];
    }
}

export async function readDirectoryTree(dirPath: string, depth: number = 2): Promise<DirectoryEntry[]> {
    return await readDir(dirPath, depth);
}
