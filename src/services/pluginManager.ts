// SPDX-License-Identifier: GPL-3.0-only

import type { PluginManifest, PluginMeta, PluginModule, PluginPermission } from "../types";
import { VALID_PERMISSIONS } from "../types";
import { permissionVerifier } from "./permissionVerifier";
import { pluginEventBus, PluginSubscriptionTracker } from "./pluginEventBus";
import { addPlugin, removePlugin, updatePlugin, setAllPlugins } from "../stores/pluginStore";
import { registerView, removeView } from "../stores/viewRegistry";
import { registerCommand, clearFuseCache } from "./commandRegistry";
import { createPluginAPI, type PluginAPIInstance } from "./pluginApi";
import { readTextFile, readDir } from "./fsAdapter";
import { join } from "@tauri-apps/api/path";

// ── Types ────────────────────────────────────────────────────

interface LoadedPlugin {
  manifest: PluginManifest;
  module: PluginModule;
  meta: PluginMeta;
  subscriptions: PluginSubscriptionTracker;
  cssStyleIds: string[];
  intervals: ReturnType<typeof setInterval>[];
  timeouts: ReturnType<typeof setTimeout>[];
}

// ── Constants ────────────────────────────────────────────────

const PLUGINS_DIR = "plugins";

// ── PluginManager ────────────────────────────────────────────

class PluginManager {
  private loaded = new Map<string, LoadedPlugin>();
  private initDone = false;

  /**
   * Initialize the plugin system: discover, validate, and load all enabled plugins.
   * Call once after profile bootstrap.
   */
  async init(): Promise<void> {
    if (this.initDone) return;
    this.initDone = true;

    try {
      const manifests = await this.discoverPlugins();
      const pluginMetas: PluginMeta[] = [];

      for (const manifest of manifests) {
        const meta: PluginMeta = {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          enabled: true,
          status: "loaded",
          permissions: manifest.permissions,
        };
        pluginMetas.push(meta);
        addPlugin(meta);
      }

      // Load all discovered plugins in parallel
      await Promise.allSettled(
        manifests.map((m) => this.loadPlugin(m)),
      );

      // Update store with final statuses
      for (const [, plugin] of this.loaded) {
        updatePlugin(plugin.manifest.id, plugin.meta);
      }
    } catch (err) {
      console.error("[PluginManager] Init failed:", err);
    }
  }

  /**
   * Scan ~/.config/plan-tree/plugins/ for valid plugin directories.
   */
  async discoverPlugins(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    let entries: Array<{ name: string; isDirectory: boolean }>;
    try {
      entries = await readDir(PLUGINS_DIR);
    } catch {
      // Directory doesn't exist yet — no plugins
      return [];
    }

    for (const entry of entries) {
      if (!entry.isDirectory) continue;

      try {
        const manifestPath = await join(PLUGINS_DIR, entry.name, "manifest.json");
        const text = await readTextFile(manifestPath);
        const parsed = JSON.parse(text) as Partial<PluginManifest>;

        // Validate required fields
        if (!parsed.id || !parsed.name || !parsed.version || !parsed.entry || !Array.isArray(parsed.permissions)) {
          console.warn(`[PluginManager] Skipping "${entry.name}": missing required manifest fields`);
          continue;
        }

        // Validate permissions
        const invalidPerms = parsed.permissions.filter((p) => !VALID_PERMISSIONS.has(p));
        if (invalidPerms.length > 0) {
          console.warn(`[PluginManager] Skipping "${entry.name}": unrecognized permissions: ${invalidPerms.join(", ")}`);
          continue;
        }

        manifests.push(parsed as PluginManifest);
      } catch {
        // Malformed JSON or missing manifest — skip silently per spec
      }
    }

    return manifests;
  }

  /**
   * Load and activate a single plugin by manifest.
   */
  async loadPlugin(manifest: PluginManifest): Promise<void> {
    const { id, entry } = manifest;

    try {
      // Resolve entry path relative to plugin directory
      const entryPath = await join(PLUGINS_DIR, id, entry);
      const module = (await import(/* @vite-ignore */ entryPath)) as PluginModule;

      if (!module.activate || typeof module.activate !== "function") {
        throw new Error(`Plugin "${id}" does not export an activate() function`);
      }

      // Set up permission tracking
      permissionVerifier.setPluginPermissions(id, manifest.permissions);

      // Create subscription tracker and API
      const subscriptions = new PluginSubscriptionTracker(pluginEventBus, id);
      const cssStyleIds: string[] = [];
      const intervals: ReturnType<typeof setInterval>[] = [];
      const timeouts: ReturnType<typeof setTimeout>[] = [];

      const api = createPluginAPI(id, manifest.permissions, subscriptions, cssStyleIds, intervals, timeouts);

      // Activate with crash isolation
      await this.isolatedCall(id, () => module.activate(api));

      const meta: PluginMeta = {
        id,
        name: manifest.name,
        version: manifest.version,
        enabled: true,
        status: "active",
        permissions: manifest.permissions,
      };

      this.loaded.set(id, {
        manifest,
        module,
        meta,
        subscriptions,
        cssStyleIds,
        intervals,
        timeouts,
      });

      updatePlugin(id, meta);
      clearFuseCache();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[PluginManager] Failed to load "${id}": ${errorMessage}`);

      const meta: PluginMeta = {
        id,
        name: manifest.name,
        version: manifest.version,
        enabled: false,
        status: "errored",
        error: errorMessage,
        permissions: manifest.permissions,
      };

      updatePlugin(id, meta);
      permissionVerifier.removePluginPermissions(id);
    }
  }

  /**
   * Disable an active plugin — call deactivate, clean up views/commands/styles.
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.loaded.get(pluginId);
    if (!plugin) return;

    try {
      // Call deactivate if defined
      if (plugin.module.deactivate) {
        await this.isolatedCall(pluginId, () => plugin.module.deactivate!());
      }
    } catch (err) {
      console.warn(`[PluginManager] Error deactivating "${pluginId}":`, err);
    }

    // Clean up views
    for (const viewId of this.getRegisteredViews(pluginId)) {
      removeView(viewId);
    }

    // Clean up subscriptions
    plugin.subscriptions.cleanup();

    // Clean up CSS
    for (const styleId of plugin.cssStyleIds) {
      removePluginStyle(styleId);
    }

    // Clear intervals/timeouts
    for (const id of plugin.intervals) clearInterval(id);
    for (const id of plugin.timeouts) clearTimeout(id);
    plugin.intervals = [];
    plugin.timeouts = [];

    // Clean up permissions
    permissionVerifier.removePluginPermissions(pluginId);

    // Emit unload event
    pluginEventBus.emit("plugin:unloaded", { pluginId });

    // Update state
    plugin.meta.status = "disabled";
    plugin.meta.enabled = false;
    updatePlugin(pluginId, plugin.meta);
    this.loaded.delete(pluginId);
    clearFuseCache();
  }

  /**
   * Enable a disabled plugin — reload and activate.
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.loaded.get(pluginId);
    if (!plugin) return;

    plugin.meta.enabled = true;
    updatePlugin(pluginId, plugin.meta);
    await this.loadPlugin(plugin.manifest);
  }

  /**
   * Reload a plugin (dev mode — deactivate then re-activate).
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loaded.get(pluginId);
    if (!plugin) return;

    await this.disablePlugin(pluginId);
    await this.loadPlugin(plugin.manifest);
  }

  /**
   * Shutdown all plugins (app close).
   */
  async shutdown(): Promise<void> {
    const ids = Array.from(this.loaded.keys());
    for (const id of ids) {
      await this.disablePlugin(id);
    }
    this.loaded.clear();
    this.initDone = false;
  }

  /** Get loaded plugin by ID. */
  getLoaded(pluginId: string): LoadedPlugin | undefined {
    return this.loaded.get(pluginId);
  }

  /** Check if a plugin is currently active. */
  isActive(pluginId: string): boolean {
    return this.loaded.get(pluginId)?.meta.status === "active";
  }

  // ── Internal ─────────────────────────────────────────────

  /**
   * Run a function with crash isolation — catch and log errors.
   */
  private async isolatedCall(pluginId: string, fn: () => void | Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[PluginManager] Plugin "${pluginId}" crashed:`, err);

      // Auto-disable on crash
      const shouldDisable = permissionVerifier.recordViolation(pluginId, `crash: ${errorMessage}`);
      if (shouldDisable || true) {
        // Per spec: crash always auto-disables
        this.disablePlugin(pluginId);
      }
    }
  }

  /**
   * Track which views a plugin registered (for cleanup on unload).
   * Uses a simple Set stored per plugin.
   */
  private pluginViews = new Map<string, Set<string>>();

  registerPluginView(pluginId: string, viewId: string): void {
    let set = this.pluginViews.get(pluginId);
    if (!set) {
      set = new Set();
      this.pluginViews.set(pluginId, set);
    }
    set.add(viewId);
  }

  private getRegisteredViews(pluginId: string): string[] {
    return Array.from(this.pluginViews.get(pluginId) ?? []);
  }

  removePluginView(pluginId: string, viewId: string): void {
    this.pluginViews.get(pluginId)?.delete(viewId);
  }
}

// ── CSS Helpers ──────────────────────────────────────────────

function injectPluginStyle(pluginId: string, css: string): string {
  const styleId = `plugin-style-${pluginId}-${Date.now()}`;
  const style = document.createElement("style");
  style.setAttribute("data-plugin-id", pluginId);
  style.setAttribute("data-style-id", styleId);
  style.textContent = css;
  document.head.appendChild(style);
  return styleId;
}

function removePluginStyle(styleId: string): void {
  const el = document.querySelector(`[data-style-id="${styleId}"]`);
  el?.remove();
}

function removeAllPluginStyles(pluginId: string): void {
  document.querySelectorAll(`[data-plugin-id="${pluginId}"]`).forEach((el) => el.remove());
}

// ── Singleton ────────────────────────────────────────────────

export const pluginManager = new PluginManager();
