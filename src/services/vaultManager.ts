import { invoke } from "@tauri-apps/api/core";

export async function generateSalt(): Promise<string> {
  return invoke("generate_salt");
}

export async function unlockVault(password: string, salt: string): Promise<void> {
  await invoke("unlock", { password, salt });
}

/** Como unlockVault, pero sin validar el largo de la contraseña.
 * Solo para borrar perfiles creados antes de la validación de 4 caracteres. */
export async function unlockVaultNoLengthCheck(password: string, salt: string): Promise<void> {
  await invoke("unlock_no_length_check", { password, salt });
}

export async function lockVault(): Promise<void> {
  await invoke("lock");
}

export async function isVaultUnlocked(): Promise<boolean> {
  return invoke("is_unlocked");
}

export async function encryptText(plaintext: string): Promise<string> {
  return invoke("encrypt", { plaintext });
}

export async function decryptText(payload: string): Promise<string> {
  return invoke("decrypt", { payload });
}

export async function setupRecovery(): Promise<{
  recoveryKey: string;
  wrappedRecovery: string;
}> {
  const result = await invoke<{ recovery_key: string; wrapped_recovery: string }>(
    "setup_recovery",
  );
  return {
    recoveryKey: result.recovery_key,
    wrappedRecovery: result.wrapped_recovery,
  };
}

export async function unlockWithRecoveryKey(
  recoveryKey: string,
  wrappedRecovery: string,
): Promise<void> {
  await invoke("unlock_with_recovery", { recoveryKey, wrappedRecovery });
}

export async function resetMasterKey(
  newPassword: string,
): Promise<{ salt: string; check: string }> {
  return invoke("reset_master_key", { newPassword });
}

export async function resetMasterKeyAtomic(
  newPassword: string,
  profileName: string,
): Promise<{ salt: string; check: string }> {
  return invoke("reset_master_key_atomic", { newPassword, profileName });
}