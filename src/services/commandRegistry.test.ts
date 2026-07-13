import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TreeNode } from "../types";
import {
  registerCommand,
  getCommands,
  searchCommands,
  recordRecent,
  getRecentIds,
  nodeCommandsFromTree,
  clearFuseCache,
} from "./commandRegistry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCommand(
  overrides: Partial<Parameters<typeof registerCommand>[0]> & {
    id: string;
  },
) {
  return {
    label: overrides.id,
    category: "utilities" as const,
    icon: "🔧",
    enabled: () => true,
    action: () => {},
    ...overrides,
  };
}

function buildTestTree(): TreeNode {
  return {
    id: "root",
    title: "Root",
    expanded: true,
    status: "todo",
    priority: "medium",
    children: [
      {
        id: "child1",
        title: "Child 1",
        expanded: true,
        status: "doing",
        priority: "high",
        children: [
          {
            id: "grandchild1",
            title: "Grandchild 1",
            expanded: false,
            status: "done",
            priority: "critical",
            children: [],
            startDate: "2026-01-01",
          },
          {
            id: "grandchild2",
            title: "Grandchild 2",
            expanded: false,
            status: "todo",
            priority: "medium",
            children: [],
            startDate: "2026-01-01",
          },
        ],
        startDate: "2026-01-01",
      },
      {
        id: "child2",
        title: "Child 2",
        expanded: false,
        status: "todo",
        priority: "low",
        children: [],
        startDate: "2026-01-01",
      },
    ],
    startDate: "2026-01-01",
  };
}

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

// ---------------------------------------------------------------------------
// 1: Registration
// ---------------------------------------------------------------------------

describe("registerCommand / getCommands", () => {
  beforeEach(() => {
    // Reset by reimporting is expensive — we rely on getCommands returning
    // a snapshot. Tests register unique ids to avoid cross-test pollution.
    clearFuseCache();
  });

  it("registers and retrieves a command", () => {
    const cmd = makeCommand({ id: "test-1", label: "Test command" });
    registerCommand(cmd);
    const all = getCommands();
    expect(all.find((c) => c.id === "test-1")).toBeDefined();
  });

  it("deduplicates by id — last registration wins", () => {
    registerCommand(makeCommand({ id: "dedup-1", label: "First" }));
    registerCommand(makeCommand({ id: "dedup-1", label: "Second" }));
    const all = getCommands();
    const matches = all.filter((c) => c.id === "dedup-1");
    expect(matches.length).toBe(1);
    expect(matches[0].label).toBe("Second");
  });

  it("returns a copy — mutations do not affect registry", () => {
    registerCommand(makeCommand({ id: "immut-1", label: "Immutable" }));
    const all = getCommands();
    all.pop();
    expect(getCommands().find((c) => c.id === "immut-1")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2: Fuzzy Search
// ---------------------------------------------------------------------------

describe("searchCommands", () => {
  const commands = [
    makeCommand({
      id: "new-project",
      label: "New project",
      category: "project",
    }),
    makeCommand({
      id: "rename-project",
      label: "Rename project",
      category: "project",
    }),
    makeCommand({
      id: "export-project",
      label: "Export project",
      category: "project",
    }),
    makeCommand({
      id: "view-tree",
      label: "View tree",
      category: "navigation",
    }),
  ];

  beforeEach(() => {
    clearFuseCache();
  });

  it("returns all matching commands for a fuzzy query", () => {
    const results = searchCommands("pro", commands);
    expect(results.length).toBeGreaterThanOrEqual(2);
    const ids = results.map((r) => r.item.id);
    expect(ids).toContain("new-project");
    expect(ids).toContain("export-project");
  });

  it("returns empty array for no matches", () => {
    const results = searchCommands("zzzznonexistent", commands);
    expect(results.length).toBe(0);
  });

  it("returns all commands when query is empty string", () => {
    const results = searchCommands("", commands);
    expect(results.length).toBe(commands.length);
  });
});

// ---------------------------------------------------------------------------
// 3: Recent Commands
// ---------------------------------------------------------------------------

describe("recordRecent / getRecentIds", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("records a command id", () => {
    recordRecent("cmd-1");
    expect(getRecentIds()).toEqual(["cmd-1"]);
  });

  it("prepends most recent command", () => {
    recordRecent("cmd-1");
    recordRecent("cmd-2");
    expect(getRecentIds()).toEqual(["cmd-2", "cmd-1"]);
  });

  it("deduplicates — moves existing to top", () => {
    recordRecent("cmd-1");
    recordRecent("cmd-2");
    recordRecent("cmd-1");
    expect(getRecentIds()).toEqual(["cmd-1", "cmd-2"]);
  });

  it("evicts oldest when exceeding max 5", () => {
    recordRecent("cmd-1");
    recordRecent("cmd-2");
    recordRecent("cmd-3");
    recordRecent("cmd-4");
    recordRecent("cmd-5");
    recordRecent("cmd-6");
    const ids = getRecentIds();
    expect(ids.length).toBe(5);
    expect(ids[0]).toBe("cmd-6");
    expect(ids).not.toContain("cmd-1");
  });

  it("returns empty array when localStorage is empty", () => {
    expect(getRecentIds()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4: Node Commands from Tree
// ---------------------------------------------------------------------------

describe("nodeCommandsFromTree", () => {
  it("generates a command for each node in the tree", () => {
    const tree = buildTestTree();
    const cmds = nodeCommandsFromTree(tree, "MyProject");
    // root + child1 + grandchild1 + grandchild2 + child2 = 5
    expect(cmds.length).toBe(5);
  });

  it("each command has correct category and location", () => {
    const tree = buildTestTree();
    const cmds = nodeCommandsFromTree(tree, "ProjectX");
    for (const cmd of cmds) {
      expect(cmd.category).toBe("node");
      expect(cmd.location).toBe("ProjectX");
      expect(cmd.id).toMatch(/^node:/);
    }
  });

  it("uses node title as label", () => {
    const tree = buildTestTree();
    const cmds = nodeCommandsFromTree(tree, "ProjectX");
    const labels = cmds.map((c) => c.label);
    expect(labels).toContain("Root");
    expect(labels).toContain("Child 1");
    expect(labels).toContain("Grandchild 1");
  });

  it("uses node icon when present", () => {
    const tree: TreeNode = {
      id: "a",
      title: "A",
      expanded: false,
      status: "todo",
      priority: "medium",
      icon: "⭐",
      children: [],
      startDate: "2026-01-01",
    };
    const cmds = nodeCommandsFromTree(tree, "P");
    expect(cmds[0].icon).toBe("⭐");
  });

  it("defaults to 📄 icon when node has no icon", () => {
    const tree: TreeNode = {
      id: "a",
      title: "A",
      expanded: false,
      status: "todo",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
    };
    const cmds = nodeCommandsFromTree(tree, "P");
    expect(cmds[0].icon).toBe("📄");
  });
});
