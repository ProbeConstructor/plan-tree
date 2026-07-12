import { activeProfileDir } from "../utils/pathUtils";
import {
  readTextFile, writeTextFile, mkdir, readDir, remove, rename, exists,
} from "./fsAdapter";

const PROJECT_EXTENSION = ".plan";
const BACKUP_EXTENSION = ".plan.bak";
const PROGRESS_EXTENSION = ".progress.plan";
const LEGACY_FILE = "plan-tree.json";

function projectsDir(): string {
  return `${activeProfileDir()}/projects`;
}

function projectPath(name: string): string {
  return `${projectsDir()}/${name}${PROJECT_EXTENSION}`;
}

export async function writeFile(
  name: string,
  encrypted: string,
): Promise<void> {
  await mkdir(projectsDir(), { recursive: true });
  await writeTextFile(projectPath(name), encrypted);
}

export async function readFile(name: string): Promise<string | null> {
  try {
    return await readTextFile(projectPath(name));
  } catch {
    return null;
  }
}

export async function listFiles(): Promise<string[]> {
  const entries = await readDir(projectsDir());

  return entries
    .filter(
      (e: { name?: string }) =>
        e.name?.endsWith(PROJECT_EXTENSION) &&
        !e.name?.endsWith(PROGRESS_EXTENSION) &&
        !e.name?.endsWith(BACKUP_EXTENSION),
    )
    .map((e: { name?: string }) => e.name!.replace(PROJECT_EXTENSION, ""))
    .sort();
}

export async function removeFile(name: string): Promise<void> {
  await remove(projectPath(name));
  // Also remove backup if it exists
  try {
    await remove(backupPath(name));
  } catch {}
}

export async function renameFile(
  oldName: string,
  newName: string,
): Promise<void> {
  await rename(projectPath(oldName), projectPath(newName));
}

export async function legacyExists(): Promise<boolean> {
  return exists(LEGACY_FILE);
}

export async function readLegacy(): Promise<string | null> {
  try {
    const fileExists = await legacyExists();
    if (!fileExists) return null;

    return await readTextFile(LEGACY_FILE);
  } catch {
    return null;
  }
}

export async function deleteLegacy(): Promise<void> {
  try {
    await remove(LEGACY_FILE);
  } catch {
    // si falla, no es crítico — el archivo legacy se ignora
  }
}

// ── Backup system ─────────────────────────────────────────────

function backupPath(name: string): string {
  return `${projectsDir()}/${name}${BACKUP_EXTENSION}`;
}

/**
 * Snapshot the current .plan file to .plan.bak before overwriting.
 * Best-effort: if the source doesn't exist or read fails, skip silently.
 * If the backup fails, the write still proceeds (backup is a safety net, not a gate).
 */
export async function backupBeforeWrite(name: string): Promise<void> {
  try {
    const src = projectPath(name);
    const data = await readTextFile(src);
    if (!data) return; // no existing file to backup (first save)
    await writeTextFile(backupPath(name), data);
  } catch {
    // backup failed — don't block the write
  }
}

/**
 * Read the .plan.bak file for a project.
 * Returns null if the backup doesn't exist or can't be read.
 */
export async function readBackup(name: string): Promise<string | null> {
  try {
    return await readTextFile(backupPath(name));
  } catch {
    return null;
  }
}
