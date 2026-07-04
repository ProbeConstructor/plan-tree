import { writable } from "svelte/store";

/** Lista de nombres de proyectos disponibles (se llena vía refreshProjects en workspaceManager). */
export const projects = writable<string[]>([]);

/**
 * Nombre del proyecto actualmente activo. Empieza vacío ("") —
 * workspaceManager.ts es quien decide cuál abrir según el perfil
 * activo (su último proyecto recordado, vía profileManager.ts).
 */
export const activeProject = writable<string>("");

/**
 * Limpia la lista de proyectos y vuelve activeProject a vacío.
 * Llamar al cambiar de perfil/usuario.
 */
export function resetWorkspace(): void {
  projects.set([]);
  activeProject.set("");
}
