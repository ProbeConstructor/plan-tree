import { get } from "svelte/store";
import { tree, snapshot, mutateTree } from "../stores/treeStore";
import { extractNode } from "../utils/treeUtils";
import { createProject as createProjectFile } from "./projectManager";
import { refreshProjects, switchProject } from "./workspaceManager";

/**
 * Saca un nodo (y todo lo que cuelga de él) del proyecto activo, y lo
 * convierte en la raíz de un proyecto NUEVO con el mismo título que
 * tenía el nodo. Cambia automáticamente al proyecto nuevo al terminar.
 */
export async function extractNodeToNewProject(nodeId: string): Promise<void> {
  const currentTree = get(tree);
  const { extracted, remainingTree } = extractNode(currentTree, nodeId);

  if (!extracted) return;

  const newProjectName = extracted.title;

  snapshot(); // para poder deshacer la extracción en el proyecto ORIGINAL

  mutateTree(() => remainingTree); // saca el nodo del proyecto actual (autoguarda solo)

  await createProjectFile(newProjectName, extracted); // crea el proyecto nuevo, ya cifrado
  await refreshProjects();
  await switchProject(newProjectName); // te lleva a verlo
}
