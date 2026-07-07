import { writable, get } from "svelte/store";
import type { TreeNode, CompletionsMap } from "../types";
import { calculateProgressMap } from "../utils/treeUtils";
import { completions } from "./completionStore";

export const focusedNodeId = writable<string | null>(null);
export const tree = writable(defaultTree());
export const draggedNodeId = writable<string | null>(null);
export const canUndo = writable(false);
export const progressMap = writable(new Map<string, number>());
export const favoritesFilter = writable(false);

/** Recalculate progress map from current tree. Call after progress-affecting mutations. */
export function recalcProgress(): void {
  progressMap.set(calculateProgressMap(get(tree)));
}

/** Lazily recalculate once at init */
recalcProgress();

interface HistoryEntry {
  tree: TreeNode;
  completions: CompletionsMap;
}

let history: HistoryEntry[] = [];
const MAX_HISTORY = 50;

progressMap.set(calculateProgressMap(get(tree)));

export function defaultTree(): TreeNode {
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

export function snapshot(): void {
  history.push({
    tree: structuredClone(get(tree)),
    completions: structuredClone(get(completions)),
  });
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  canUndo.set(true);
}

export function undo(): void {
  const previous = history.pop();
  if (previous) {
    tree.set(previous.tree);
    completions.set(previous.completions);
  }
  canUndo.set(history.length > 0);
  recalcProgress();
}

export function mutateTree(callback: (tree: TreeNode) => TreeNode) {
  tree.update(callback);
}

export function resetTree(): void {
  tree.set(defaultTree());
  completions.set({});
  history = [];
  canUndo.set(false);
  focusedNodeId.set(null);
  draggedNodeId.set(null);
  recalcProgress();
}

