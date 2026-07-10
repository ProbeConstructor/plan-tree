import { activeProfileDir } from "../utils/pathUtils";
import {
  readTextFile, writeTextFile, mkdir, readDir, remove, rename, exists,
} from "./fsAdapter";

const PROJECT_EXTENSION = ".plan";
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
        !e.name?.endsWith(PROGRESS_EXTENSION),
    )
    .map((e: { name?: string }) => e.name!.replace(PROJECT_EXTENSION, ""))
    .sort();
}

export async function removeFile(name: string): Promise<void> {
  await remove(projectPath(name));
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
