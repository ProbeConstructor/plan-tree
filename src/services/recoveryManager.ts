import { readVaultMeta, writeVaultMeta } from "./vaultMeta";
import {
  setupRecovery,
  unlockWithRecoveryKey,
  resetMasterKeyAtomic,
} from "./vaultManager";
import { activeProfile } from "../stores/profileStore";
import { get } from "svelte/store";

/** ¿Esta bóveda ya tiene una clave de recuperación configurada? */
export async function hasRecoverySetup(): Promise<boolean> {
  const meta = await readVaultMeta();
  return !!meta.wrappedRecovery;
}

/**
 * Genera una clave de recuperación nueva. Requiere estar ya
 * desbloqueado (logueado). Devuelve la clave en texto plano para
 * mostrársela al usuario UNA vez — no se guarda en ningún lado así,
 * solo queda envuelta (cifrada) dentro de vault.meta.
 */
export async function generateRecoveryKey(): Promise<string> {
  const { recoveryKey, wrappedRecovery } = await setupRecovery();

  const meta = await readVaultMeta();
  await writeVaultMeta({ ...meta, wrappedRecovery });

  return recoveryKey;
}

/**
 * Flujo de "olvidé mi contraseña": usa la clave de recuperación para
 * desbloquear, re-cifra TODOS los proyectos con la contraseña nueva
 * en una sola operación atómica de Rust, y entrega una clave de
 * recuperación NUEVA (la anterior queda invalidada).
 *
 * A diferencia de la versión anterior, NO hay ventana de data loss:
 * el swap de clave activa ocurre DESPUÉS de que todos los archivos
 * fueron re-cifrados en disco. Si el proceso crashea durante el
 * re-cifrado, la clave vieja sigue activa.
 */
export async function resetPasswordWithRecovery(
  recoveryKey: string,
  newPassword: string,
): Promise<string> {
  const meta = await readVaultMeta();

  if (!meta.wrappedRecovery) {
    throw new Error("Esta bóveda no tiene una clave de recuperación configurada.");
  }

  // 1) desbloquea con recovery key → clave VIEJA activa en Rust
  await unlockWithRecoveryKey(recoveryKey, meta.wrappedRecovery);

  // 2) comando atómico: Rust re-cifra todos los .plan + cambia clave
  const profileName = get(activeProfile);
  if (!profileName) {
    throw new Error("No hay perfil activo.");
  }
  const { salt, check } = await resetMasterKeyAtomic(newPassword, profileName);

  // 3) generar nueva recovery key (envuelve la clave NUEVA)
  const { recoveryKey: newRecoveryKey, wrappedRecovery } = await setupRecovery();
  await writeVaultMeta({ salt, check, wrappedRecovery });

  return newRecoveryKey;
}