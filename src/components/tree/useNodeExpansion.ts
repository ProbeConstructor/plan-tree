import { mutateTree } from "../../stores/treeStore";
import { updateNode } from "../../utils/treeUtils";
import type { TreeNode } from "../../types";

export function useNodeExpansion(node: TreeNode) {
  function toggle() {
    mutateTree((tree) =>
      updateNode(tree, node.id, (n) => {
        return {
          ...n,
          expanded: !n.expanded,
        };
      }),
    );
  }

  return {
    toggle,
  };
}
