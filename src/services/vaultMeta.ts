import {
  generateSalt,
  unlockVault,
  unlockVaultNoLengthCheck,
  encryptText,
  decryptText,
} from "./vaultManager";
import { activeProfileDir } from "./profileManager";
import { sha256Hex, sortedJson } from "../lib/checksum";

const VAULT_META_FILENAME = "vault.meta";
const CHECK_VALUE = "plan-tree-ok";

export interface VaultMeta {
  salt: string;
  check: string;
  wrappedRecovery?: string;
  checksum?: string;
}

// Internal type without checksum for serialization.
type VaultMetaContent = Omit<VaultMeta, "checksum">;

async function fsModule() {
  return import("@tauri-apps/plugin-fs");
}

/** Ruta del vault.meta DENTRO del perfil activo. */
function vaultMetaPath(): string {
  return `${activeProfileDir()}/${VAULT_META_FILENAME}`;
}

/** Compute checksum over meta content (excluding the checksum field itself). */
async function computeMetaChecksum(content: VaultMetaContent): Promise<string> {
  return sha256Hex(sortedJson(content as unknown as Record<string, unknown>));
}

/** Verify the checksum of a loaded VaultMeta. Throws if corrupted. */
async function verifyMetaChecksum(meta: VaultMeta): Promise<void> {
  if (!meta.checksum) {
    // legacy meta without checksum — skip verification, will be added on save
    return;
  }
  const { checksum, ...content } = meta;
  const expected = await computeMetaChecksum(content as VaultMetaContent);
  if (checksum !== expected) {
    throw new Error(
      "vault.meta corrupto: el checksum no coincide. " +
        "El archivo pudo haber sido modificado o dañado.",
    );
  }
}

export async function readVaultMeta(): Promise<VaultMeta> {
  const { readTextFile, BaseDirectory } = await fsModule();
  const text = await readTextFile(vaultMetaPath(), {
    baseDir: BaseDirectory.AppData,
  });
  const meta: VaultMeta = JSON.parse(text);
  await verifyMetaChecksum(meta);
  return meta;
}

/** Write meta, auto-computing checksum. Drops any stale checksum first. */
export async function writeVaultMeta(meta: VaultMeta): Promise<void> {
  const { writeTextFile, BaseDirectory } = await fsModule();
  const { checksum: _stale, ...content } = meta;
  const checksum = await computeMetaChecksum(content as VaultMetaContent);
  const enriched: VaultMeta = { ...content, checksum };
  await writeTextFile(vaultMetaPath(), JSON.stringify(enriched), {
    baseDir: BaseDirectory.AppData,
  });
}

export async function vaultExists(): Promise<boolean> {
  const { exists, BaseDirectory } = await fsModule();
  return exists(vaultMetaPath(), { baseDir: BaseDirectory.AppData });
}

/** Primera vez que se abre la app: esta contraseña SE CONVIERTE en la maestra. */
export async function createVault(password: string): Promise<void> {
  const { writeTextFile, BaseDirectory } = await fsModule();

  const salt = await generateSalt();
  await unlockVault(password, salt);

  const check = await encryptText(CHECK_VALUE);
  const content: VaultMetaContent = { salt, check };
  const checksum = await computeMetaChecksum(content);
  const meta: VaultMeta = { ...content, checksum };

  await writeTextFile(vaultMetaPath(), JSON.stringify(meta), {
    baseDir: BaseDirectory.AppData,
  });
}

/** Intenta desbloquear con una contraseña existente. true = correcta. */
export async function tryUnlockVault(password: string): Promise<boolean> {
  const { readTextFile, BaseDirectory } = await fsModule();

  const text = await readTextFile(vaultMetaPath(), {
    baseDir: BaseDirectory.AppData,
  });
  const meta: VaultMeta = JSON.parse(text);

  // verify integrity BEFORE using the data
  await verifyMetaChecksum(meta);

  await unlockVault(password, meta.salt);

  try {
    const decrypted = await decryptText(meta.check);
    return decrypted === CHECK_VALUE;
  } catch {
    // contraseña incorrecta: AES-GCM no pudo verificar el tag
    return false;
  }
}

/** Como `tryUnlockVault`, pero saltea la validación de largo mínimo.
 * Solo para borrar perfiles creados antes de que existiera esa validación. */
export async function tryUnlockVaultNoLengthCheck(password: string): Promise<boolean> {
  const { readTextFile, BaseDirectory } = await fsModule();

  const text = await readTextFile(vaultMetaPath(), {
    baseDir: BaseDirectory.AppData,
  });
  const meta: VaultMeta = JSON.parse(text);

  // verify integrity BEFORE using the data
  await verifyMetaChecksum(meta);

  await unlockVaultNoLengthCheck(password, meta.salt);

  try {
    const decrypted = await decryptText(meta.check);
    return decrypted === CHECK_VALUE;
  } catch {
    // contraseña incorrecta: AES-GCM no pudo verificar el tag
    return false;
  }
}
