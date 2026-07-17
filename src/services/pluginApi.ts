// SPDX-License-Identifier: GPL-3.0-only

import type { PluginPermission, TreeNode } from "../types";
import { permissionVerifier, PluginPermissionError } from "./permissionVerifier";
import { pluginEventBus, PluginSubscriptionTracker } from "./pluginEventBus";
import { registerView, removeView } from "../stores/viewRegistry";
import { registerCommand, clearFuseCache } from "./commandRegistry";
import { profileData } from "./profileDataStore";
import { getPanelInstance } from "../stores/panelRegistry";
import { activeProfile } from "../stores/profileStore";
import { pluginManager } from "./pluginManager";
import { get } from "svelte/store";

// ── Types ────────────────────────────────────────────────────

export interface PluginAPIInstance {
  views: { register(id: string, component: unknown): void };
  commands: {
    register(cmd: {
      id: string;
      label: string;
      category?: string;
      icon?: string;
      enabled?: () => boolean;
      action: () => void;
    }): void;
  };
  tree: {
    read(): TreeNode;
    addNode(parentId: string, data: Partial<TreeNode>): string;
    updateNode(nodeId: string, patch: Partial<TreeNode>): void;
    deleteNode(nodeId: string): void;
  };
  events: {
    onNodeChange(cb: (node: TreeNode, type: string) => void): () => void;
    onProjectLoad(cb: (project: string) => void): () => void;
    onPluginUnload(cb: () => void): () => void;
  };
  css: { inject(css: string): void; remove(id: string): void };
  settings: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
  };
}

// ── Helpers ──────────────────────────────────────────────────

function generateNodeId(): string {
  return `plugin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function injectPluginStyle(pluginId: string, css: string): string {
  const styleId = `plugin-style-${pluginId}-${Date.now()}`;
  const style = document.createElement("style");
  style.setAttribute("data-plugin-id", pluginId);
  style.setAttribute("data-style-id", styleId);
  style.textContent = css;
  document.head.appendChild(style);
  return styleId;
}

// ── Factory ──────────────────────────────────────────────────

/**
 * Create a scoped PluginAPI instance for a specific plugin.
 * Every method enforces permissions and wraps calls in crash isolation.
 */
export function createPluginAPI(
  pluginId: string,
  permissions: PluginPermission[],
  subscriptions: PluginSubscriptionTracker,
  cssStyleIds: string[],
  intervals: ReturnType<typeof setInterval>[],
  timeouts: ReturnType<typeof setTimeout>[],
): PluginAPIInstance {
  function hasPermission(perm: PluginPermission): boolean {
    return permissions.includes(perm);
  }

  function assertPermission(perm: PluginPermission): void {
    if (!hasPermission(perm)) {
      const shouldDisable = permissionVerifier.recordViolation(pluginId, perm);
      if (shouldDisable) {
        pluginManager.disablePlugin(pluginId);
      }
      throw new PluginPermissionError(pluginId, perm);
    }
  }

  function isolatedCall<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      console.error(`[PluginAPI] Plugin "${pluginId}" error:`, err);
      throw err;
    }
  }

  return {
    // ── Views ─────────────────────────────────────────────
    views: {
      register(id: string, component: unknown): void {
        assertPermission("view_register");
        isolatedCall(() => {
          const success = registerView(id, component);
          if (success) {
            pluginManager.registerPluginView(pluginId, id);
            clearFuseCache();
          }
        });
      },
    },

    // ── Commands ──────────────────────────────────────────
    commands: {
      register(cmd: {
        id: string;
        label: string;
        category?: string;
        icon?: string;
        enabled?: () => boolean;
        action: () => void;
      }): void {
        assertPermission("command_register");
        isolatedCall(() => {
          registerCommand({
            id: cmd.id,
            label: cmd.label,
            category: (cmd.category ?? "utilities") as any,
            icon: cmd.icon,
            enabled: cmd.enabled ?? (() => true),
            action: () => {
              try {
                cmd.action();
              } catch (err) {
                console.error(`[PluginAPI] Command "${cmd.id}" crashed:`, err);
              }
            },
          });
          clearFuseCache();
        });
      },
    },

    // ── Tree ──────────────────────────────────────────────
    tree: {
      read(): TreeNode {
        assertPermission("tree_read");
        return isolatedCall(() => {
          const inst = getPanelInstance("left");
          return get(inst.tree);
        });
      },

      addNode(parentId: string, data: Partial<TreeNode>): string {
        assertPermission("tree_write");
        return isolatedCall(() => {
          const inst = getPanelInstance("left");
          const newId = generateNodeId();
          const newNode: TreeNode = {
            title: data.title ?? "New Node",
            expanded: data.expanded ?? true,
            status: data.status ?? "todo",
            priority: data.priority ?? "medium",
            startDate: data.startDate ?? new Date().toISOString().slice(0, 10),
            children: data.children ?? [],
            ...data,
            id: newId, // Ensure generated ID wins
          };

          inst.tree.update((root) => {
            function addRecursive(node: TreeNode): TreeNode {
              if (node.id === parentId) {
                return { ...node, children: [...node.children, newNode] };
              }
              return { ...node, children: node.children.map(addRecursive) };
            }
            return addRecursive(root);
          });

          pluginEventBus.emit("node:changed", { node: newNode, type: "added" });
          return newId;
        });
      },

      updateNode(nodeId: string, patch: Partial<TreeNode>): void {
        assertPermission("tree_write");
        isolatedCall(() => {
          const inst = getPanelInstance("left");
          inst.tree.update((root) => {
            function updateRecursive(node: TreeNode): TreeNode {
              if (node.id === nodeId) {
                return { ...node, ...patch, id: node.id }; // Never allow ID override
              }
              return { ...node, children: node.children.map(updateRecursive) };
            }
            return updateRecursive(root);
          });

          pluginEventBus.emit("node:changed", {
            node: { id: nodeId, ...patch } as TreeNode,
            type: "updated",
          });
        });
      },

      deleteNode(nodeId: string): void {
        assertPermission("tree_write");
        isolatedCall(() => {
          const inst = getPanelInstance("left");
          inst.tree.update((root) => {
            function deleteRecursive(node: TreeNode): TreeNode {
              return {
                ...node,
                children: node.children
                  .filter((c) => c.id !== nodeId)
                  .map(deleteRecursive),
              };
            }
            return deleteRecursive(root);
          });

          pluginEventBus.emit("node:changed", {
            node: { id: nodeId } as TreeNode,
            type: "deleted",
          });
        });
      },
    },

    // ── Events ────────────────────────────────────────────
    events: {
      onNodeChange(cb: (node: TreeNode, type: string) => void): () => void {
        return subscriptions.on("node:changed", (payload) => {
          try {
            cb(payload.node, payload.type);
          } catch (err) {
            console.error(`[PluginAPI] onNodeChange callback error in "${pluginId}":`, err);
          }
        });
      },

      onProjectLoad(cb: (project: string) => void): () => void {
        return subscriptions.on("project:loaded", (payload) => {
          try {
            cb(payload.project);
          } catch (err) {
            console.error(`[PluginAPI] onProjectLoad callback error in "${pluginId}":`, err);
          }
        });
      },

      onPluginUnload(cb: () => void): () => void {
        return subscriptions.on("plugin:unloaded", (payload) => {
          if (payload.pluginId === pluginId) {
            try {
              cb();
            } catch (err) {
              console.error(`[PluginAPI] onPluginUnload callback error in "${pluginId}":`, err);
            }
          }
        });
      },
    },

    // ── CSS ───────────────────────────────────────────────
    css: {
      inject(css: string): void {
        assertPermission("css_inject");
        isolatedCall(() => {
          const styleId = injectPluginStyle(pluginId, css);
          cssStyleIds.push(styleId);
        });
      },

      remove(id: string): void {
        isolatedCall(() => {
          const idx = cssStyleIds.indexOf(id);
          if (idx >= 0) {
            cssStyleIds.splice(idx, 1);
            const el = document.querySelector(`[data-style-id="${id}"]`);
            el?.remove();
          }
        });
      },
    },

    // ── Settings ──────────────────────────────────────────
    settings: {
      get(key: string): unknown {
        return isolatedCall(() => {
          const profile = get(activeProfile);
          if (!profile) return undefined;
          // Delegate to profileData — will be async in practice but
          // we read from the in-memory cache which is already loaded
          return profileData.getPluginSettingsCached(profile, pluginId, key);
        });
      },

      set(key: string, value: unknown): void {
        assertPermission("settings_write");
        isolatedCall(() => {
          const profile = get(activeProfile);
          if (!profile) return;
          profileData.setPluginSettings(profile, pluginId, key, value);
        });
      },
    },
  };
}
