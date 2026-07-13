// SPDX-License-Identifier: GPL-3.0-only

import Fuse, { type FuseResult } from "fuse.js";
import type { TreeNode } from "../types";

// ── Types ────────────────────────────────────────────────────

export type CommandCategory =
  | "recent"
  | "project"
  | "node"
  | "navigation"
  | "utilities";

export interface Command {
  id: string;
  /** i18n key — resolved at render time via $_() */
  label: string;
  category: CommandCategory;
  icon?: string;
  enabled: () => boolean;
  action: () => void;
}

export interface NodeCommand extends Command {
  category: "node";
  /** Project name for display */
  location: string;
}

// ── Registry ─────────────────────────────────────────────────

const registry: Command[] = [];

/**
 * Register a command. Additive — duplicates by id are allowed but
 * the last registration wins (sidebar can override defaults).
 */
export function registerCommand(cmd: Command): void {
  const idx = registry.findIndex((c) => c.id === cmd.id);
  if (idx >= 0) {
    registry[idx] = cmd;
  } else {
    registry.push(cmd);
  }
}

/** Return all registered commands (including disabled ones). */
export function getCommands(): Command[] {
  return [...registry];
}

// ── Fuzzy Search ─────────────────────────────────────────────

let fuseInstance: Fuse<Command> | null = null;
let fuseIndex = 0;

function ensureFuse(commands: Command[]): Fuse<Command> {
  if (!fuseInstance || fuseIndex !== commands.length) {
    fuseInstance = new Fuse(commands, {
      keys: ["label", "location"],
      threshold: 0.4,
      includeMatches: true,
    });
    fuseIndex = commands.length;
  }
  return fuseInstance;
}

/**
 * Fuzzy search across command labels (and node locations).
 * Returns matching commands sorted by relevance.
 */
export function searchCommands(
  query: string,
  commands: Command[],
): FuseResult<Command>[] {
  const fuse = ensureFuse(commands);
  return fuse.search(query);
}

// ── Recent Commands (localStorage) ───────────────────────────

const STORAGE_KEY = "plan_tree_recent_commands";
const MAX_RECENT = 5;

/** In-memory fallback when localStorage is unavailable. */
let memoryFallback: string[] | null = null;

function readStorage(): string[] {
  if (memoryFallback !== null) {
    return memoryFallback;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    memoryFallback = [];
    return memoryFallback;
  }
}

function writeStorage(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    memoryFallback = ids;
  }
}

/** Record a command id as recently used (LRU, max 5). */
export function recordRecent(commandId: string): void {
  const ids = readStorage().filter((id) => id !== commandId);
  ids.unshift(commandId);
  writeStorage(ids.slice(0, MAX_RECENT));
}

/** Return recent command ids (most recent first, max 5). */
export function getRecentIds(): string[] {
  return readStorage().slice(0, MAX_RECENT);
}

// ── Dynamic Node Commands ────────────────────────────────────

/**
 * Flatten a tree into all nodes.
 */
function flattenTree(node: TreeNode): TreeNode[] {
  return [node, ...node.children.flatMap(flattenTree)];
}

/**
 * Generate ephemeral NodeCommand entries from a tree.
 * Called at palette open time — not permanently registered.
 */
export function nodeCommandsFromTree(
  tree: TreeNode,
  projectName: string,
): NodeCommand[] {
  return flattenTree(tree).map((node) => ({
    id: `node:${node.id}`,
    label: node.title,
    category: "node" as const,
    icon: node.icon ?? "📄",
    location: projectName,
    enabled: () => true,
    action: () => {
      // Action will be wired by the palette component —
      // registry only defines the shape.
    },
  }));
}

/**
 * Clear the fuse cache. Call after getCommands() list changes
 * (e.g. after registering new commands).
 */
export function clearFuseCache(): void {
  fuseInstance = null;
}
