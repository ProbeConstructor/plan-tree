// SPDX-License-Identifier: GPL-3.0-only

import TreeCanvas from "../components/tree/TreeCanvas.svelte";
import Calendar from "../pages/Calendar.svelte";
import Progress from "../pages/Progress.svelte";
import Dashboard from "../pages/Dashboard.svelte";

// ── View Registry ────────────────────────────────────────────
// Map<string, Component> — built-in views registered on init,
// plugin views added via PluginAPI.views.register().

type ViewComponent = any; // Svelte Component type

const registry = new Map<string, ViewComponent>();

// Register built-in views
registry.set("tree", TreeCanvas);
registry.set("calendar", Calendar);
registry.set("progress", Progress);
registry.set("dashboard", Dashboard);

// ── Public API ───────────────────────────────────────────────

/** Register a view. Returns false if ID already taken. */
export function registerView(id: string, component: ViewComponent): boolean {
  if (registry.has(id)) {
    console.warn(`[ViewRegistry] View "${id}" already registered — rejected.`);
    return false;
  }
  registry.set(id, component);
  return true;
}

/** Remove a view by ID (used during plugin unload). Returns true if removed. */
export function removeView(id: string): boolean {
  // Never remove built-in views
  if (["tree", "calendar", "progress", "dashboard"].includes(id)) {
    console.warn(`[ViewRegistry] Cannot remove built-in view "${id}".`);
    return false;
  }
  return registry.delete(id);
}

/** Get a view component by ID. */
export function getView(id: string): ViewComponent | undefined {
  return registry.get(id);
}

/** Check if a view ID is registered. */
export function hasView(id: string): boolean {
  return registry.has(id);
}

/** Get all registered view IDs. */
export function getViewIds(): string[] {
  return Array.from(registry.keys());
}
