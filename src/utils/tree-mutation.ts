import type { TreeNode } from "../types";
import { findNode, containsId } from "./tree-traversal";

export function updateNode(
  tree: TreeNode,
  id: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode {
  if (tree.id === id) {
    return updater(tree);
  }

  return {
    ...tree,
    children: tree.children.map((child) => updateNode(child, id, updater)),
  };
}

export function deleteNode(tree: TreeNode, id: string): TreeNode {
  return {
    ...tree,
    children: tree.children
      .filter((c) => c.id !== id)
      .map((c) => deleteNode(c, id)),
  };
}

export function moveNode(
  root: TreeNode,
  draggedId: string,
  targetParentId: string,
): TreeNode {
  if (draggedId === targetParentId) return root;
  if (draggedId === root.id) return root; // no se puede mover el origen
  const draggedNode = findNode(root, draggedId);
  if (!draggedNode) return root;
  if (containsId(draggedNode, targetParentId)) return root; // soltarías dentro de sí mismo
  if (!findNode(root, targetParentId)) return root;
  const withoutDragged = deleteNode(root, draggedId);
  return updateNode(withoutDragged, targetParentId, (n) => ({
    ...n,
    expanded: true,
    children: [...n.children, draggedNode],
  }));
}

export function hasAnyFocus(node: TreeNode): boolean {
  if (node.focused) return true;
  return node.children.some(hasAnyFocus);
}

export function setFocus(root: TreeNode, id: string | null): TreeNode {
  function clearFocus(n: TreeNode): TreeNode {
    return { ...n, focused: false, children: n.children.map(clearFocus) };
  }

  const cleared = clearFocus(root);
  if (!id) return cleared; // id null = quitar el foco de todos

  return updateNode(cleared, id, (n) => ({ ...n, focused: true }));
}

export function toggleFavorite(tree: TreeNode, id: string): TreeNode {
  return updateNode(tree, id, (n) => ({ ...n, favorite: !n.favorite }));
}
