import { writable, get, type Writable } from "svelte/store";
import type { TreeNode, CompletionsMap, PanelId } from "../types";
import { calculateProgressMap } from "../utils/treeUtils";

// ── TreeInstance: bundles all per-panel stores ────────────────

export interface HistoryEntry {
  tree: TreeNode;
  completions: CompletionsMap;
}

export interface TreeInstance {
  tree: Writable<TreeNode>;
  completions: Writable<CompletionsMap>;
  progressMap: Writable<Map<string, number>>;
  canUndo: Writable<boolean>;
  focusedNodeId: Writable<string | null>;
  draggedNodeId: Writable<string | null>;

  /** Undo history for this tree instance (shared across panels showing same project). */
  history: HistoryEntry[];
}

const MAX_HISTORY = 50;

// ── Factory ──────────────────────────────────────────────────

function defaultTree(): TreeNode {
  return {
    id: "root",
    title: "Objetivo principal",
    expanded: true,
    status: "todo",
    priority: "medium",
    startDate: new Date().toISOString().slice(0, 10),
    children: [],
  };
}

export function createTreeInstance(): TreeInstance {
  const tree = writable<TreeNode>(defaultTree());
  const completions = writable<CompletionsMap>({});
  const progressMap = writable(new Map<string, number>());
  const canUndo = writable(false);
  const focusedNodeId = writable<string | null>(null);
  const draggedNodeId = writable<string | null>(null);

  // Initial progress calculation
  progressMap.set(calculateProgressMap(get(tree)));

  return {
    tree,
    completions,
    progressMap,
    canUndo,
    focusedNodeId,
    draggedNodeId,
    history: [],
  };
}

// ── Instance operations ──────────────────────────────────────

export function snapshotInstance(instance: TreeInstance): void {
  instance.history.push({
    tree: structuredClone(get(instance.tree)),
    completions: structuredClone(get(instance.completions)),
  });
  if (instance.history.length > MAX_HISTORY) {
    instance.history.shift();
  }
  instance.canUndo.set(true);
}

export function undoInstance(instance: TreeInstance): void {
  const previous = instance.history.pop();
  if (previous) {
    instance.tree.set(previous.tree);
    instance.completions.set(previous.completions);
  }
  instance.canUndo.set(instance.history.length > 0);
  instance.progressMap.set(calculateProgressMap(get(instance.tree)));
}

export function resetInstance(instance: TreeInstance): void {
  instance.tree.set(defaultTree());
  instance.completions.set({});
  instance.history = [];
  instance.canUndo.set(false);
  instance.focusedNodeId.set(null);
  instance.draggedNodeId.set(null);
  instance.progressMap.set(calculateProgressMap(get(instance.tree)));
}

export function recalcInstanceProgress(instance: TreeInstance): void {
  instance.progressMap.set(calculateProgressMap(get(instance.tree)));
}
