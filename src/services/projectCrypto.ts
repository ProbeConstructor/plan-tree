import type { TreeNode } from "../types";
import { encryptText, decryptText } from "./vaultManager";

export async function encryptProject(data: TreeNode): Promise<string> {
  return encryptText(JSON.stringify(data));
}

export async function decryptProject(payload: string): Promise<TreeNode | null> {
  try {
    const text = await decryptText(payload);
    return JSON.parse(text) as TreeNode;
  } catch {
    return null;
  }
}
