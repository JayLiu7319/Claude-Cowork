import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Command } from "../types";

interface SlashCommandPopupProps {
    commands: Command[];
    filter: string;
    onSelect: (commandName: string, commandContent: string) => void;
    onClose: () => void;
}

export function SlashCommandPopup({ commands, filter, onSelect, onClose }: SlashCommandPopupProps) {
    const { t } = useTranslation();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    // Filter commands based on input
    const filteredCommands = commands.filter((cmd) =>
        cmd.name.toLowerCase().includes(filter.toLowerCase())
    );

    // Reset selection when filter changes
    const [prevFilter, setPrevFilter] = useState(filter);
    if (filter !== prevFilter) {
        setPrevFilter(filter);
        setSelectedIndex(0);
    }

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedEl?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    const handleSelect = useCallback((command: Command) => {
        // Read the command file content
        window.electron.readCommandContent(command.filePath).then((content) => {
            onSelect(command.name, content || `/${command.name}`);
        }).catch(() => {
            onSelect(command.name, `/${command.name}`);
        });
    }, [onSelect]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    handleSelect(filteredCommands[selectedIndex]);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [filteredCommands, selectedIndex, onClose, handleSelect]);



    if (filteredCommands.length === 0) {
        return (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-ink-900/10 bg-surface shadow-elevated p-4">
                <p className="text-sm text-muted text-center">
                    {t('slashCommand.noCommands', '没有找到匹配的命令')}
                </p>
            </div>
        );
    }

    return (
        <div
            ref={listRef}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-ink-900/10 bg-surface shadow-elevated max-h-64 overflow-y-auto"
        >
            <div className="p-2">
                <div className="text-xs font-medium text-muted px-2 py-1.5 uppercase tracking-wide">
                    {t('slashCommand.title', '可用命令')}
                </div>
                {filteredCommands.map((command, index) => (
                    <button
                        key={command.name}
                        data-index={index}
                        onClick={() => handleSelect(command)}
                        className={`w-full flex items-start gap-3 px-2 py-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${index === selectedIndex
                            ? "bg-accent/10 text-ink-800"
                            : "text-ink-700 hover:bg-surface-tertiary"
                            }`}
                    >
                        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">/{command.name}</span>
                                {command.argumentHint && (
                                    <span className="text-xs text-muted">{command.argumentHint}</span>
                                )}
                            </div>
                            {command.description && (
                                <p className="text-xs text-muted mt-0.5 truncate">{command.description}</p>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
