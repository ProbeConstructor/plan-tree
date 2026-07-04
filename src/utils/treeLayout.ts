import type { TreeNode } from "../types";

export interface LayoutNode {
  subtreeWidth: number;
  x: number;
  y: number;
}

export function calculateLayout(root: TreeNode) {
  const layout = new Map<string, LayoutNode>();
  const NODE_UNIT = 1;

  function calculateWidths(node: TreeNode): number {
    if (node.children.length === 0) {
      layout.set(node.id, {
        subtreeWidth: NODE_UNIT,
        x: 0,
        y: 0,
      });
      return 1;
    }
    let width = 0;
    for (const child of node.children) {
      width += calculateWidths(child);
    }
    layout.set(node.id, {
      subtreeWidth: width,
      x: 0,
      y: 0,
    });
    return width;
  }

  function assignPositions(node: TreeNode, centerX: number, depth: number) {
    const current = layout.get(node.id)!;
    current.x = centerX;
    current.y = depth;
    let cursor = centerX - current.subtreeWidth / 2;
    for (const child of node.children) {
      const childLayout = layout.get(child.id)!;
      const childCenter = cursor + childLayout.subtreeWidth / 2;
      assignPositions(child, childCenter, depth + 1);
      cursor += childLayout.subtreeWidth;
    }
  }
  calculateWidths(root);
  const rootWidth = layout.get(root.id)!.subtreeWidth;
  assignPositions(root, rootWidth / 2, 0);
  return layout;
}
