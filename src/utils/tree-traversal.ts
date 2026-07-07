import type { TreeNode } from "../types";
import { deleteNode } from "./tree-mutation";

export function findNode(tree: TreeNode, id: string): TreeNode | null {
  if (tree.id === id) return tree;

  for (const child of tree.children) {
    const found = findNode(child, id);
    if (found) return found;
  }

  return null;
}

export function containsId(node: TreeNode, id: string): boolean {
  if (node.id === id) return true;
  return node.children.some((child) => containsId(child, id));
}

export function extractNode(
  tree: TreeNode,
  id: string,
): { extracted: TreeNode | null; remainingTree: TreeNode } {
  const extracted = findNode(tree, id);

  if (!extracted) {
    return { extracted: null, remainingTree: tree };
  }

  return {
    extracted: structuredClone(extracted),
    remainingTree: deleteNode(tree, id),
  };
}
