import type { Command, SkillMetadata, FileEntry, RecentFile } from "@ui/types";
import { AutocompletePopup } from "@ui/components/AutocompletePopup";

type AutocompleteManagerProps = {
  show: boolean;
  mode: "commands-skills" | "files";
  filter: string;
  commands: Command[];
  skills: SkillMetadata[];
  fileEntries: FileEntry[];
  recentFiles: RecentFile[];
  onSelectCommand: (name: string, content: string) => void;
  onSelectSkill: (name: string, content: string) => void;
  onSelectFile: (path: string) => void;
  onNavigateFolder: (folderPath: string) => void;
  onClose: () => void;
};

export function AutocompleteManager({
  show,
  mode,
  filter,
  commands,
  skills,
  fileEntries,
  recentFiles,
  onSelectCommand,
  onSelectSkill,
  onSelectFile,
  onNavigateFolder,
  onClose
}: AutocompleteManagerProps) {
  if (!show) return null;

  return (
    <AutocompletePopup
      mode={mode}
      filter={filter}
      commands={commands}
      skills={skills}
      fileEntries={fileEntries}
      recentFiles={recentFiles}
      onSelectCommand={onSelectCommand}
      onSelectSkill={onSelectSkill}
      onSelectFile={onSelectFile}
      onNavigateFolder={onNavigateFolder}
      onClose={onClose}
    />
  );
}
