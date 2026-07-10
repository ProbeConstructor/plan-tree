/**
 * Filesystem adapter — único punto de acceso a @tauri-apps/plugin-fs.
 *
 * Todas las operaciones usan BaseDirectory.AppData por defecto.
 * Los services importan de acá, no de plugin-fs directamente.
 * Para mockear en tests: vi.mock("../services/fsAdapter", () => ({ ... }))
 */
export interface FsOptions {
  baseDir?: import("@tauri-apps/api/path").BaseDirectory;
  recursive?: boolean;
}

interface RenameOptions {
  oldPathBaseDir?: import("@tauri-apps/api/path").BaseDirectory;
  newPathBaseDir?: import("@tauri-apps/api/path").BaseDirectory;
}

async function load() {
  return import("@tauri-apps/plugin-fs");
}

export async function readTextFile(
  path: string,
  options: FsOptions = {},
): Promise<string> {
  const { readTextFile: fn, BaseDirectory } = await load();
  return fn(path, { baseDir: options.baseDir ?? BaseDirectory.AppData, ...options });
}

export async function writeTextFile(
  path: string,
  data: string,
  options: FsOptions = {},
): Promise<void> {
  const { writeTextFile: fn, BaseDirectory } = await load();
  return fn(path, data, { baseDir: options.baseDir ?? BaseDirectory.AppData, ...options });
}

export async function mkdir(
  path: string,
  options: FsOptions = {},
): Promise<void> {
  const { mkdir: fn, BaseDirectory } = await load();
  return fn(path, {
    baseDir: options.baseDir ?? BaseDirectory.AppData,
    recursive: options.recursive,
  });
}

export async function remove(
  path: string,
  options: FsOptions = {},
): Promise<void> {
  const { remove: fn, BaseDirectory } = await load();
  return fn(path, { baseDir: options.baseDir ?? BaseDirectory.AppData, ...options });
}

export async function rename(
  oldPath: string,
  newPath: string,
  options: RenameOptions = {},
): Promise<void> {
  const { rename: fn, BaseDirectory } = await load();
  return fn(oldPath, newPath, {
    oldPathBaseDir: options.oldPathBaseDir ?? BaseDirectory.AppData,
    newPathBaseDir: options.newPathBaseDir ?? BaseDirectory.AppData,
  });
}

export async function exists(
  path: string,
  options: FsOptions = {},
): Promise<boolean> {
  const { exists: fn, BaseDirectory } = await load();
  return fn(path, { baseDir: options.baseDir ?? BaseDirectory.AppData, ...options });
}

export async function readDir(
  path: string,
  options: FsOptions = {},
): Promise<import("@tauri-apps/plugin-fs").DirEntry[]> {
  const { readDir: fn, BaseDirectory } = await load();
  return fn(path, { baseDir: options.baseDir ?? BaseDirectory.AppData, ...options });
}
