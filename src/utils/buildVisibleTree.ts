import type { TreeNode, TreeViewNode } from "../types";

export function buildVisibleTree(
  root: TreeNode,
  rowOffsets: Map<number, number>,
): TreeViewNode[] {
  const viewNodes: TreeViewNode[] = [];

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
    if (!node.expanded) {
      return;
    }
    node.children.forEach((child, index) => {
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
