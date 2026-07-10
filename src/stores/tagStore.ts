import { writable, get } from "svelte/store";
import type { TagDefinition, TreeNode } from "../types";
import { activeProfile } from "./profileStore";
import { getTagDefs, saveTagDefs } from "../services/profileManager";

export const tagDefs = writable<TagDefinition[]>([]);
export const tagFilter = writable<Set<string>>(new Set());

export const TAG_PALETTE = [
  "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7",
  "#f97316", "#06b6d4", "#ec4899", "#78716c", "#6b7280",
];

export function getNextColor(): string {
  const defs = get(tagDefs);
  return TAG_PALETTE[defs.length % TAG_PALETTE.length];
}

export async function loadTags(profile: string): Promise<void> {
  const defs = await getTagDefs(profile);
  tagDefs.set(defs);
  // Reset filter when switching profiles
  tagFilter.set(new Set());
}

export async function addTagDef(name: string, color?: string): Promise<TagDefinition | null> {
  const profile = get(activeProfile);
  if (!profile) return null;

  const defs = get(tagDefs);

  // Case-insensitive unique check (TS-7)
  const existing = defs.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const newDef: TagDefinition = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: color ?? getNextColor(),
  };

  const updated = [...defs, newDef];
  tagDefs.set(updated);
  await saveTagDefs(profile, updated);
  return newDef;
}

export async function updateTagDef(
  id: string,
  patch: { name?: string; color?: string },
): Promise<void> {
  const profile = get(activeProfile);
  if (!profile) return;

  const defs = get(tagDefs);
  const updated = defs.map(d =>
    d.id === id ? { ...d, ...patch } : d,
  );
  tagDefs.set(updated);
  await saveTagDefs(profile, updated);
}

export async function removeTagDef(id: string): Promise<void> {
  const profile = get(activeProfile);
  if (!profile) return;

  const defs = get(tagDefs);
  const updated = defs.filter(d => d.id !== id);
  tagDefs.set(updated);
  await saveTagDefs(profile, updated);
}

/** Remove tag refs from all nodes that reference a non-existent tag definition. */
export function cleanStaleTagRefs(root: TreeNode): TreeNode {
  const defs = get(tagDefs);
  const validIds = new Set(defs.map(d => d.id));

  function walk(node: TreeNode): TreeNode {
    if (node.tags && node.tags.length > 0) {
      const cleaned = node.tags.filter(t => validIds.has(t));
      if (cleaned.length !== node.tags.length) {
        node = { ...node, tags: cleaned.length > 0 ? cleaned : undefined };
      }
    }
    if (node.children.length > 0) {
      node = { ...node, children: node.children.map(walk) };
    }
    return node;
  }

  return walk(root);
}

/** If no node in the tree has this tag AND it's not in the defs list, remove the definition. */
export async function checkAutoCleanup(removedTagId: string, tree: TreeNode): Promise<void> {
  const defs = get(tagDefs);
  const defExists = defs.some(d => d.id === removedTagId);
  if (!defExists) return;

  // Check if any node still uses this tag
  let used = false;
  function walk(node: TreeNode): void {
    if (used) return;
    if (node.tags?.includes(removedTagId)) {
      used = true;
      return;
    }
    node.children.forEach(walk);
  }
  walk(tree);

  if (!used) {
    await removeTagDef(removedTagId);
  }
}

/** Count how many nodes in the tree reference a given tag ID. */
export function countNodesWithTag(root: TreeNode, tagId: string): number {
  let count = 0;
  function walk(node: TreeNode): void {
    if (node.tags?.includes(tagId)) count++;
    node.children.forEach(walk);
  }
  walk(root);
  return count;
}
