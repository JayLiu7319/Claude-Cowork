import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Command, SkillMetadata, FileEntry, RecentFile } from "../types";

interface AutocompletePopupProps {
  mode: 'commands-skills' | 'files';
  filter: string;
  commands?: Command[];
  skills?: SkillMetadata[];
  fileEntries?: FileEntry[];
  recentFiles?: RecentFile[];
  onSelectCommand?: (name: string, content: string) => void;
  onSelectSkill?: (name: string, content: string) => void;
  onSelectFile?: (path: string) => void;
  onNavigateFolder?: (path: string) => void;
  onClose: () => void;
}

interface SearchResult {
  type: 'command' | 'skill' | 'file' | 'folder';
  name: string;
  description?: string;
  path?: string;
  isDirectory?: boolean;
  rank: number;
  object: Command | SkillMetadata | FileEntry | RecentFile;
}

// Simple fuzzy scoring algorithm
function fuzzyScore(text: string, pattern: string): number {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // Prefix match is highest priority
  if (textLower.startsWith(patternLower)) {
    return 1000 - textLower.length;
  }

  // Check if all characters match in order
  let score = 0;
  let patternIndex = 0;
  for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIndex]) {
      score += 100 - i;
      patternIndex++;
    }
  }

  // All characters must match for a valid fuzzy match
  if (patternIndex === patternLower.length) {
    return score;
  }

  return -1; // No match
}

export function AutocompletePopup({
  mode,
  filter,
  commands = [],
  skills = [],
  fileEntries = [],
  recentFiles = [],
  onSelectCommand,
  onSelectSkill,
  onSelectFile,
  onNavigateFolder,
  onClose
}: AutocompletePopupProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate search results based on mode using useMemo
  const results = useMemo(() => {
    let newResults: SearchResult[] = [];

    if (mode === 'commands-skills') {
      // Add commands
      for (const cmd of commands) {
        const nameScore = fuzzyScore(cmd.name, filter);
        const descScore = fuzzyScore(cmd.description || '', filter);
        const maxScore = Math.max(nameScore, descScore);

        if (maxScore >= 0) {
          newResults.push({
            type: 'command',
            name: cmd.name,
            description: cmd.description,
            rank: maxScore,
            object: cmd
          });
        }
      }

      // Add skills
      for (const skill of skills) {
        const nameScore = fuzzyScore(skill.name, filter);
        const descScore = fuzzyScore(skill.description || '', filter);
        const maxScore = Math.max(nameScore, descScore);

        if (maxScore >= 0) {
          newResults.push({
            type: 'skill',
            name: skill.name,
            description: skill.description,
            rank: maxScore,
            object: skill
          });
        }
      }

      // Sort by rank (descending), then by name
      newResults.sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return a.name.localeCompare(b.name);
      });

      // Separate into commands and skills groups
      const commandResults = newResults.filter(r => r.type === 'command');
      const skillResults = newResults.filter(r => r.type === 'skill');
      newResults = [...commandResults, ...skillResults];
    } else {
      // Files mode: show recent files first, then file entries
      for (const file of recentFiles) {
        const score = fuzzyScore(file.name, filter);
        if (score >= 0) {
          newResults.push({
            type: 'file',
            name: file.name,
            path: file.path,
            rank: score + 100, // Boost recent files
            object: file
          });
        }
      }

      for (const entry of fileEntries) {
        const score = fuzzyScore(entry.name, filter);
        if (score >= 0) {
          newResults.push({
            type: entry.isDirectory ? 'folder' : 'file',
            name: entry.name,
            path: entry.path,
            isDirectory: entry.isDirectory,
            rank: score,
            object: entry
          });
        }
      }

      // Sort by rank (descending), with directories before files
      newResults.sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        if ((b.isDirectory ? 1 : 0) !== (a.isDirectory ? 1 : 0)) {
          return (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0);
        }
        return a.name.localeCompare(b.name);
      });
    }

    return newResults;
  }, [mode, filter, commands, skills, fileEntries, recentFiles]);

  // Ensure selected index is valid
  const validSelectedIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${validSelectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [validSelectedIndex]);

  const handleSelectResult = useCallback((result: SearchResult) => {
    if (result.type === 'command' && onSelectCommand) {
      const cmd = result.object as Command;
      window.electron.readCommandContent(cmd.filePath).then((content) => {
        onSelectCommand(cmd.name, content || `/${cmd.name}`);
      }).catch(() => {
        onSelectCommand(cmd.name, `/${cmd.name}`);
      });
    } else if (result.type === 'skill' && onSelectSkill) {
      const skill = result.object as SkillMetadata;
      window.electron.readSkillContent(skill.filePath).then((content) => {
        onSelectSkill(skill.name, content || `@${skill.name}`);
      }).catch(() => {
        onSelectSkill(skill.name, `@${skill.name}`);
      });
    } else if (result.type === 'file' && onSelectFile) {
      const entry = result.object as FileEntry | RecentFile;
      onSelectFile(entry.path);
    } else if (result.type === 'folder' && onNavigateFolder) {
      const entry = result.object as FileEntry;
      onNavigateFolder(entry.path);
    }
  }, [onSelectCommand, onSelectSkill, onSelectFile, onNavigateFolder]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[validSelectedIndex]) {
          handleSelectResult(results[validSelectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [results, validSelectedIndex, handleSelectResult, onClose]);

  if (results.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-ink-900/10 bg-surface shadow-elevated p-4">
        <p className="text-sm text-muted text-center">
          {mode === 'commands-skills'
            ? t('autocomplete.noResults', 'No commands or skills found')
            : t('autocomplete.noFiles', 'No files found')}
        </p>
      </div>
    );
  }

  // Get group headers
  const commandCount = results.filter(r => r.type === 'command').length;
  const skillCount = results.filter(r => r.type === 'skill').length;
  const showCommandHeader = commandCount > 0 && mode === 'commands-skills';
  const showSkillHeader = skillCount > 0 && mode === 'commands-skills';

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-ink-900/10 bg-surface shadow-elevated max-h-80 overflow-y-auto">
      <div ref={listRef} className="divide-y divide-ink-900/5" role="listbox" aria-label="Suggestions" style={{ contentVisibility: 'auto' }}>
        {showCommandHeader && (
          <>
            <div className="px-3 py-2 text-xs font-semibold text-muted uppercase">
              {t('autocomplete.commands', 'Commands')}
            </div>
            {results
              .filter(r => r.type === 'command')
              .map((result, idx) => (
                <ResultItem
                  key={`cmd-${idx}`}
                  result={result}
                  isSelected={validSelectedIndex === results.indexOf(result)}
                  onSelect={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(results.indexOf(result))}
                  dataIndex={results.indexOf(result)}
                />
              ))}
          </>
        )}
        {showSkillHeader && (
          <>
            <div className="px-3 py-2 text-xs font-semibold text-muted uppercase">
              {t('autocomplete.skills', 'Skills')}
            </div>
            {results
              .filter(r => r.type === 'skill')
              .map((result, idx) => (
                <ResultItem
                  key={`skill-${idx}`}
                  result={result}
                  isSelected={validSelectedIndex === results.indexOf(result)}
                  onSelect={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(results.indexOf(result))}
                  dataIndex={results.indexOf(result)}
                />
              ))}
          </>
        )}
        {mode === 'files' &&
          results.map((result, idx) => (
            <ResultItem
              key={`${result.type}-${idx}`}
              result={result}
              isSelected={validSelectedIndex === idx}
              onSelect={() => handleSelectResult(result)}
              onMouseEnter={() => setSelectedIndex(idx)}
              dataIndex={idx}
            />
          ))}
      </div>
    </div>
  );
}

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  dataIndex?: number;
}

function ResultItem({ result, isSelected, onSelect, onMouseEnter, dataIndex }: ResultItemProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'command':
        return <span role="img" aria-label="Command">⚡</span>;
      case 'skill':
        return <span role="img" aria-label="Skill">🔧</span>;
      case 'file':
        return <span role="img" aria-label="File">📄</span>;
      case 'folder':
        return <span role="img" aria-label="Folder">📁</span>;
      default:
        return '';
    }
  };

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      data-index={dataIndex}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={`w-full text-left px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${isSelected ? 'bg-ink-900/10' : 'hover:bg-ink-900/5'
        }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{getIcon(result.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink-900 truncate">{result.name}</div>
          {result.description && (
            <div className="text-xs text-muted truncate">{result.description}</div>
          )}
        </div>
        {result.type === 'folder' && (
          <span className="text-xs text-muted">→</span>
        )}
      </div>
    </button>
  );
}
