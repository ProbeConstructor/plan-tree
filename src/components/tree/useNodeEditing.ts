import { snapshot, mutateTree } from "../../stores/treeStore";
import { updateNode } from "../../utils/treeUtils";
import type { TreeNode } from "../../types";

export function useNodeEditing(
  node: TreeNode,
  api: {
    getEditing: () => boolean;
    setEditing: (v: boolean) => void;
    getTempTitle: () => string;
    setTempTitle: (v: string) => void;
  },
) {
  function startEditing() {
    api.setTempTitle(node.title);
    api.setEditing(true);
  }

  function saveTitle() {
    api.setEditing(false);
    if (api.getTempTitle() === node.title) return;
    snapshot();
    mutateTree((tree) => {
      const updated = updateNode(tree, node.id, (n) => ({
        ...n,
        title: api.getTempTitle(),
      }));
      return updated;
    });
  }

  function focusOnMount(el: HTMLInputElement) {
    el.focus();
  }

  return {
    startEditing,
    saveTitle,
    focusOnMount,
  };
}
