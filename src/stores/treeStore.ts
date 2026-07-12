import { writable, get } from "svelte/store";
import type { PanelId } from "../types";
import {
  getPanelInstance,
  snapshotInstance,
  undoInstance,
  resetInstance,
  recalcInstanceProgress,
} from "./panelRegistry";

// ── Default tree (used by factory and reset) ─────────────────

export function defaultTree() {
  return {
    id: "root",
    title: "Objetivo principal",
    expanded: true,
    status: "todo" as const,
    priority: "medium" as const,
    startDate: new Date().toISOString().slice(0, 10),
    children: [],
  };
}

// ── Backward-compatible singleton aliases ─────────────────────
// These point to the "left" panel instance so all existing
// imports continue to work unchanged during migration.

function left() {
  return getPanelInstance("left");
}

export const tree = left().tree;
export const completions = left().completions;
export const focusedNodeId = left().focusedNodeId;
export const draggedNodeId = left().draggedNodeId;
export const canUndo = left().canUndo;
export const progressMap = left().progressMap;

// Panel-independent store (not part of TreeInstance)
export const favoritesFilter = writable(false);

// ── Panel-scoped operations ──────────────────────────────────

/** Snapshot the focused panel's tree (for undo). */
export function snapshot(panelId: PanelId = "left"): void {
  snapshotInstance(getPanelInstance(panelId));
}

/** Undo the focused panel's tree. */
export function undo(panelId: PanelId = "left"): void {
  undoInstance(getPanelInstance(panelId));
}

/** Mutate the tree of a specific panel. */
export function mutateTree(
  callback: (tree: any) => any,
  panelId: PanelId = "left",
): void {
  const inst = getPanelInstance(panelId);
  inst.tree.update(callback);
}

/** Reset a panel's tree to default. */
export function resetTree(panelId: PanelId = "left"): void {
  resetInstance(getPanelInstance(panelId));
}

/** Recalculate progress for a specific panel. */
export function recalcProgress(panelId: PanelId = "left"): void {
  recalcInstanceProgress(getPanelInstance(panelId));
}

// ── Initial progress calc ────────────────────────────────────
recalcProgress("left");
