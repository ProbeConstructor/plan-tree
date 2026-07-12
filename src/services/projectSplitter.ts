import { get } from "svelte/store";
import type { PanelId } from "../types";
import { getPanelInstance } from "../stores/panelRegistry";
import { snapshot, mutateTree } from "../stores/treeStore";
import { extractNode } from "../utils/treeUtils";
import { createProject as createProjectFile } from "./projectManager";
import { refreshProjects, switchProject } from "./workspaceManager";

/**
 * Saca un nodo (y todo lo que cuelga de él) del proyecto activo, y lo
 * convierte en la raíz de un proyecto NUEVO con el mismo título que
 * tenía el nodo. Cambia automáticamente al proyecto nuevo al terminar.
 */
export async function extractNodeToNewProject(nodeId: string, panelId: PanelId = "left"): Promise<void> {
  const instance = getPanelInstance(panelId);
  const currentTree = get(instance.tree);
  const { extracted, remainingTree } = extractNode(currentTree, nodeId);

  if (!extracted) return;

  const newProjectName = extracted.title;

  snapshot(panelId); // para poder deshacer la extracción en el proyecto ORIGINAL

  mutateTree(() => remainingTree, panelId); // saca el nodo del proyecto actual (autoguarda solo)

  await createProjectFile(newProjectName, { tree: extracted, completions: {} }); // crea el proyecto nuevo, ya cifrado
  await refreshProjects();
  await switchProject(newProjectName); // te lleva a verlo
}
