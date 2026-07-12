import { get } from "svelte/store";
import type { PanelId } from "../types";
import { tree, resetTree, defaultTree, recalcProgress } from "../stores/treeStore";
import { completions } from "../stores/completionStore";
import { projects, activeProject } from "../stores/workspaceStore";
import { activeProfile } from "../stores/profileStore";
import { openModal } from "../stores/modalStore";
import ConfirmModal from "../modals/ConfirmModal.svelte";

import {
  listProjects,
  loadProject,
  saveProject,
  createProject as createProjectFile,
  deleteProject as deleteProjectFile,
  renameProject as renameProjectFile,
} from "./projectManager";

import { getLastProject, setLastProject } from "./profileManager";
import { progressSnapshot } from "./progressSnapshotService";
import { loadTags, cleanStaleTagRefs } from "../stores/tagStore";
import { panelLayout } from "../stores/panelStore";
import {
  loadProjectIntoPanel,
  switchPanelProject as loadSwitchPanelProject,
  getAutoSaveForProject,
  setLoading,
  getFocusedPanel,
  getProjectForPanel,
  unloadPanel,
  flushAllAutoSaves,
  startPanelAutoSaves,
} from "./panelManager";
import { getPanelInstance, getPanelProject } from "../stores/panelRegistry";

// ── Auto-save: now managed by panelManager ───────────────────

export const autoSave = {
  async flush() {
    await flushAllAutoSaves();
  },
};

// ── Project list ─────────────────────────────────────────────

export async function refreshProjects(): Promise<void> {
  const list = await listProjects();
  projects.set(list);
}

// ── Resolve which project should be active ───────────────────

async function resolveActiveProject(): Promise<void> {
  const profile = get(activeProfile);
  let list = get(projects);

  if (list.length === 0) {
    await createProjectFile("Principal", {
      tree: defaultTree(),
      completions: {},
    });
    await refreshProjects();
    list = get(projects);
  }

  const remembered = profile ? await getLastProject(profile) : null;
  const target = remembered && list.includes(remembered) ? remembered : list[0];

  activeProject.set(target);

  if (profile && target) {
    await setLastProject(profile, target);
  }
}

// ── Load all panel projects on init ──────────────────────────

export async function loadCurrentProject(): Promise<void> {
  setLoading(true);

  await resolveActiveProject();

  const profile = get(activeProfile);
  if (profile) {
    await loadTags(profile);
    await panelLayout.loadFromProfile(profile);
  }

  const layout = get(panelLayout);

  // Load left panel project
  const leftProject = layout.leftProject;
  if (leftProject) {
    await loadProjectIntoPanel("left", leftProject);
  } else {
    // Fallback: load the resolved active project into left panel
    const name = get(activeProject);
    if (name) {
      await loadProjectIntoPanel("left", name);
      panelLayout.update((p) => ({ ...p, leftProject: name }));
    } else {
      resetTree("left");
    }
  }

  // Load right panel project (if split is open and has a project)
  if (layout.rightView !== null && layout.rightProject) {
    await loadProjectIntoPanel("right", layout.rightProject);
  }

  // Start auto-save subscriptions for all active panels
  startPanelAutoSaves();

  setLoading(false);
}

// ── Panel-scoped project switching ───────────────────────────

export async function switchProjectForPanel(
  panelId: PanelId,
  name: string,
): Promise<void> {
  await loadSwitchPanelProject(panelId, name);

  const profile = get(activeProfile);
  if (profile && panelId === "left") {
    await setLastProject(profile, name);
  }

  activeProject.set(name);
}

// ── Backward-compatible: switch focused panel's project ──────

export async function switchProject(name: string): Promise<void> {
  const focused = getFocusedPanel();
  await switchProjectForPanel(focused, name);
}

// ── Create project: auto-assigns to focused panel ────────────

export async function createProject(name: string): Promise<void> {
  const data = {
    tree: {
      id: "root",
      title: name,
      expanded: true,
      status: "todo" as const,
      priority: "medium" as const,
      startDate: new Date().toISOString().slice(0, 10),
      children: [],
    },
    completions: {},
  };

  await createProjectFile(name, data);
  await refreshProjects();

  // Auto-assign to focused panel
  const focused = getFocusedPanel();
  await switchProjectForPanel(focused, name);
}

// ── Rename: update all panels referencing this project ────────

export async function renameProject(newName: string): Promise<void> {
  const layout = get(panelLayout);
  const oldName = layout.leftProject ?? get(activeProject);

  await renameProjectFile(oldName, newName);
  await refreshProjects();

  // Update panel bindings
  if (layout.leftProject === oldName) {
    panelLayout.update((p) => ({ ...p, leftProject: newName }));
    // Reload the panel with new name
    await loadProjectIntoPanel("left", newName);
  }
  if (layout.rightProject === oldName) {
    panelLayout.update((p) => ({ ...p, rightProject: newName }));
    await loadProjectIntoPanel("right", newName);
  }

  activeProject.set(newName);
  const profile = get(activeProfile);
  if (profile) {
    await setLastProject(profile, newName);
  }
}

// ── Delete: empties the panel that showed the project ────────

export async function deleteProject(): Promise<void> {
  const layout = get(panelLayout);
  const current = layout.leftProject ?? get(activeProject);
  const all = await listProjects();

  if (all.length <= 1) {
    openModal(ConfirmModal, {
      title: "No se puede eliminar",
      message: "Debe existir al menos un proyecto.",
      confirmLabel: "Cerrar",
      showCancel: false,
      danger: false,
      onConfirm: () => {},
    });
    return;
  }

  await deleteProjectFile(current);
  await refreshProjects();

  // Empty the panel(s) that showed this project
  if (layout.leftProject === current) {
    unloadPanel("left");
  }
  if (layout.rightProject === current) {
    unloadPanel("right");
  }

  // Switch to next available project in left panel
  const list = get(projects);
  if (list.length > 0) {
    await switchProjectForPanel("left", list[0]);
  }
}

// ── Backward compat: loadCurrentProject loads left panel ─────
// (already handled above in loadCurrentProject)
