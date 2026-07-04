import { writable, get } from "svelte/store";
import type { TreeNode } from "../types";
import { calculateProgressMap } from "../utils/treeUtils";
import { derived } from "svelte/store";
import { calculateLayout } from "../utils/treeLayout";

export const focusedNodeId = writable<string | null>(null);
export const tree = writable(defaultTree());
export const draggedNodeId = writable<string | null>(null);
export const canUndo = writable(false);
export const progressMap = writable(new Map<string, number>());

tree.subscribe((t) => {
  progressMap.set(calculateProgressMap(t));
});

let history: TreeNode[] = [];
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
  history.push(structuredClone(get(tree)));
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  canUndo.set(true);
}

export function undo(): void {
  const previous = history.pop();
  if (previous) {
    tree.set(previous);
  }
  canUndo.set(history.length > 0);
}

export function mutateTree(callback: (tree: TreeNode) => TreeNode) {
  tree.update(callback);
}

export function resetTree(): void {
  tree.set(defaultTree());
  history = [];
  canUndo.set(false);
  focusedNodeId.set(null);
  draggedNodeId.set(null);
}

export const layoutMap = derived(tree, ($tree) => {
  return calculateLayout($tree);
});
