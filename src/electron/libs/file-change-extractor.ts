import type { StreamMessage, FileChangeData, FileTreeNode } from "../types.js";
import { findNodeByPath } from "./file-tree-builder.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMessage = any;

export function extractFileOperation(
  message: StreamMessage,
  messageIndex: number,
  currentFileTree: FileTreeNode
): FileChangeData[] {
  const msg = message as AnyMessage;

  // Only process assistant messages with content
  if (!("message" in msg) || !msg.message || !("content" in msg.message)) {
    return [];
  }

  const content = msg.message.content;
  if (!Array.isArray(content)) {
    return [];
  }

  const changes: FileChangeData[] = [];
  const timestamp = Date.now();

  for (const block of content) {
    if (block.type !== "tool_use") {
      continue;
    }

    const toolName = block.name as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = block.input as any;
    let filePath: string | null = null;
    let operationType: "create" | "modify" | "delete" | null = null;

    if (toolName === "Write") {
      filePath = input?.file_path;
      if (filePath) {
        // Determine if it's a create or modify operation
        const existingNode = findNodeByPath(currentFileTree, filePath);
        operationType = existingNode ? "modify" : "create";
      }
    } else if (toolName === "Edit") {
      filePath = input?.file_path;
      if (filePath) {
        operationType = "modify";
      }
    } else if (toolName === "Bash") {
      // Parse bash command for rm operations
      const command = input?.command as string;
      if (command && /\brm\s+/.test(command)) {
        // Try to extract file path from command
        // Common patterns: rm file, rm -f file, rm -rf directory
        const match = command.match(/rm\s+(?:-[a-z]+\s+)*([^\s]+)/i);
        if (match) {
          filePath = match[1];
          operationType = "delete";
        }
      }
    }

    if (filePath && operationType) {
      changes.push({
        id: `${block.id}-${filePath}`,
        filePath,
        operationType,
        toolName: toolName as "Write" | "Edit" | "Bash",
        messageIndex,
        timestamp
      });
    }
  }

  return changes;
}

export function aggregateFileChanges(
  messages: StreamMessage[],
  fileTree: FileTreeNode
): FileChangeData[] {
  // Use a map to keep only the latest operation per file
  const changeMap = new Map<string, FileChangeData>();

  messages.forEach((message, messageIndex) => {
    const changes = extractFileOperation(message, messageIndex, fileTree);

    changes.forEach((change) => {
      // Keep the latest operation for each file
      changeMap.set(change.filePath, change);
    });
  });

  const result = Array.from(changeMap.values());
  // Sort by timestamp (descending - most recent first)
  result.sort((a, b) => b.timestamp - a.timestamp);

  return result;
}
