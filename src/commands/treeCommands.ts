/**
 * treeCommands — entry point único para todas las mutaciones del árbol.
 *
 * Cada función se encarga internamente de:
 *  - snapshot() para undo
 *  - mutateTree() para la mutación inmutable
 *  - recalcProgress() cuando corresponde
 *
 * Los componentes llaman a estas funciones; nunca importan mutateTree
 * o snapshot directamente.
 */
import type { TreeNode } from "../types";
import {
  snapshot,
  mutateTree,
  focusedNodeId,
  recalcProgress,
} from "../stores/treeStore";
import { updateNode, deleteNode, getDefaultTitle, moveNode } from "../utils/treeUtils";

// ── Child management ───────────────────────────────────────

export function addChild(parentId: string, depth: number): string {
  const newId = crypto.randomUUID();
  snapshot();
  mutateTree((t) =>
    updateNode(t, parentId, (n) => ({
      ...n,
      expanded: true,
      children: [
        ...n.children,
        {
          id: newId,
          title: getDefaultTitle(depth + 1),
          expanded: true,
          status: "todo" as const,
          priority: "medium" as const,
          startDate: new Date().toISOString().slice(0, 10),
          children: [],
        },
      ],
    })),
  );
  recalcProgress();
  return newId;
}

export function removeNode(nodeId: string): void {
  snapshot();
  mutateTree((t) => deleteNode(t, nodeId));
  recalcProgress();
}

// ── Expansion / focus / favorites ──────────────────────────

export function toggleExpand(nodeId: string): void {
  mutateTree((t) =>
    updateNode(t, nodeId, (n) => ({ ...n, expanded: !n.expanded })),
  );
}

export function toggleFocus(nodeId: string | null): void {
  focusedNodeId.update((id) => (id === nodeId ? null : nodeId));
}

export function toggleFavorite(nodeId: string): void {
  snapshot();
  mutateTree((t) =>
    updateNode(t, nodeId, (n) => ({ ...n, favorite: !n.favorite })),
  );
}

// ── Field mutations ────────────────────────────────────────

export function setStatus(nodeId: string, status: TreeNode["status"]): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, status })));
  recalcProgress();
}

export function setPriority(nodeId: string, priority: TreeNode["priority"]): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, priority })));
}

export function setStartDate(nodeId: string, date: string): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, startDate: date })));
}

export function setDueDate(nodeId: string, date: string | undefined): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, dueDate: date || undefined })));
}

export function setIcon(nodeId: string, dataUri: string): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, icon: dataUri })));
}

export function removeIcon(nodeId: string): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, icon: undefined })));
}

export function saveTitle(nodeId: string, title: string): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, title })));
}

// ── Tags ───────────────────────────────────────────────────

export function assignTag(nodeId: string, tagId: string): void {
  snapshot();
  mutateTree((t) =>
    updateNode(t, nodeId, (n) => ({
      ...n,
      tags: [...(n.tags ?? []), tagId],
    })),
  );
}

export function removeTag(nodeId: string, tagId: string): void {
  snapshot();
  mutateTree((t) =>
    updateNode(t, nodeId, (n) => ({
      ...n,
      tags: (n.tags ?? []).filter((id) => id !== tagId),
    })),
  );
}

// ── Drag / move ────────────────────────────────────────────

export function moveNodeCommand(draggedId: string, targetParentId: string): void {
  snapshot();
  mutateTree((t) => moveNode(t, draggedId, targetParentId));
  recalcProgress();
}

// ── Import / replace ───────────────────────────────────────

export function importTreeCommand(newTree: TreeNode): void {
  snapshot();
  mutateTree(() => newTree);
  recalcProgress();
}

// ── Batch update (NodeDetailModal) ────────────────────────

export interface NodeDetailsPatch {
  status?: TreeNode["status"];
  priority?: TreeNode["priority"];
  startDate?: string;
  dueDate?: string | undefined;
  comments?: string | undefined;
}

export function updateNodeDetails(nodeId: string, patch: NodeDetailsPatch): void {
  snapshot();
  mutateTree((t) =>
    updateNode(t, nodeId, (n) => ({
      ...n,
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.startDate !== undefined && { startDate: patch.startDate }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate || undefined }),
      ...(patch.comments !== undefined && { comments: patch.comments || undefined }),
    })),
  );
}

// ── Recurrence ────────────────────────────────────────────

import type { RecurrenceRule } from "../types";

export function setRecurrence(nodeId: string, rule: RecurrenceRule | undefined): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, recurrence: rule })));
}

export function clearRecurrence(nodeId: string): void {
  snapshot();
  mutateTree((t) => updateNode(t, nodeId, (n) => ({ ...n, recurrence: undefined })));
}

// ── Tag tree-wide ops ─────────────────────────────────────

/**
 * Remove a tag definition from ALL nodes in the tree.
 * Call this BEFORE removing the tag definition from the profile.
 */
export function removeTagFromAllNodes(tagId: string): void {
  snapshot();
  mutateTree((t) => {
    function walk(node: TreeNode): TreeNode {
      if (node.tags?.includes(tagId)) {
        const next = node.tags.filter((id) => id !== tagId);
        node = { ...node, tags: next.length > 0 ? next : undefined };
      }
      if (node.children?.length > 0) {
        node = { ...node, children: node.children.map(walk) };
      }
      return node;
    }
    return walk(t);
  });
}
