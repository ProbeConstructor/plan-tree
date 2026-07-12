import { get } from "svelte/store";
import { t } from "svelte-i18n";
import { activeProfile } from "../stores/profileStore";

/**
 * Carpeta base de un perfil dentro de AppData/profiles/<name>.
 */
export function profileDir(name: string): string {
  return `profiles/${name}`;
}

/** Igual que profileDir, pero usando el perfil ACTIVO. Lanza si no hay ninguno. */
export function activeProfileDir(): string {
  const name = get(activeProfile);
  if (!name) {
    throw new Error(get(t)("validation.noActiveProfile"));
  }
  return profileDir(name);
}
