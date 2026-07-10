import { get } from "svelte/store";
import { profiles, activeProfile } from "../stores/profileStore";
import { validateSafeName } from "../utils/validation";
import type { TagDefinition } from "../types";
import { profileData } from "./profileDataStore";
import { mkdir } from "./fsAdapter";

// Re-export path utils so existing imports from profileManager still work
export { profileDir, activeProfileDir } from "../utils/pathUtils";

const MAX_PROFILES = 10;

export async function refreshProfiles(): Promise<void> {
  const list = await profileData.listProfiles();
  profiles.set(list);
}

export async function restoreLastProfile(): Promise<void> {
  const list = await profileData.listProfiles();
  const last = await profileData.getLastProfile();
  if (last && list.includes(last)) {
    activeProfile.set(last);
  }
}

export async function createProfile(name: string): Promise<void> {
  validateSafeName(name, "Perfil");

  const list = await profileData.listProfiles();

  if (list.includes(name)) {
    throw new Error(`Ya existe un perfil llamado "${name}".`);
  }

  if (list.length >= MAX_PROFILES) {
    throw new Error(
      `Ya hay ${MAX_PROFILES} perfiles. Borra alguno antes de crear otro.`,
    );
  }

  await mkdir(`profiles/${name}/projects`, { recursive: true });
  await profileData.createProfile(name);
  await refreshProfiles();
}

export async function selectProfile(name: string): Promise<void> {
  await profileData.setLastProfile(name);
  activeProfile.set(name);
}

/** "Cambiar de usuario": vuelve al ProfileSelector sin cerrar la app. */
export function clearActiveProfile(): void {
  activeProfile.set(null);
}

/** Borra un perfil completo: su carpeta en disco + sus entradas en profiles.json. */
export async function deleteProfile(name: string): Promise<void> {
  await profileData.deleteProfile(name);
  await refreshProfiles();
}

/** Cuál fue el último proyecto abierto por ESTE perfil (null si nunca abrió ninguno). */
export async function getLastProject(
  profileName: string,
): Promise<string | null> {
  return profileData.getLastProject(profileName);
}

/** Recuerda cuál fue el último proyecto abierto por ESTE perfil. */
export async function setLastProject(
  profileName: string,
  projectName: string,
): Promise<void> {
  await profileData.setLastProject(profileName, projectName);
}

/** Colores asignados a cada proyecto para ESTE perfil. */
export async function getProjectColors(
  profile: string,
): Promise<Record<string, string>> {
  return profileData.getProjectColors(profile);
}

/** Guarda el color de un proyecto para ESTE perfil. */
export async function saveProjectColor(
  profile: string,
  project: string,
  color: string,
): Promise<void> {
  await profileData.saveProjectColor(profile, project, color);
}

/** Proyectos seleccionados en el gráfico multi-proyecto para ESTE perfil. */
export async function getGraphSelection(
  profile: string,
): Promise<string[] | null> {
  return profileData.getGraphSelection(profile);
}

/** Persiste los proyectos seleccionados en el gráfico multi-proyecto. */
export async function saveGraphSelection(
  profile: string,
  selected: string[],
): Promise<void> {
  await profileData.saveGraphSelection(profile, selected);
}

/** Obtiene las definiciones de tags para ESTE perfil. */
export async function getTagDefs(profile: string): Promise<TagDefinition[]> {
  return profileData.getTagDefs(profile);
}

/** Guarda las definiciones de tags para ESTE perfil. */
export async function saveTagDefs(
  profile: string,
  defs: TagDefinition[],
): Promise<void> {
  await profileData.saveTagDefs(profile, defs);
}

/** Layout de paneles guardado para ESTE perfil. */
export async function getPanelLayout(
  profile: string,
): Promise<{ rightView: string | null; splitPosition: number } | null> {
  return profileData.getPanelLayout(profile);
}

/** Persiste el layout de paneles para ESTE perfil. */
export async function savePanelLayout(
  profile: string,
  rightView: string | null,
  splitPosition: number,
): Promise<void> {
  await profileData.savePanelLayout(profile, rightView, splitPosition);
}
