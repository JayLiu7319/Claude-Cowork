import { promises as fs } from "fs";
import path from "path";
import type { SkillMetadata } from "../types.js";
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
 * Load all available skills from global config and bundled plugins
 */
export async function loadGlobalSkills(): Promise<SkillMetadata[]> {
    const skills: SkillMetadata[] = [];

    // Load brand config and create allowed plugins set
    const brandConfig = loadBrandConfig();
    const allowedPlugins = new Set(brandConfig.plugins ?? ['core-skills']);

    // Load from bundled plugins
    try {
        const resourcesPath = getResourcesPath();
        const bundledPluginsPath = path.join(resourcesPath, 'resources', 'builtin-plugins');

        if (await fs.stat(bundledPluginsPath).then(s => s.isDirectory()).catch(() => false)) {
            // Read all plugin directories
            const pluginDirs = await fs.readdir(bundledPluginsPath, { withFileTypes: true });

            for (const pluginDir of pluginDirs) {
                if (!pluginDir.isDirectory()) continue;

                // Only load skills from plugins specified in brand config
                if (!allowedPlugins.has(pluginDir.name)) continue;

                // Check for skills subdirectory (handles both "skills" and "scientific-skills" patterns)
                const skillsDirs = ['skills', 'scientific-skills'];
                for (const skillsDir of skillsDirs) {
                    const skillsPath = path.join(bundledPluginsPath, pluginDir.name, skillsDir);
                    if (await fs.stat(skillsPath).then(s => s.isDirectory()).catch(() => false)) {
                        const skillDirs = await fs.readdir(skillsPath, { withFileTypes: true });

                        for (const skillDir of skillDirs) {
                            if (!skillDir.isDirectory()) continue;

                            // Look for SKILL.md file
                            const skillMdPath = path.join(skillsPath, skillDir.name, 'SKILL.md');
                            const skillExists = await fs.stat(skillMdPath).then(s => s.isFile()).catch(() => false);

                            if (skillExists) {
                                await loadSkillFromFile(skillMdPath, skillDir.name, pluginDir.name, skills);
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Failed to read bundled plugins skills:", err);
    }

    // Sort skills by name
    skills.sort((a, b) => a.name.localeCompare(b.name));

    return skills;
}

async function loadSkillFromFile(filePath: string, skillName: string, pluginName: string, skills: SkillMetadata[]) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        skills.push({
            name: skillName,
            description: frontmatter.description || undefined,
            pluginName,
            filePath
        });
    } catch (err) {
        console.error(`Failed to read skill file ${filePath}:`, err);
    }
}

/**
 * Read the content of a skill file (for inserting into the prompt)
 */
export async function readSkillContent(filePath: string): Promise<string | null> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Remove frontmatter if present
        const contentWithoutFrontmatter = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

        return contentWithoutFrontmatter.trim();
    } catch (err) {
        console.error(`Failed to read skill content from ${filePath}:`, err);
        return null;
    }
}
