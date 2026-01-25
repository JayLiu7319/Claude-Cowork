import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type { Command } from "../types.js";

/**
 * Parse YAML frontmatter from a markdown file content
 */
function parseFrontmatter(content: string): Record<string, string> {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) return {};

    const frontmatter: Record<string, string> = {};
    const lines = frontmatterMatch[1].split(/\r?\n/);

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        frontmatter[key] = value;
    }

    return frontmatter;
}

/**
 * Get the global Claude commands directory path
 */
export function getGlobalCommandsPath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, ".claude", "commands");
}

/**
 * Load all available slash commands from the global ~/.claude/commands directory
 */
export async function loadGlobalCommands(): Promise<Command[]> {
    const commandsDir = getGlobalCommandsPath();
    const commands: Command[] = [];

    try {
        await fs.access(commandsDir);
    } catch {
        // Directory doesn't exist, return empty array
        return commands;
    }

    try {
        const entries = await fs.readdir(commandsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isFile()) continue;

            // Support .md and .txt files
            const ext = path.extname(entry.name).toLowerCase();
            if (ext !== '.md' && ext !== '.txt') continue;

            const filePath = path.join(commandsDir, entry.name);
            const commandName = path.basename(entry.name, ext);

            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const frontmatter = parseFrontmatter(content);

                commands.push({
                    name: commandName,
                    description: frontmatter.description || undefined,
                    argumentHint: frontmatter['argument-hint'] || undefined,
                    filePath
                });
            } catch (err) {
                console.error(`Failed to read command file ${filePath}:`, err);
            }
        }
    } catch (err) {
        console.error("Failed to read commands directory:", err);
    }

    // Sort commands by name
    commands.sort((a, b) => a.name.localeCompare(b.name));

    return commands;
}

/**
 * Read the content of a command file (for inserting into the prompt)
 */
export async function readCommandContent(filePath: string): Promise<string | null> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Remove frontmatter if present
        const contentWithoutFrontmatter = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

        return contentWithoutFrontmatter.trim();
    } catch (err) {
        console.error(`Failed to read command content from ${filePath}:`, err);
        return null;
    }
}
