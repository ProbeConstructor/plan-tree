// SPDX-License-Identifier: GPL-3.0-only

import type { TreeNode } from "../types";

// ── Event Map ────────────────────────────────────────────────

export interface PluginEventMap {
  "node:changed": { node: TreeNode; type: string };
  "project:loaded": { project: string };
  "plugin:unloaded": { pluginId: string };
}

export type PluginEventKey = keyof PluginEventMap;

// ── Listener type ────────────────────────────────────────────

type Listener<K extends PluginEventKey> = (
  payload: PluginEventMap[K],
) => void;

// ── EventBus ─────────────────────────────────────────────────

class PluginEventBus {
  private listeners = new Map<string, Set<(payload: any) => void>>();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends PluginEventKey>(
    event: K,
    listener: Listener<K>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);

    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Emit an event to all registered listeners.
   */
  emit<K extends PluginEventKey>(
    event: K,
    payload: PluginEventMap[K],
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[PluginEventBus] Listener error on "${event}":`, err);
      }
    }
  }

  /**
   * Remove all listeners (full cleanup).
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get total listener count (for testing/debugging).
   */
  listenerCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}

// ── Plugin-scoped subscription tracker ───────────────────────

/**
 * Tracks subscriptions per plugin so they can be cleaned up on unload.
 * Each plugin gets a SubscriptionTracker that records all on() calls.
 */
export class PluginSubscriptionTracker {
  private unsubscribers: Array<() => void> = [];

  constructor(
    private bus: PluginEventBus,
    readonly pluginId: string,
  ) {}

  /**
   * Subscribe to an event, tracking the unsubscribe for cleanup.
   */
  on<K extends PluginEventKey>(
    event: K,
    listener: Listener<K>,
  ): () => void {
    const unsub = this.bus.on(event, listener);
    this.unsubscribers.push(unsub);
    return unsub;
  }

  /**
   * Remove all subscriptions registered through this tracker.
   */
  cleanup(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}

// ── Singleton ────────────────────────────────────────────────

export const pluginEventBus = new PluginEventBus();
