import { get } from "svelte/store";
import type { PanelId } from "../types";
import {
  createTreeInstance,
  type TreeInstance,
  snapshotInstance,
  undoInstance,
  resetInstance,
  recalcInstanceProgress,
} from "./treeInstance";

// Re-export instance operations so treeStore.ts can import from here
export {
  snapshotInstance,
  undoInstance,
  resetInstance,
  recalcInstanceProgress,
} from "./treeInstance";

// ── Panel Registry ───────────────────────────────────────────
// Central map: PanelId → TreeInstance.
// Each panel ALWAYS has its own independent instance.
// Never shared — both panels can show the same project
// with independent data, undo, and completions.

const instances = new Map<PanelId, TreeInstance>();

export function getPanelInstance(panelId: PanelId): TreeInstance {
  let inst = instances.get(panelId);
  if (!inst) {
    inst = createTreeInstance();
    instances.set(panelId, inst);
  }
  return inst;
}

/**
 * Assign a project to a panel.
 * Only updates the project binding — never creates or swaps instances.
 * Each panel always keeps its own independent TreeInstance.
 */
export function assignProjectToPanel(panelId: PanelId, projectName: string | null): void {
  panelProjects.set(panelId, projectName);
}

/** Track which project is bound to each panel. */
const panelProjects = new Map<PanelId, string | null>();

export function getPanelProject(panelId: PanelId): string | null {
  return panelProjects.get(panelId) ?? null;
}

// ── Convenience: snapshot/undo scoped to focused panel ───────

export function snapshotFocused(focusedPanel: PanelId): void {
  snapshotInstance(getPanelInstance(focusedPanel));
}

export function undoFocused(focusedPanel: PanelId): void {
  undoInstance(getPanelInstance(focusedPanel));
}

export function resetAll(): void {
  for (const inst of instances.values()) {
    resetInstance(inst);
  }
  panelProjects.clear();
}
