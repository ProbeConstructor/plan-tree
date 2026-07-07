import type { TreeNode, ProjectData } from "../types";
import { encryptText, decryptText } from "./vaultManager";

/**
 * Recursively ensure every node has a `children` array.
 * Fixes corrupted projects where a node is missing the property.
 */
export function migrateTree(node: TreeNode): void {
  if (!Array.isArray(node.children)) node.children = [];
  for (const child of node.children) migrateTree(child);
}

export async function encryptProject(data: ProjectData): Promise<string> {
  return encryptText(JSON.stringify(data));
}

export async function decryptProject(payload: string): Promise<ProjectData | null> {
  try {
    const text = await decryptText(payload);
    const parsed = JSON.parse(text);

    let data: ProjectData;

    // Detect bare TreeNode (no .tree key) → wrap as ProjectData
    if (parsed && typeof parsed === "object" && !("tree" in parsed)) {
      data = { tree: parsed as TreeNode, completions: {} };
    } else {
      data = parsed as ProjectData;
    }

    // Ensure no node is missing `children` — prevents render-time crashes
    migrateTree(data.tree);

    return data;
  } catch {
    return null;
  }
}
