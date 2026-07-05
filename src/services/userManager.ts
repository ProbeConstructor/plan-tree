import { get } from "svelte/store";
import { activeProfile } from "../stores/profileStore";
import { tryUnlockVault, tryUnlockVaultNoLengthCheck } from "./vaultMeta";
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

/**
 * Como `verifyProfilePassword` pero usando `tryUnlockVaultNoLengthCheck`
 * para perfiles creados antes de la validación de largo mínimo.
 */
export async function verifyProfilePasswordNoLengthCheck(
  profileName: string,
  password: string,
): Promise<boolean> {
  const previous = get(activeProfile);
  activeProfile.set(profileName);

  try {
    return await tryUnlockVaultNoLengthCheck(password);
  } finally {
    await lockVault();
    activeProfile.set(previous);
  }
}

/** Borra un perfil completo, pero solo si la contraseña es correcta.
 *
 * Primero intenta con validación normal (largo mínimo). Si el error
 * es por largo de contraseña, reintenta sin esa validación para
 * perfiles creados antes de que existiera el mínimo de 4 caracteres. */
export async function deleteProfileWithAuth(
  profileName: string,
  password: string,
): Promise<boolean> {
  // intento normal — puede fallar si la contraseña es < 4 caracteres
  try {
    const ok = await verifyProfilePassword(profileName, password);
    if (!ok) return false;
    await deleteProfile(profileName);
    return true;
  } catch {
    // fallback: perfiles con contraseña corta (creados antes de la validación)
    const ok = await verifyProfilePasswordNoLengthCheck(profileName, password);
    if (!ok) return false;
    await deleteProfile(profileName);
    return true;
  }
}
