import type { FileTreeNode, FileChangeData } from "../types.js";
import { basename, normalize } from "path";

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

function normalizePath(filePath: string): string {
  return normalize(filePath).split("\\").join("/");
}

export function findNodeByPath(
  tree: FileTreeNode,
  targetPath: string
): FileTreeNode | null {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedTree = normalizePath(tree.path);

  if (normalizedTree === normalizedTarget) {
    return tree;
  }

  if (!tree.isDirectory) {
    return null;
  }

  const targetParts = normalizedTarget.split("/").filter(Boolean);
  const treeParts = normalizedTree.split("/").filter(Boolean);

  // Check if target starts with tree path
  if (targetParts.length <= treeParts.length) {
    return null;
  }

  const remainingParts = targetParts.slice(treeParts.length);

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

  for (const change of changes) {
    const normalizedPath = normalizePath(change.filePath);
    const parts = normalizedPath.split("/").filter(Boolean);

    if (change.operationType === "create") {
      // Create directories and file as needed
      let current = newTree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const isDirectory = !isLast;

        if (!current.children[part]) {
          const nodePath = normalizePath(`${current.path}/${part}`);
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
      const parts = normalizedPath.split("/").filter(Boolean);
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
  const normalizedCwd = normalizePath(cwdPath);
  const root = createEmptyFileTreeNode(normalizedCwd, basename(normalizedCwd) || normalizedCwd, true);

  if (!files || files.length === 0) {
    return root;
  }

  // Add files to the tree
  for (const file of files) {
    const normalizedFile = normalizePath(file);
    const parts = normalizedFile.split("/").filter(Boolean);

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const isDirectory = !isLast;

      if (!current.children[part]) {
        const nodePath = normalizePath(`${current.path}/${part}`);
        current.children[part] = createEmptyFileTreeNode(nodePath, part, isDirectory);
      }

      current = current.children[part];
    }
  }

  return root;
}
