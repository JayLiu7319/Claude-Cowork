import type { SuggestionOptions } from "@tiptap/suggestion";
import type { Command, SkillMetadata, FileEntry } from "@shared/types";

export type SuggestionItem = {
    id: string;
    type: "command" | "skill" | "file";
    name: string;
    content?: string;
    path?: string;
    description?: string;
};

export type MentionSuggestionProps = {
    items: SuggestionItem[];
    command: (item: SuggestionItem) => void;
    selectedIndex: number;
    onKeyDown: (event: KeyboardEvent) => boolean;
};

type SuggestionConfig = {
    triggerChar: "/" | "@";
    getItems: (query: string) => Promise<SuggestionItem[]> | SuggestionItem[];
    onSelect: (item: SuggestionItem) => void;
};

/**
 * Creates a Tiptap Suggestion configuration for mentions.
 * This handles the popup lifecycle and keyboard navigation.
 */
export function createMentionSuggestion(
    config: SuggestionConfig
): Partial<SuggestionOptions<SuggestionItem>> {
    return {
        char: config.triggerChar,
        allowSpaces: false,
        startOfLine: false,

        items: async ({ query }) => {
            return config.getItems(query);
        },

        render: () => {
            return {
                onStart: () => {
                    // The actual popup is rendered via React portal in the parent component
                },

                onUpdate: () => {
                    // Update suggestion items
                },

                onKeyDown: (props: { event: KeyboardEvent }) => {
                    if (props.event.key === "Escape") {
                        return true;
                    }
                    return false;
                },

                onExit: () => {
                    // Cleanup
                },
            };
        },
    };
}

/**
 * Utility to convert commands to suggestion items
 */
export function commandsToSuggestionItems(commands: Command[]): SuggestionItem[] {
    return commands.map((cmd) => ({
        id: `cmd-${cmd.name}`,
        type: "command",
        name: cmd.name,
        content: cmd.filePath,
        description: cmd.description,
    }));
}

/**
 * Utility to convert skills to suggestion items
 */
export function skillsToSuggestionItems(skills: SkillMetadata[]): SuggestionItem[] {
    return skills.map((skill) => ({
        id: `skill-${skill.name}`,
        type: "skill",
        name: skill.name,
        content: skill.filePath,
        description: skill.description,
    }));
}

/**
 * Utility to convert files to suggestion items
 */
export function filesToSuggestionItems(files: FileEntry[]): SuggestionItem[] {
    return files
        .filter((f) => !f.isDirectory)
        .map((file) => ({
            id: `file-${file.path}`,
            type: "file",
            name: file.name,
            path: file.path,
        }));
}

/**
 * Simple fuzzy filter for suggestion items
 */
export function filterSuggestionItems(
    items: SuggestionItem[],
    query: string
): SuggestionItem[] {
    if (!query) return items.slice(0, 10);

    const lowerQuery = query.toLowerCase();
    return items
        .filter((item) => item.name.toLowerCase().includes(lowerQuery))
        .slice(0, 10);
}
