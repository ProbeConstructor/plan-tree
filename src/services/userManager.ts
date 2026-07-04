import { get } from "svelte/store";
import { activeProfile } from "../stores/profileStore";
import { tryUnlockVault } from "./vaultMeta";
import { lockVault } from "./vaultManager";
import { deleteProfile } from "./profileManager";

/**
 * Verifica la contraseña de UN perfil específico, sin dejar ninguna
 * sesión abierta al terminar. Sirve para autorizar acciones sobre el
 * propio perfil (como borrarlo) sin necesitar un "admin" central:
 * cada quien solo puede gestionar SU perfil, probando que sabe su
 * propia contraseña — igual que cualquier login normal.
 */
export async function verifyProfilePassword(
  profileName: string,
  password: string,
): Promise<boolean> {
  const previous = get(activeProfile);
  activeProfile.set(profileName);

  try {
    return await tryUnlockVault(password);
  } finally {
    await lockVault();
    activeProfile.set(previous);
  }
}

/** Borra un perfil completo, pero solo si la contraseña es correcta. */
export async function deleteProfileWithAuth(
  profileName: string,
  password: string,
): Promise<boolean> {
  const ok = await verifyProfilePassword(profileName, password);
  if (!ok) return false;

  await deleteProfile(profileName);
  return true;
}
