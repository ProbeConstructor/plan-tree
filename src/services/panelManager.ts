import { get } from "svelte/store";
import type { PanelId, ProjectData } from "../types";
import {
  assignProjectToPanel,
  getPanelInstance,
  getPanelProject,
  resetAll,
} from "../stores/panelRegistry";
import { panelLayout } from "../stores/panelStore";
import { loadProject } from "./projectManager";
import { cleanStaleTagRefs } from "../stores/tagStore";
import { recalcInstanceProgress } from "../stores/treeInstance";
import { AutoSaveStrategy } from "./autoSaveStrategy";
import { saveProject } from "./projectManager";
import { progressSnapshot } from "./progressSnapshotService";

// ── Panel Manager ────────────────────────────────────────────
// Coordinates project loading into specific panels.
// This is the bridge between workspaceManager (project CRUD)
// and panelRegistry (per-panel store instances).

let isLoadingPanel = false;

/** Shared auto-save strategy — one per panel, keyed by project name. */
const panelAutoSaves = new Map<string, AutoSaveStrategy>();

export function getAutoSaveForProject(projectName: string): AutoSaveStrategy {
  let as = panelAutoSaves.get(projectName);
  if (!as) {
    as = new AutoSaveStrategy(saveProject);
    panelAutoSaves.set(projectName, as);
  }
  return as;
}

/** Loading guard — set to true while loading projects into panels. */
export function isLoading(): boolean {
  return isLoadingPanel;
}

export function setLoading(v: boolean): void {
  isLoadingPanel = v;
}

/**
 * Load a project into a specific panel.
 * Decrypts the .plan file, populates the panel's tree instance,
 * and sets up auto-save for that panel.
 */
export async function loadProjectIntoPanel(
  panelId: PanelId,
  projectName: string,
): Promise<boolean> {
  setLoading(true);
  try {
    const project = await loadProject(projectName);
    if (!project) {
      return false;
    }

    // Assign project to panel (handles shared instance logic)
    assignProjectToPanel(panelId, projectName);

    const instance = getPanelInstance(panelId);

    // Clear undo history from previous project (prevents cross-project undo)
    instance.history = [];
    instance.canUndo.set(false);

    // Populate stores
    instance.tree.set(project.tree);
    instance.completions.set(project.completions);
    recalcInstanceProgress(instance);

    // Clean stale tag refs
    const cleaned = cleanStaleTagRefs(project.tree);
    if (cleaned !== project.tree) {
      instance.tree.set(cleaned);
    }

    // Sync auto-save node count guard
    const as = getAutoSaveForProject(projectName);
    as.syncNodeCount(projectName, project.tree);

    // Update panel layout store
    panelLayout.update((p) => {
      if (panelId === "left") return { ...p, leftProject: projectName };
      return { ...p, rightProject: projectName };
    });

    // (Re)establish auto-save subscriptions for this panel
    startAutoSaveForPanel(panelId);

    return true;
  } finally {
    setLoading(false);
  }
}

/**
 * Unload a panel (clear its stores, remove project binding).
 */
export function unloadPanel(panelId: PanelId): void {
  // Clean up auto-save subscriptions for this panel
  const old = panelSubscriptions.get(panelId);
  if (old) {
    for (const unsub of old) unsub();
    panelSubscriptions.delete(panelId);
  }

  const instance = getPanelInstance(panelId);
  instance.tree.set({
    id: "root",
    title: "Objetivo principal",
    expanded: true,
    status: "todo",
    priority: "medium",
    startDate: new Date().toISOString().slice(0, 10),
    children: [],
  });
  instance.completions.set({});
  instance.history = [];
  instance.canUndo.set(false);
  instance.focusedNodeId.set(null);
  instance.draggedNodeId.set(null);
  instance.progressMap.set(new Map());

  assignProjectToPanel(panelId, null);

  panelLayout.update((p) => {
    if (panelId === "left") return { ...p, leftProject: null };
    return { ...p, rightProject: null };
  });
}

/**
 * Switch the project in a specific panel.
 */
export async function switchPanelProject(
  panelId: PanelId,
  projectName: string,
): Promise<void> {
  await loadProjectIntoPanel(panelId, projectName);
}

/**
 * Get the project name bound to a specific panel.
 */
export function getProjectForPanel(panelId: PanelId): string | null {
  const layout = get(panelLayout);
  if (panelId === "left") return layout.leftProject;
  return layout.rightProject;
}

/**
 * Get the panelId of the currently focused panel.
 */
export function getFocusedPanel(): PanelId {
  return get(panelLayout).focused;
}

/**
 * Check if both panels show the same project.
 */
export function isSameProjectInBothPanels(): boolean {
  const layout = get(panelLayout);
  return (
    layout.leftProject !== null &&
    layout.leftProject === layout.rightProject
  );
}

// ── Auto-save subscriptions (tracked for cleanup) ─────────────

/** Unsubscribe functions keyed by panelId. */
const panelSubscriptions = new Map<PanelId, Array<() => void>>();

/**
 * Start auto-save subscriptions for a specific panel.
 * Cleans up any existing subscriptions for that panel first.
 * Called automatically after loadProjectIntoPanel.
 */
function startAutoSaveForPanel(panelId: PanelId): void {
  // Clean up old subscriptions for this panel
  const old = panelSubscriptions.get(panelId);
  if (old) {
    for (const unsub of old) unsub();
  }

  const layout = get(panelLayout);
  const projectName = panelId === "left" ? layout.leftProject : layout.rightProject;
  if (!projectName) {
    panelSubscriptions.delete(panelId);
    return;
  }

  const instance = getPanelInstance(panelId);
  const as = getAutoSaveForProject(projectName);
  as.onAfterSave = (project, data) => {
    // [SNAPSHOT-DEBUG] trace: does the tree have done nodes when capture fires?
    let total = 0, done = 0;
    const walk = (n: any) => { total++; if (n.status === "done") done++; (n.children ?? []).forEach(walk); };
    walk(data.tree);
    console.log(`[SNAPSHOT-DEBUG] onAfterSave fired for "${project}": tree has ${total} nodes, ${done} done`);
    return progressSnapshot.capture(project, data.tree, data.completions);
  };
  const unsubs: Array<() => void> = [];

  // Subscribe to tree changes
  unsubs.push(
    instance.tree.subscribe((value) => {
      if (isLoading()) return;
      as.schedule(projectName, {
        tree: value,
        completions: get(instance.completions),
      });
    }),
  );

  // Subscribe to completions changes
  unsubs.push(
    instance.completions.subscribe((value) => {
      if (isLoading()) return;
      as.schedule(projectName, {
        tree: get(instance.tree),
        completions: value,
      });
    }),
  );

  panelSubscriptions.set(panelId, unsubs);
}

/**
 * Start auto-save subscriptions for all active panels.
 * Call this after initial load.
 */
export function startPanelAutoSaves(): void {
  for (const panelId of ["left", "right"] as PanelId[]) {
    startAutoSaveForPanel(panelId);
  }
}

/**
 * Flush all auto-saves (call before close/update).
 */
export async function flushAllAutoSaves(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const as of panelAutoSaves.values()) {
    promises.push(as.flush());
  }
  await Promise.all(promises);
}
