import type { FileTreeNode, FileChangeData } from "../../electron/types.js";
import path from "path";

export function createEmptyFileTreeNode(
  nodePath: string,
  name: string,
  isDirectory: boolean
): FileTreeNode {
  return {
    path: nodePath,
    name,
    isDirectory,
    children: {},
    isExpanded: isDirectory,
    hasRecentOperation: false
  };
}

export function findNodeByPath(
  tree: FileTreeNode,
  targetPath: string
): FileTreeNode | null {
  if (tree.path === targetPath) {
    return tree;
  }

  if (!tree.isDirectory) {
    return null;
  }

  const parts = targetPath.split(/[/\\]/).filter(Boolean);
  const treeParts = tree.path.split(/[/\\]/).filter(Boolean);

  // Remove the tree root from parts if targetPath starts with tree.path
  const remainingParts = parts.slice(treeParts.length);

  let current = tree;
  for (const part of remainingParts) {
    if (!current.children[part]) {
      return null;
    }
    current = current.children[part];
  }

  return current;
}

export function updateFileTreeWithOperations(
  tree: FileTreeNode,
  changes: FileChangeData[]
): FileTreeNode {
  const newTree = JSON.parse(JSON.stringify(tree)) as FileTreeNode;
  const timestamp = Date.now();

  for (const change of changes) {
    const parts = change.filePath.split(/[/\\]/).filter(Boolean);

    if (change.operationType === "create") {
      // Create directories and file as needed
      let current = newTree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const isDirectory = !isLast;

        if (!current.children[part]) {
          const nodePath = [...current.path.split(/[/\\]/).filter(Boolean), ...parts.slice(0, i + 1)].join(
            "/"
          );
          current.children[part] = createEmptyFileTreeNode(nodePath, part, isDirectory);
        }

        if (isLast && !isDirectory) {
          // Mark the file as having recent operation
          current.children[part].hasRecentOperation = true;
          current.children[part].lastOperationIndex = change.messageIndex;
        }

        current = current.children[part];
      }
    } else if (change.operationType === "modify") {
      // Mark file as modified
      const node = findNodeByPath(newTree, change.filePath);
      if (node) {
        node.hasRecentOperation = true;
        node.lastOperationIndex = change.messageIndex;
      }
    } else if (change.operationType === "delete") {
      // Remove file/directory
      const parts = change.filePath.split(/[/\\]/).filter(Boolean);
      if (parts.length === 0) {
        return newTree;
      }

      let current = newTree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current.children[parts[i]]) {
          return newTree;
        }
        current = current.children[parts[i]];
      }

      delete current.children[parts[parts.length - 1]];
    }
  }

  return newTree;
}

export function toggleNodeExpanded(tree: FileTreeNode, targetPath: string): FileTreeNode {
  const newTree = JSON.parse(JSON.stringify(tree)) as FileTreeNode;
  const node = findNodeByPath(newTree, targetPath);

  if (node && node.isDirectory) {
    node.isExpanded = !node.isExpanded;
  }

  return newTree;
}

export function buildInitialFileTree(cwdPath: string, files?: string[]): FileTreeNode {
  const root = createEmptyFileTreeNode(cwdPath, path.basename(cwdPath) || cwdPath, true);

  if (!files || files.length === 0) {
    return root;
  }

  // Add files to the tree
  for (const file of files) {
    const parts = file.split(/[/\\]/).filter(Boolean);

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const isDirectory = !isLast;

      if (!current.children[part]) {
        const nodePath = [cwdPath, ...parts.slice(0, i + 1)].join("/");
        current.children[part] = createEmptyFileTreeNode(nodePath, part, isDirectory);
      }

      current = current.children[part];
    }
  }

  return root;
}
