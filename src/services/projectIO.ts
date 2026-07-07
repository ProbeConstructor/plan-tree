import { activeProfileDir } from "./profileManager";

const PROJECT_EXTENSION = ".plan";
const PROGRESS_EXTENSION = ".progress.plan";
const LEGACY_FILE = "plan-tree.json";

async function fs() {
  return import("@tauri-apps/plugin-fs");
}

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
  const { writeTextFile, mkdir, BaseDirectory } = await fs();

  await mkdir(projectsDir(), {
    baseDir: BaseDirectory.AppData,
    recursive: true,
  });

  await writeTextFile(projectPath(name), encrypted, {
    baseDir: BaseDirectory.AppData,
  });
}

export async function readFile(name: string): Promise<string | null> {
  try {
    const { readTextFile, BaseDirectory } = await fs();

    return await readTextFile(projectPath(name), {
      baseDir: BaseDirectory.AppData,
    });
  } catch {
    return null;
  }
}

export async function listFiles(): Promise<string[]> {
  const { readDir, BaseDirectory } = await fs();

  const entries = await readDir(projectsDir(), {
    baseDir: BaseDirectory.AppData,
  });

  return entries
    .filter(
      (e) =>
        e.name?.endsWith(PROJECT_EXTENSION) &&
        !e.name?.endsWith(PROGRESS_EXTENSION),
    )
    .map((e) => e.name!.replace(PROJECT_EXTENSION, ""))
    .sort();
}

export async function removeFile(name: string): Promise<void> {
  const { remove, BaseDirectory } = await fs();

  await remove(projectPath(name), {
    baseDir: BaseDirectory.AppData,
  });
}

export async function renameFile(
  oldName: string,
  newName: string,
): Promise<void> {
  const { rename, BaseDirectory } = await fs();

  await rename(projectPath(oldName), projectPath(newName), {
    oldPathBaseDir: BaseDirectory.AppData,
    newPathBaseDir: BaseDirectory.AppData,
  });
}

export async function legacyExists(): Promise<boolean> {
  const { exists, BaseDirectory } = await fs();
  return exists(LEGACY_FILE, { baseDir: BaseDirectory.AppData });
}

export async function readLegacy(): Promise<string | null> {
  try {
    const { readTextFile, exists, BaseDirectory } = await fs();

    const fileExists = await legacyExists();
    if (!fileExists) return null;

    return await readTextFile(LEGACY_FILE, {
      baseDir: BaseDirectory.AppData,
    });
  } catch {
    return null;
  }
}

export async function deleteLegacy(): Promise<void> {
  try {
    const { remove, BaseDirectory } = await fs();

    await remove(LEGACY_FILE, { baseDir: BaseDirectory.AppData });
  } catch {
    // si falla, no es crítico — el archivo legacy se ignora
  }
}
