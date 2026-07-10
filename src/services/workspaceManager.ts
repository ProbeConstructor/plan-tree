import { get } from "svelte/store";
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
import { AutoSaveStrategy } from "./autoSaveStrategy";
import { progressSnapshot } from "./progressSnapshotService";
import { loadTags, cleanStaleTagRefs } from "../stores/tagStore";
import { panelLayout } from "../stores/panelStore";

import type { TreeNode, ProjectData } from "../types";

let isLoading = false;

export const autoSave = new AutoSaveStrategy(saveProject);
autoSave.onAfterSave = (_project, data) => {
  progressSnapshot.capture(_project, data.tree);
};

export async function refreshProjects(): Promise<void> {
  const list = await listProjects();
  projects.set(list);
}

/**
 * Decide qué proyecto debe quedar activo para el perfil actual: su
 * último proyecto recordado (si todavía existe), o el primero
 * disponible. Si el perfil es nuevo y no tiene NINGÚN proyecto, le
 * crea uno por defecto ("Principal") para que nunca quede sin nada
 * que mostrar.
 */
async function resolveActiveProject(): Promise<void> {
  const profile = get(activeProfile);
  let list = get(projects);

  if (list.length === 0) {
    await createProjectFile("Principal", { tree: defaultTree(), completions: {} });
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

export async function loadCurrentProject(): Promise<void> {
  isLoading = true;

  await resolveActiveProject();

  const name = get(activeProject);
  const project = name ? await loadProject(name) : null;

  // Load tag definitions for current profile
  const profile = get(activeProfile);
  if (profile) {
    await loadTags(profile);

    // Restore panel layout for this profile
    await panelLayout.loadFromProfile(profile);
  }

  if (project) {
    tree.set(project.tree);
    completions.set(project.completions);
    recalcProgress();

    // Clean stale tag refs on load
    const cleaned = cleanStaleTagRefs(project.tree);
    if (cleaned !== project.tree) {
      tree.set(cleaned);
    }

    // 🛡️ Sincronizar contador de nodos para la guarda de datos vacíos
    autoSave.syncNodeCount(name, project.tree);
    // 📸 Forzar snapshot inicial para que el mes actual tenga datos
    progressSnapshot.capture(name, project.tree);
  } else {
    // 🔐 sin esto, si el perfil nuevo no tiene este proyecto, se queda
    // visible lo que estaba cargado del perfil/proyecto ANTERIOR.
    resetTree();
  }

  isLoading = false;
}

export async function switchProject(name: string): Promise<void> {
  activeProject.set(name);

  const profile = get(activeProfile);
  if (profile) {
    await setLastProject(profile, name);
  }

  await loadCurrentProject();
}

export async function createProject(name: string): Promise<void> {
  const data: ProjectData = {
    tree: {
      id: "root",
      title: name,
      expanded: true,
      status: "todo",
      priority: "medium",
      startDate: new Date().toISOString().slice(0, 10),
      children: [],
    },
    completions: {},
  };

  await createProjectFile(name, data);
  await refreshProjects();
  await switchProject(name);
}

export async function renameProject(newName: string): Promise<void> {
  const oldName = get(activeProject);

  await renameProjectFile(oldName, newName);
  await refreshProjects();
  await switchProject(newName);
}

export async function deleteProject(): Promise<void> {
  const current = get(activeProject);
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

  const list = get(projects);
  if (list.length > 0) {
    await switchProject(list[0]);
  }
}

// 💾 autoguardado: cada vez que el árbol cambia, se agenda una
// escritura diferida (debounce 2s) con reintentos. Si el cambio
// viene de una CARGA (isLoading = true), se saltea para no
// sobreescribir el archivo con datos a medio cargar.
tree.subscribe((value) => {
  if (isLoading) return;

  const project = get(activeProject);
  if (!project) return;

  autoSave.schedule(project, { tree: value, completions: get(completions) });
});

// Completions-only changes (e.g. Calendar toggle) also need persistence
completions.subscribe((value) => {
  if (isLoading) return;

  const project = get(activeProject);
  if (!project) return;

  autoSave.schedule(project, { tree: get(tree), completions: value });
});


