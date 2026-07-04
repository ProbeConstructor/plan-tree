import { mutateTree } from "../../stores/treeStore";
import { updateNode } from "../../utils/treeUtils";
import type { TreeNode } from "../../types";

export function useNode(node: TreeNode, depth: number) {
  function toggle() {
    mutateTree((t) =>
      updateNode(t, node.id, (n) => ({
        ...n,
        expanded: !n.expanded,
      })),
    );
  }
  function toggleDetails() {}
  function addChild() {}
  function removeNode() {}
  function toggleFocus() {}
  function saveTitle() {}
  function setStatus(event: Event) {}
  function setPriority(event: Event) {}
  function setStartDate(event: Event) {}
  function setDueDate(event: Event) {}
  function focusOnMount(el: HTMLInputElement) {}

  return {
    toggle,
    toggleDetails,
    addChild,
    removeNode,
    toggleFocus,
    saveTitle,
    setStatus,
    setPriority,
    setStartDate,
    setDueDate,
    focusOnMount,
  };
}
