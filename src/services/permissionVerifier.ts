// SPDX-License-Identifier: GPL-3.0-only

import type { PluginManifest, PluginPermission } from "../types";
import { VALID_PERMISSIONS } from "../types";

// ── Types ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ViolationRecord {
  count: number;
  details: string[];
}

// ── Constants ────────────────────────────────────────────────

const AUTO_DISABLE_THRESHOLD = 3;

// ── PermissionVerifier ───────────────────────────────────────

class PermissionVerifier {
  private violations = new Map<string, ViolationRecord>();

  /**
   * Validate a plugin manifest's permissions at load time.
   * Rejects the plugin if any declared permission is not in the allowed set.
   */
  validateManifest(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];

    if (!manifest.id || typeof manifest.id !== "string") {
      errors.push("Missing or invalid 'id' field");
    }
    if (!manifest.name || typeof manifest.name !== "string") {
      errors.push("Missing or invalid 'name' field");
    }
    if (!manifest.version || typeof manifest.version !== "string") {
      errors.push("Missing or invalid 'version' field");
    }
    if (!manifest.entry || typeof manifest.entry !== "string") {
      errors.push("Missing or invalid 'entry' field");
    }
    if (!Array.isArray(manifest.permissions)) {
      errors.push("Missing or invalid 'permissions' field (must be an array)");
    } else {
      for (const perm of manifest.permissions) {
        if (!VALID_PERMISSIONS.has(perm)) {
          errors.push(`Unrecognized permission: '${perm}'`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check whether a plugin has a specific permission.
   * Returns true if allowed, false if denied.
   */
  check(pluginId: string, permission: PluginPermission): boolean {
    const plugin = this.getPluginPermissions(pluginId);
    if (!plugin) return false;
    return plugin.includes(permission);
  }

  /**
   * Assert a permission or throw. Used by PluginAPI methods.
   */
  assert(pluginId: string, permission: PluginPermission): void {
    if (!this.check(pluginId, permission)) {
      throw new PluginPermissionError(pluginId, permission);
    }
  }

  /**
   * Record a permission violation. Returns true if plugin should be auto-disabled.
   */
  recordViolation(pluginId: string, action: string): boolean {
    let record = this.violations.get(pluginId);
    if (!record) {
      record = { count: 0, details: [] };
      this.violations.set(pluginId, record);
    }
    record.count++;
    record.details.push(action);
    console.warn(
      `[PluginSecurity] Permission violation #${record.count} for "${pluginId}": ${action}`,
    );
    return record.count >= AUTO_DISABLE_THRESHOLD;
  }

  /** Get the violation count for a plugin. */
  getViolationCount(pluginId: string): number {
    return this.violations.get(pluginId)?.count ?? 0;
  }

  /** Clear violations for a plugin (e.g. on re-enable). */
  clearViolations(pluginId: string): void {
    this.violations.delete(pluginId);
  }

  // ── Internal ─────────────────────────────────────────────

  /** Store permission list per active plugin. Called by PluginManager on load. */
  private pluginPermissions = new Map<string, PluginPermission[]>();

  setPluginPermissions(pluginId: string, permissions: PluginPermission[]): void {
    this.pluginPermissions.set(pluginId, permissions);
  }

  removePluginPermissions(pluginId: string): void {
    this.pluginPermissions.delete(pluginId);
  }

  private getPluginPermissions(pluginId: string): PluginPermission[] | undefined {
    return this.pluginPermissions.get(pluginId);
  }
}

// ── Custom Error ─────────────────────────────────────────────

export class PluginPermissionError extends Error {
  pluginId: string;
  permission: string;

  constructor(pluginId: string, permission: string) {
    super(`Plugin "${pluginId}" lacks permission "${permission}"`);
    this.name = "PluginPermissionError";
    this.pluginId = pluginId;
    this.permission = permission;
  }
}

// ── Singleton ────────────────────────────────────────────────

export const permissionVerifier = new PermissionVerifier();
