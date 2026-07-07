import type { TreeNode, TreeViewNode } from "../types";

export function buildVisibleTree(
  root: TreeNode,
  rowOffsets: Map<number, number>,
  favoriteIds?: Set<string>,
): TreeViewNode[] {
  const viewNodes: TreeViewNode[] = [];

  // Precompute which nodes are visible in filter mode
  const visibleInFilter = new Set<string>();
  if (favoriteIds && favoriteIds.size > 0) {
    function markVisible(node: TreeNode): boolean {
      const isFav = favoriteIds!.has(node.id);
      const hasFavDescendant = (node.children ?? []).some(markVisible);
      if (isFav || hasFavDescendant) {
        visibleInFilter.add(node.id);
        return true;
      }
      return false;
    }
    markVisible(root);
  }

  function isVisible(node: TreeNode): boolean {
    if (!favoriteIds || favoriteIds.size === 0) return true;
    return visibleInFilter.has(node.id);
  }

  function buildView(
    node: TreeNode,
    depth: number,
    path: string,
    isRoot: boolean,
    parentId?: string,
  ) {
    viewNodes.push({
      node,
      depth,
      path,
      isRoot,
      parentId,
      subtreeWidth: 1,
      x: 0,
      y: depth,
    });
    if (!node.expanded && !favoriteIds) {
      return;
    }
    (node.children ?? []).forEach((child, index) => {
      if (favoriteIds && !isVisible(child)) return;
      // Force-expand ancestors of favorites
      const childExpanded = favoriteIds && node.expanded === false
        ? visibleInFilter.has(child.id)
        : node.expanded;
      if (!childExpanded && !favoriteIds) return;
      buildView(child, depth + 1, `${path}.${index + 1}`, false, node.id);
    });
  }
  buildView(root, 0, "1", true);
  calculateSubtreeWidths(viewNodes);
  calculatePositions(viewNodes);
  return viewNodes;
}

function calculateSubtreeWidths(nodes: TreeViewNode[]) {
  const childrenMap = new Map<string, TreeViewNode[]>();

  for (const node of nodes) {
    if (!node.parentId) continue;
    let children = childrenMap.get(node.parentId);
    if (!children) {
      children = [];
      childrenMap.set(node.parentId, children);
    }
    children.push(node);
  }

  function calculateWidth(node: TreeViewNode): number {
    const children = childrenMap.get(node.node.id);

    if (!children || children.length === 0) {
      node.subtreeWidth = 1;
      return 1;
    }
    let width = 0;
    for (const child of children) {
      width += calculateWidth(child);
    }
    node.subtreeWidth = width;
    return width;
  }
  const root = nodes.find((n) => n.isRoot);
  if (root) {
    calculateWidth(root);
  }
}

function calculatePositions(nodes: TreeViewNode[]) {
  const childrenMap = new Map<string, TreeViewNode[]>();

  for (const node of nodes) {
    if (!node.parentId) continue;
    let children = childrenMap.get(node.parentId);
    if (!children) {
      children = [];
      childrenMap.set(node.parentId, children);
    }
    children.push(node);
  }
  const root = nodes.find((n) => n.isRoot);
  if (!root) return;
  assignPosition(root, 0);

  function assignPosition(node: TreeViewNode, startX: number) {
    node.x = startX + (node.subtreeWidth - 1) / 2;
    node.y = node.depth;
    const children = childrenMap.get(node.node.id);
    if (!children) return;
    let cursor = startX;
    for (const child of children) {
      assignPosition(child, cursor);
      cursor += child.subtreeWidth;
    }
  }
}
