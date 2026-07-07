import type { TreeNode } from "../../types";
import { snapshot, mutateTree, focusedNodeId, recalcProgress } from "../../stores/treeStore";

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
  recalcProgress();
  return newId;
}

export function removeNode(node: TreeNode) {
  snapshot();
  mutateTree((t) => deleteNode(t, node.id));
  recalcProgress();
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
  recalcProgress();
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

// ── editing (merged from useNodeEditing.ts) ──

export function startEditing(title: string, setTempTitle: (v: string) => void, setEditing: (v: boolean) => void) {
  setTempTitle(title);
  setEditing(true);
}

export function saveTitle(node: TreeNode, getTempTitle: () => string, setEditing: (v: boolean) => void) {
  setEditing(false);
  if (getTempTitle() === node.title) return;
  snapshot();
  mutateTree((tree) =>
    updateNode(tree, node.id, (n) => ({
      ...n,
      title: getTempTitle(),
    })),
  );
}

export function focusOnMount(el: HTMLInputElement) {
  el.focus();
}

// ── expansion (inlined from useNodeExpansion.ts) ──

export function toggleExpand(node: TreeNode) {
  mutateTree((tree) =>
    updateNode(tree, node.id, (n) => ({
      ...n,
      expanded: !n.expanded,
    })),
  );
}
