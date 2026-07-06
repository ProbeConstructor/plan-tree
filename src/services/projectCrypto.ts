import type { TreeNode, ProjectData } from "../types";
import { encryptText, decryptText } from "./vaultManager";

export async function encryptProject(data: ProjectData): Promise<string> {
  return encryptText(JSON.stringify(data));
}

export async function decryptProject(payload: string): Promise<ProjectData | null> {
  try {
    const text = await decryptText(payload);
    const parsed = JSON.parse(text);

    // Detect bare TreeNode (no .tree key) → wrap as ProjectData
    if (parsed && typeof parsed === "object" && !("tree" in parsed)) {
      return { tree: parsed as TreeNode, completions: {} };
    }

    return parsed as ProjectData;
  } catch {
    return null;
  }
}
