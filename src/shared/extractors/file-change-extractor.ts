import type { StreamMessage, FileChangeData, FileTreeNode } from "../index.js";
import { findNodeByPath } from "./file-tree-builder.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMessage = any;

export function extractFileOperation(
  message: StreamMessage,
  messageIndex: number,
  currentFileTree: FileTreeNode
): FileChangeData[] {
  const msg = message as AnyMessage;

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
        const existingNode = findNodeByPath(currentFileTree, filePath);
        operationType = existingNode ? "modify" : "create";
      }
    } else if (toolName === "Edit") {
      filePath = input?.file_path;
      if (filePath) {
        operationType = "modify";
      }
    } else if (toolName === "Bash") {
      const command = input?.command as string;
      if (command && /\brm\s+/.test(command)) {
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
  const changeMap = new Map<string, FileChangeData>();

  messages.forEach((message, messageIndex) => {
    const changes = extractFileOperation(message, messageIndex, fileTree);

    changes.forEach((change) => {
      changeMap.set(change.filePath, change);
    });
  });

  const result = Array.from(changeMap.values());
  result.sort((a, b) => b.timestamp - a.timestamp);

  return result;
}
