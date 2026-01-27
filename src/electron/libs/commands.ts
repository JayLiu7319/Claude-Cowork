import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type { Command } from "../types.js";
import { getResourcesPath } from "../pathResolver.js";
import { loadBrandConfig } from "./brand-config.js";

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


/**
 * Load all available slash commands from global config and bundled plugins
 */
export async function loadGlobalCommands(): Promise<Command[]> {
    const commandsDir = getGlobalCommandsPath();
    const commands: Command[] = [];

    // Load brand config and create allowed plugins set
    const brandConfig = loadBrandConfig();
    const allowedPlugins = new Set(brandConfig.plugins ?? ['core-skills']);

    console.log('[Commands] Loading commands for plugins:', Array.from(allowedPlugins));

    // 1. Load from ~/.claude/commands
    try {
        if (await fs.stat(commandsDir).then(s => s.isDirectory()).catch(() => false)) {
            const entries = await fs.readdir(commandsDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isFile()) continue;
                const ext = path.extname(entry.name).toLowerCase();
                if (ext !== '.md' && ext !== '.txt') continue;

                await loadCommandFromFile(path.join(commandsDir, entry.name), commands);
            }
        }
    } catch (err) {
        console.error("Failed to read global commands directory:", err);
    }

    // 2. Load from bundled plugins
    try {
        const resourcesPath = getResourcesPath();
        const bundledPluginsPath = path.join(resourcesPath, 'resources', 'builtin-plugins');

        if (await fs.stat(bundledPluginsPath).then(s => s.isDirectory()).catch(() => false)) {
            // Read all plugin directories
            const pluginDirs = await fs.readdir(bundledPluginsPath, { withFileTypes: true });

            for (const pluginDir of pluginDirs) {
                if (!pluginDir.isDirectory()) continue;

                // Only load commands from plugins specified in brand config
                if (!allowedPlugins.has(pluginDir.name)) continue;

                // Check for commands subdirectory
                const commandsPath = path.join(bundledPluginsPath, pluginDir.name, 'commands');
                if (await fs.stat(commandsPath).then(s => s.isDirectory()).catch(() => false)) {
                    const commandEntries = await fs.readdir(commandsPath, { withFileTypes: true });

                    for (const entry of commandEntries) {
                        if (!entry.isFile()) continue;
                        const ext = path.extname(entry.name).toLowerCase();
                        if (ext !== '.md' && ext !== '.txt') continue;

                        await loadCommandFromFile(path.join(commandsPath, entry.name), commands);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Failed to read bundled plugins commands:", err);
    }

    // Sort commands by name
    commands.sort((a, b) => a.name.localeCompare(b.name));

    return commands;
}

async function loadCommandFromFile(filePath: string, commands: Command[]) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        const commandName = path.basename(filePath, path.extname(filePath));
        // If inside a plugin, we might want to namespace it, but for now match exact filename?
        // Actually, the user requirement implied "startup-business-analyst" commands.
        // Let's keep the filename as the command name.

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
