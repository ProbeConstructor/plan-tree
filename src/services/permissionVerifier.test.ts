import { describe, it, expect, beforeEach } from "vitest";
import {
  permissionVerifier,
  PluginPermissionError,
} from "./permissionVerifier";
import type { PluginManifest } from "../types";

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "test-plugin",
    name: "Test Plugin",
    version: "1.0.0",
    permissions: ["tree_read", "view_register"],
    entry: "index.js",
    ...overrides,
  };
}

describe("PermissionVerifier — validateManifest", () => {
  it("accepts a valid manifest", () => {
    const result = permissionVerifier.validateManifest(makeManifest());
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("rejects manifest with missing id", () => {
    const result = permissionVerifier.validateManifest(
      makeManifest({ id: "" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("rejects manifest with missing entry", () => {
    const result = permissionVerifier.validateManifest(
      makeManifest({ entry: "" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("entry"))).toBe(true);
  });

  it("rejects manifest with unrecognized permission", () => {
    const result = permissionVerifier.validateManifest(
      makeManifest({ permissions: ["tree_read", "rust_access"] as any }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("rust_access"))).toBe(true);
  });

  it("accepts empty permissions array", () => {
    const result = permissionVerifier.validateManifest(
      makeManifest({ permissions: [] }),
    );
    expect(result.valid).toBe(true);
  });

  it("collects multiple errors", () => {
    const result = permissionVerifier.validateManifest(
      makeManifest({ id: "", name: "", version: "", entry: "" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("PermissionVerifier — check / assert", () => {
  beforeEach(() => {
    permissionVerifier.setPluginPermissions("p1", [
      "tree_read",
      "view_register",
    ]);
  });

  it("returns true for granted permission", () => {
    expect(permissionVerifier.check("p1", "tree_read")).toBe(true);
    expect(permissionVerifier.check("p1", "view_register")).toBe(true);
  });

  it("returns false for missing permission", () => {
    expect(permissionVerifier.check("p1", "tree_write")).toBe(false);
    expect(permissionVerifier.check("p1", "css_inject")).toBe(false);
  });

  it("returns false for unknown plugin", () => {
    expect(permissionVerifier.check("unknown", "tree_read")).toBe(false);
  });

  it("assert throws PluginPermissionError on denial", () => {
    expect(() => permissionVerifier.assert("p1", "tree_write")).toThrow(
      PluginPermissionError,
    );
  });

  it("assert does not throw for granted permission", () => {
    expect(() => permissionVerifier.assert("p1", "tree_read")).not.toThrow();
  });
});

describe("PermissionVerifier — violation counter", () => {
  beforeEach(() => {
    permissionVerifier.clearViolations("violator");
  });

  it("increments violation count", () => {
    permissionVerifier.recordViolation("violator", "tree_write");
    expect(permissionVerifier.getViolationCount("violator")).toBe(1);
  });

  it("returns false below threshold", () => {
    const shouldDisable = permissionVerifier.recordViolation("violator", "a");
    expect(shouldDisable).toBe(false);
    const shouldDisable2 = permissionVerifier.recordViolation("violator", "b");
    expect(shouldDisable2).toBe(false);
  });

  it("returns true at threshold (3 violations)", () => {
    permissionVerifier.recordViolation("violator", "a");
    permissionVerifier.recordViolation("violator", "b");
    const shouldDisable = permissionVerifier.recordViolation("violator", "c");
    expect(shouldDisable).toBe(true);
  });

  it("clearViolations resets count", () => {
    permissionVerifier.recordViolation("violator", "a");
    permissionVerifier.recordViolation("violator", "b");
    permissionVerifier.clearViolations("violator");
    expect(permissionVerifier.getViolationCount("violator")).toBe(0);
  });
});

describe("PermissionVerifier — plugin permissions lifecycle", () => {
  it("setPluginPermissions + check works", () => {
    permissionVerifier.setPluginPermissions("lifecycle", ["css_inject"]);
    expect(permissionVerifier.check("lifecycle", "css_inject")).toBe(true);
    expect(permissionVerifier.check("lifecycle", "tree_read")).toBe(false);
  });

  it("removePluginPermissions removes access", () => {
    permissionVerifier.setPluginPermissions("lifecycle2", ["tree_read"]);
    permissionVerifier.removePluginPermissions("lifecycle2");
    expect(permissionVerifier.check("lifecycle2", "tree_read")).toBe(false);
  });
});
