import type { TreeNode, ProjectData } from "../types";
import * as IO from "./projectIO";
import { encryptProject, decryptProject } from "./projectCrypto";
import { exportTree as exportDialog, importTree as importDialog } from "./dialogAdapter";
import { validateSafeName } from "../utils/validation";
import { progressSnapshot } from "./progressSnapshotService";

let migrated = false;

async function ensureMigrated(): Promise<void> {
  if (migrated) return;

  const has = await IO.legacyExists();
  if (!has) {
    migrated = true;
    return;
  }

  const raw = await IO.readLegacy();
  if (raw) {
    try {
      const tree = JSON.parse(raw) as TreeNode;
      const encrypted = await encryptProject({ tree, completions: {} });
      await IO.writeFile("Principal", encrypted);
    } catch {
      // datos legacy corruptos — seguir sin migrar
    }
  }

  await IO.deleteLegacy();
  migrated = true;
}

export async function loadFromDisk(): Promise<TreeNode | null> {
  try {
    const raw = await IO.readLegacy();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveToDisk(data: TreeNode): Promise<void> {
  try {
    const { writeTextFile, mkdir, BaseDirectory } =
      await import("@tauri-apps/plugin-fs");
    try {
      await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
    } catch {}
    await writeTextFile("plan-tree.json", JSON.stringify(data), {
      baseDir: BaseDirectory.AppData,
    });
  } catch (err) {
    console.error("No se pudo guardar plan-tree.json en disco:", err);
  }
}

export async function createProject(
  name: string,
  data: ProjectData,
): Promise<void> {
  validateSafeName(name, "Proyecto");
  await ensureMigrated();
  const encrypted = await encryptProject(data);
  await IO.writeFile(name, encrypted);
}

export async function saveProject(
  name: string,
  data: ProjectData,
): Promise<void> {
  const encrypted = await encryptProject(data);
  await IO.writeFile(name, encrypted);
}

export async function loadProject(
  name: string,
): Promise<ProjectData | null> {
  await ensureMigrated();
  const encrypted = await IO.readFile(name);
  if (!encrypted) return null;
  return decryptProject(encrypted);
}

export async function listProjects(): Promise<string[]> {
  await ensureMigrated();
  return IO.listFiles();
}

export async function deleteProject(name: string): Promise<void> {
  await IO.removeFile(name);
  await progressSnapshot.deleteProject(name);
}

export async function renameProject(
  oldName: string,
  newName: string,
): Promise<void> {
  validateSafeName(newName, "Proyecto");
  await IO.renameFile(oldName, newName);
  await progressSnapshot.renameProject(oldName, newName);
}

export { exportDialog as exportTree, importDialog as importTree };
