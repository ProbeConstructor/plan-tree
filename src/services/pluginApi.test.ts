import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPluginAPI } from "./pluginApi";
import { permissionVerifier, PluginPermissionError } from "./permissionVerifier";
import { pluginEventBus, PluginSubscriptionTracker } from "./pluginEventBus";

// Mock stores and services to avoid side effects
vi.mock("../stores/panelRegistry", () => ({
  getPanelInstance: vi.fn(() => ({
    tree: { subscribe: vi.fn(), update: vi.fn(), set: vi.fn() },
    completions: { subscribe: vi.fn(), update: vi.fn() },
    progressMap: { subscribe: vi.fn(), set: vi.fn() },
    canUndo: { subscribe: vi.fn(), set: vi.fn() },
    focusedNodeId: { subscribe: vi.fn(), set: vi.fn() },
    draggedNodeId: { subscribe: vi.fn(), set: vi.fn() },
    history: [],
  })),
}));

vi.mock("../stores/profileStore", () => ({
  activeProfile: { subscribe: vi.fn(), get: vi.fn(() => "TestProfile") },
}));

vi.mock("./profileDataStore", () => ({
  profileData: {
    getPluginSettingsCached: vi.fn(() => "cached-value"),
    setPluginSettings: vi.fn(),
  },
}));

vi.mock("./pluginManager", () => ({
  pluginManager: {
    disablePlugin: vi.fn(),
    registerPluginView: vi.fn(),
  },
}));

vi.mock("./commandRegistry", () => ({
  registerCommand: vi.fn(),
  clearFuseCache: vi.fn(),
}));

vi.mock("../stores/viewRegistry", () => ({
  registerView: vi.fn(() => true),
  removeView: vi.fn(() => true),
}));

vi.mock("svelte/store", async () => {
  const actual = await vi.importActual<typeof import("svelte/store")>("svelte/store");
  return {
    ...actual,
    get: vi.fn(() => "TestProfile"),
  };
});

function makeAPI(permissions: string[] = ["tree_read", "tree_write", "view_register", "command_register", "css_inject", "settings_write"]) {
  const subs = new PluginSubscriptionTracker(pluginEventBus, "test-plugin");
  const cssIds: string[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  return createPluginAPI(
    "test-plugin",
    permissions as any,
    subs,
    cssIds,
    intervals,
    timeouts,
  );
}

describe("PluginAPI — permission gating", () => {
  beforeEach(() => {
    pluginEventBus.clear();
    permissionVerifier.clearViolations("test-plugin");
  });

  it("views.register throws when missing view_register permission", () => {
    const api = makeAPI(["tree_read"]); // no view_register
    const FakeComponent = {};
    expect(() => api.views.register("v1", FakeComponent)).toThrow(
      PluginPermissionError,
    );
  });

  it("commands.register throws when missing command_register permission", () => {
    const api = makeAPI(["tree_read"]);
    expect(() =>
      api.commands.register({
        id: "cmd1",
        label: "Test",
        action: () => {},
      }),
    ).toThrow(PluginPermissionError);
  });

  it("css.inject throws when missing css_inject permission", () => {
    const api = makeAPI(["tree_read"]);
    expect(() => api.css.inject("body {}")).toThrow(PluginPermissionError);
  });

  it("tree.addNode throws when missing tree_write permission", () => {
    const api = makeAPI(["tree_read"]); // no tree_write
    expect(() => api.tree.addNode("root", { title: "Test" })).toThrow(
      PluginPermissionError,
    );
  });

  it("tree.read works with tree_read permission", () => {
    const api = makeAPI(["tree_read"]);
    expect(() => api.tree.read()).not.toThrow();
  });
});

describe("PluginAPI — settings", () => {
  beforeEach(() => {
    pluginEventBus.clear();
  });

  it("settings.get returns value from profileData", () => {
    const api = makeAPI(["tree_read", "settings_write"]);
    const val = api.settings.get("theme");
    expect(val).toBe("cached-value");
  });

  it("settings.set throws without settings_write permission", () => {
    const api = makeAPI(["tree_read"]); // no settings_write
    expect(() => api.settings.set("theme", "dark")).toThrow(
      PluginPermissionError,
    );
  });
});

describe("PluginAPI — event hooks", () => {
  beforeEach(() => {
    pluginEventBus.clear();
  });

  it("onNodeChange receives node change events", () => {
    const api = makeAPI(["tree_read"]);
    const cb = vi.fn();
    api.events.onNodeChange(cb);

    pluginEventBus.emit("node:changed", {
      node: { id: "n1" } as any,
      type: "added",
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ id: "n1" }),
      "added",
    );
  });

  it("onProjectLoad receives project load events", () => {
    const api = makeAPI(["tree_read"]);
    const cb = vi.fn();
    api.events.onProjectLoad(cb);

    pluginEventBus.emit("project:loaded", { project: "MyProject" });
    expect(cb).toHaveBeenCalledWith("MyProject");
  });
});

describe("PluginAPI — view registration", () => {
  beforeEach(() => {
    pluginEventBus.clear();
  });

  it("views.register succeeds with proper permission", () => {
    const api = makeAPI(["view_register"]);
    const FakeComponent = {};
    expect(() => api.views.register("v1", FakeComponent)).not.toThrow();
  });
});
