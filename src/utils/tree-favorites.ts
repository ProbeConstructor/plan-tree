import type { TreeNode } from "../types";

export function collectFavorites(root: TreeNode): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(node: TreeNode) {
    if (node.favorite) result.push(node);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return result;
}

export function getFavoriteIds(root: TreeNode): Set<string> {
  const ids = new Set<string>();
  function walk(node: TreeNode) {
    if (node.favorite) ids.add(node.id);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return ids;
}
