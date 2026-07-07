import type { TreeNode } from "../../types";
import { snapshot, mutateTree, focusedNodeId } from "../../stores/treeStore";

import { updateNode, getDefaultTitle, deleteNode } from "../../utils/treeUtils";

export function addChild(node: TreeNode, depth: number) {
  const newId = crypto.randomUUID();
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({
      ...n,
      expanded: true,
      children: [
        ...n.children,
        {
          id: newId,
          title: getDefaultTitle(depth + 1),
          expanded: true,
          status: "todo",
          priority: "medium",
          startDate: new Date().toISOString().slice(0, 10),
          children: [],
        },
      ],
    })),
  );
  return newId;
}

export function removeNode(node: TreeNode) {
  snapshot();
  mutateTree((t) => deleteNode(t, node.id));
}

export function toggleFocus(node: TreeNode) {
  focusedNodeId.update((id) => (id === node.id ? null : node.id));
}

export function toggleFavorite(node: TreeNode) {
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({ ...n, favorite: !n.favorite })),
  );
}

export function setStatus(node: TreeNode, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({
      ...n,
      status: value as "todo" | "doing" | "done",
    })),
  );
}

export function setPriority(node: TreeNode, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({
      ...n,
      priority: value as any,
    })),
  );
}

export function setStartDate(node: TreeNode, event: Event) {
  const value = (event.target as HTMLInputElement).value;
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({
      ...n,
      startDate: value,
    })),
  );
}

export function setDueDate(node: TreeNode, event: Event) {
  const value = (event.target as HTMLInputElement).value;
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({
      ...n,
      dueDate: value || undefined,
    })),
  );
}

export function setIcon(node: TreeNode, dataUri: string) {
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({ ...n, icon: dataUri })),
  );
}

export function removeIcon(node: TreeNode) {
  snapshot();
  mutateTree((t) =>
    updateNode(t, node.id, (n) => ({ ...n, icon: undefined })),
  );
}
