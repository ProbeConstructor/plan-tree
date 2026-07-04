import { getPriorityColor, getProgressColor } from "../../utils/treeUtils";
import type { TreeNode } from "../../types";

export function getNodeView(
  node: TreeNode,
  progress: number,
  focusedId: string | null,
) {
  return {
    progress,
    accent: getPriorityColor(node.priority),
    progressColor: getProgressColor(progress),
    hasChildren: node.children.length > 0,
    dimmed: focusedId !== null && focusedId !== node.id,
  };
}
