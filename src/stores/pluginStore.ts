// SPDX-License-Identifier: GPL-3.0-only

import { writable, get } from "svelte/store";
import type { PluginMeta } from "../types";

// ── Store ────────────────────────────────────────────────────

const plugins = writable<PluginMeta[]>([]);

// ── Helpers ──────────────────────────────────────────────────

export function addPlugin(meta: PluginMeta): void {
  plugins.update((list) => {
    // Deduplicate by id — last registration wins
    const filtered = list.filter((p) => p.id !== meta.id);
    return [...filtered, meta];
  });
}

export function removePlugin(id: string): void {
  plugins.update((list) => list.filter((p) => p.id !== id));
}

export function updatePlugin(id: string, patch: Partial<PluginMeta>): void {
  plugins.update((list) =>
    list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  );
}

export function getPlugin(id: string): PluginMeta | undefined {
  return get(plugins).find((p) => p.id === id);
}

export function setAllPlugins(list: PluginMeta[]): void {
  plugins.set(list);
}

export { plugins as pluginStore };
