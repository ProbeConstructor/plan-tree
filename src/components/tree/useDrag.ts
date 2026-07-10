import { get } from "svelte/store";
import { draggedNodeId } from "../../stores/treeStore";
import type { TreeNode } from "../../types";
import { moveNodeCommand } from "../../commands/treeCommands";

export function useDrag(
  node: TreeNode,
  {
    setDragOver,
  }: {
    setDragOver: (value: boolean) => void;
  },
) {
  function handleDragStart(event: DragEvent) {
    event.stopPropagation();
    event.dataTransfer?.setData("text/plain", node.id);
    event.dataTransfer!.effectAllowed = "move";
    draggedNodeId.set(node.id);
  }

  function handleDragOver(event: DragEvent) {
    if (!get(draggedNodeId) || get(draggedNodeId) === node.id) return;
    event.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const draggedId = get(draggedNodeId);
    draggedNodeId.set(null);
    if (!draggedId || draggedId === node.id) return;
    moveNodeCommand(draggedId, node.id);
  }

  function handleDragEnd() {
    draggedNodeId.set(null);
    setDragOver(false);
  }
  return {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
