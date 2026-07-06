import { describe, it, expect } from "vitest";
import type { TreeNode } from "../types";
import {
  findNode,
  moveNode,
  updateNode,
  deleteNode,
  extractNode,
  calculateNodeProgress,
  calculateGlobalProgress,
  getPriorityColor,
  getProgressColor,
  getTodayNodes,
  getDefaultTitle,
  isOverdue,
  hasAnyFocus,
  setFocus,
  getDirectBranches,
  getPriorityBreakdown,
  getOverdueAndUpcoming,
  daysOverdue,
  calculateProgressMap,
  searchNodes,
} from "./treeUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// Make a string date N days from now (for time-dependent tests)
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// findNode
// ---------------------------------------------------------------------------

describe("findNode", () => {
  it("finds the root node by its id", () => {
    const tree = buildTestTree();
    const found = findNode(tree, "root");
    expect(found).not.toBeNull();
    expect(found!.id).toBe("root");
    expect(found!.title).toBe("Root");
  });

  it("finds a direct child node", () => {
    const tree = buildTestTree();
    const found = findNode(tree, "child1");
    expect(found).not.toBeNull();
    expect(found!.id).toBe("child1");
  });

  it("finds a deeply nested node", () => {
    const tree = buildTestTree();
    const found = findNode(tree, "grandchild2");
    expect(found).not.toBeNull();
    expect(found!.id).toBe("grandchild2");
    expect(found!.title).toBe("Grandchild 2");
  });

  it("returns null for a non-existent id", () => {
    const tree = buildTestTree();
    expect(findNode(tree, "does-not-exist")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateNode
// ---------------------------------------------------------------------------

describe("updateNode", () => {
  it("updates the root node's title", () => {
    const tree = buildTestTree();
    const updated = updateNode(tree, "root", (n) => ({ ...n, title: "New Root Title" }));
    expect(updated.title).toBe("New Root Title");
  });

  it("updates a deeply nested node's property", () => {
    const tree = buildTestTree();
    const updated = updateNode(tree, "grandchild2", (n) => ({
      ...n,
      priority: "high" as const,
    }));
    const gc2 = findNode(updated, "grandchild2");
    expect(gc2!.priority).toBe("high");
  });

  it("returns a new object (immutable update)", () => {
    const tree = buildTestTree();
    const updated = updateNode(tree, "child1", (n) => ({ ...n, title: "Changed" }));
    // Original must not be mutated
    expect(tree.children[0].title).toBe("Child 1");
    expect(updated.children[0].title).toBe("Changed");
    // Root reference should differ
    expect(updated).not.toBe(tree);
  });

  it("preserves unchanged parts of the tree", () => {
    const tree = buildTestTree();
    const updated = updateNode(tree, "grandchild2", (n) => ({ ...n, title: "Updated" }));
    // Unrelated branch must be identical
    expect(findNode(updated, "child2")!.title).toBe("Child 2");
  });

  it("returns the same tree reference when id is not found", () => {
    const tree = buildTestTree();
    const updated = updateNode(tree, "nonexistent", (n) => ({ ...n, title: "Nope" }));
    expect(updated).toEqual(tree);
  });
});

// ---------------------------------------------------------------------------
// deleteNode
// ---------------------------------------------------------------------------

describe("deleteNode", () => {
  it("deletes a leaf node", () => {
    const tree = buildTestTree();
    const result = deleteNode(tree, "grandchild2");
    const parent = findNode(result, "child1")!;
    expect(parent.children.find((c) => c.id === "grandchild2")).toBeUndefined();
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0].id).toBe("grandchild1");
  });

  it("deletes a node and its entire subtree", () => {
    const tree = buildTestTree();
    const result = deleteNode(tree, "child1");
    expect(result.children.find((c) => c.id === "child1")).toBeUndefined();
    expect(result.children).toHaveLength(1);
    expect(result.children[0].id).toBe("child2");
    // Subtree nodes should also be gone
    expect(findNode(result, "grandchild1")).toBeNull();
    expect(findNode(result, "grandchild2")).toBeNull();
  });

  it("returns the tree unchanged when deleting a non-existent id", () => {
    const tree = buildTestTree();
    const result = deleteNode(tree, "nonexistent");
    expect(result).toEqual(tree);
  });

  it("is a no-op when deleting the root (root has no parent to remove from)", () => {
    const tree = buildTestTree();
    const result = deleteNode(tree, "root");
    // Root itself stays — the function only filters children lists
    expect(result.id).toBe("root");
    expect(result.children).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// moveNode
// ---------------------------------------------------------------------------

describe("moveNode", () => {
  it("moves a node to a new parent", () => {
    const tree = buildTestTree();
    const result = moveNode(tree, "grandchild2", "child2");
    // grandchild2 should now be under child2
    const target = findNode(result, "child2")!;
    expect(target.children.find((c) => c.id === "grandchild2")).toBeTruthy();
    // And should no longer be under child1
    const source = findNode(result, "child1")!;
    expect(source.children.find((c) => c.id === "grandchild2")).toBeUndefined();
    // target parent should be auto-expanded after receiving a child
    expect(target.expanded).toBe(true);
  });

  it("returns the tree unchanged when dragging a node to itself", () => {
    const tree = buildTestTree();
    const result = moveNode(tree, "child1", "child1");
    expect(result).toEqual(tree);
  });

  it("returns the tree unchanged when trying to move the root", () => {
    const tree = buildTestTree();
    const result = moveNode(tree, "root", "child1");
    expect(result).toEqual(tree);
  });

  it("returns the tree unchanged when moving a node into its own descendant", () => {
    const tree = buildTestTree();
    // child1 contains grandchild1 — moving child1 into grandchild1 would create a cycle
    const result = moveNode(tree, "child1", "grandchild1");
    expect(result).toEqual(tree);
  });

  it("returns the tree unchanged when target parent does not exist (no orphaning)", () => {
    const tree = buildTestTree();
    const result = moveNode(tree, "child1", "nonexistent");
    // Antes: el nodo se perdía porque deleteNode corría antes de validar.
    // Ahora: se valida que el target existe antes de mutar.
    expect(result).toEqual(tree);
  });

  it("returns the tree unchanged when dragged node does not exist", () => {
    const tree = buildTestTree();
    const result = moveNode(tree, "nonexistent", "child2");
    expect(result).toEqual(tree);
  });
});

// ---------------------------------------------------------------------------
// extractNode
// ---------------------------------------------------------------------------

describe("extractNode", () => {
  it("extracts a leaf node, removing it from the original tree", () => {
    const tree = buildTestTree();
    const { extracted, remainingTree } = extractNode(tree, "grandchild2");
    expect(extracted).not.toBeNull();
    expect(extracted!.id).toBe("grandchild2");
    // The extracted node is a clone (new reference)
    expect(extracted).not.toBe(findNode(tree, "grandchild2"));
    // Node must be gone from remaining tree
    expect(findNode(remainingTree, "grandchild2")).toBeNull();
  });

  it("extracts a subtree, preserving the extracted structure", () => {
    const tree = buildTestTree();
    const { extracted, remainingTree } = extractNode(tree, "child1");
    expect(extracted).not.toBeNull();
    expect(extracted!.id).toBe("child1");
    // Subtree must be complete in the extracted copy
    expect(findNode(extracted!, "grandchild1")).not.toBeNull();
    expect(findNode(extracted!, "grandchild2")).not.toBeNull();
    // Everything under child1 must be gone from remaining tree
    expect(findNode(remainingTree, "child1")).toBeNull();
    expect(findNode(remainingTree, "grandchild1")).toBeNull();
  });

  it("returns null extracted and unchanged tree for non-existent id", () => {
    const tree = buildTestTree();
    const { extracted, remainingTree } = extractNode(tree, "nonexistent");
    expect(extracted).toBeNull();
    expect(remainingTree).toEqual(tree);
  });
});

// ---------------------------------------------------------------------------
// calculateNodeProgress / calculateGlobalProgress
// ---------------------------------------------------------------------------

describe("calculateNodeProgress", () => {
  it("returns 100 for a leaf node with status 'done'", () => {
    const node = buildTestTree();
    const gc1 = findNode(node, "grandchild1")!;
    expect(calculateNodeProgress(gc1)).toBe(100);
  });

  it("returns 50 for a leaf node with status 'doing'", () => {
    const leaf: TreeNode = {
      id: "l",
      title: "Leaf",
      expanded: false,
      status: "doing",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
    };
    expect(calculateNodeProgress(leaf)).toBe(50);
  });

  it("returns 0 for a leaf node with status 'todo'", () => {
    const leaf: TreeNode = {
      id: "l",
      title: "Leaf",
      expanded: false,
      status: "todo",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
    };
    expect(calculateNodeProgress(leaf)).toBe(0);
  });

  it("calculates the average progress of children", () => {
    const node = buildTestTree();
    const child1 = findNode(node, "child1")!;
    // grandchild1 = 100, grandchild2 = 0 → avg = 50
    expect(calculateNodeProgress(child1)).toBe(50);
  });

  it("computes root progress as the average of its direct children", () => {
    const node = buildTestTree();
    // child1 = 50, child2 = 0 → avg = 25
    expect(calculateNodeProgress(node)).toBe(25);
  });
});

describe("calculateGlobalProgress", () => {
  it("delegates to calculateNodeProgress and returns the same result", () => {
    const node = buildTestTree();
    expect(calculateGlobalProgress(node)).toBe(calculateNodeProgress(node));
  });
});

// ---------------------------------------------------------------------------
// getPriorityColor
// ---------------------------------------------------------------------------

describe("getPriorityColor", () => {
  const tests: [string, string][] = [
    ["critical", "#ef4444"],
    ["high", "#f59e0b"],
    ["medium", "#3b82f6"],
    ["low", "#6b7280"],
  ];

  it.each(tests)("returns %s for priority '%s'", (priority, expected) => {
    expect(getPriorityColor(priority)).toBe(expected);
  });

  it("returns gray for unknown priority", () => {
    expect(getPriorityColor("unknown")).toBe("#6b7280");
  });
});

// ---------------------------------------------------------------------------
// getProgressColor
// ---------------------------------------------------------------------------

describe("getProgressColor", () => {
  const tests: [number, string][] = [
    [100, "#4CAF50"],
    [75, "#FFC107"],
    [50, "#FFC107"],
    [25, "#FF9800"],
    [1, "#FF9800"],
    [0, "#F44336"],
  ];

  it.each(tests)("returns '%s' for progress %d", (progress, expected) => {
    expect(getProgressColor(progress)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// getTodayNodes
// ---------------------------------------------------------------------------

describe("getTodayNodes", () => {
  it("returns nodes with high or critical priority that are not done", () => {
    const tree = buildTestTree();
    const today = getTodayNodes(tree);
    // child1: priority=high, status=doing → included
    // grandchild1: priority=critical, status=done → excluded (done)
    // grandchild2: priority=medium → excluded
    // child2: priority=low → excluded
    expect(today).toHaveLength(1);
    expect(today[0].id).toBe("child1");
  });

  it("excludes the root node", () => {
    const tree = buildTestTree();
    const today = getTodayNodes(tree);
    expect(today.find((n) => n.id === "root")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getDefaultTitle
// ---------------------------------------------------------------------------

describe("getDefaultTitle", () => {
  const tests: [number, string][] = [
    [0, "Usuario"],
    [1, "Nuevo sueño"],
    [2, "Nueva meta"],
    [3, "Nuevo objetivo"],
    [4, "Nueva tarea"],
    [5, "Nueva subtarea"],
    [99, "Nueva subtarea"],
  ];

  it.each(tests)("returns '%s' for depth %d", (depth, expected) => {
    expect(getDefaultTitle(depth)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// isOverdue (time-dependent — uses computed dates)
// ---------------------------------------------------------------------------

describe("isOverdue", () => {
  it("returns false when node has no dueDate", () => {
    const node: TreeNode = {
      id: "x",
      title: "No date",
      expanded: false,
      status: "todo",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
    };
    expect(isOverdue(node)).toBe(false);
  });

  it("returns false when node status is 'done' regardless of dueDate", () => {
    const node: TreeNode = {
      id: "x",
      title: "Done but past due",
      expanded: false,
      status: "done",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
      dueDate: "2020-01-01", // very old
    };
    expect(isOverdue(node)).toBe(false);
  });

  it("returns true when dueDate is in the past and node is not done", () => {
    const node: TreeNode = {
      id: "x",
      title: "Overdue",
      expanded: false,
      status: "todo",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
      dueDate: "2020-01-01",
    };
    expect(isOverdue(node)).toBe(true);
  });

  it("returns false when dueDate is in the future", () => {
    const node: TreeNode = {
      id: "x",
      title: "Future",
      expanded: false,
      status: "todo",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
      dueDate: "2099-12-31",
    };
    expect(isOverdue(node)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasAnyFocus
// ---------------------------------------------------------------------------

describe("hasAnyFocus", () => {
  it("returns true when the node itself is focused", () => {
    const node: TreeNode = {
      id: "x",
      title: "Focused",
      expanded: false,
      status: "todo",
      priority: "medium",
      children: [],
      focused: true,
      startDate: "2026-01-01",
    };
    expect(hasAnyFocus(node)).toBe(true);
  });

  it("returns true when a descendant is focused", () => {
    const node: TreeNode = {
      id: "root",
      title: "Parent",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "child",
          title: "Child",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          focused: true,
          startDate: "2026-01-01",
        },
      ],
      startDate: "2026-01-01",
    };
    expect(hasAnyFocus(node)).toBe(true);
  });

  it("returns false when no node is focused", () => {
    const tree = buildTestTree();
    expect(hasAnyFocus(tree)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setFocus
// ---------------------------------------------------------------------------

describe("setFocus", () => {
  it("sets focus on a specific node", () => {
    const tree = buildTestTree();
    const result = setFocus(tree, "child1");
    expect(findNode(result, "child1")!.focused).toBe(true);
  });

  it("clears previous focus when setting new focus on another node", () => {
    const tree = buildTestTree();
    const result1 = setFocus(tree, "child1");
    const result2 = setFocus(result1, "grandchild2");
    // child1 should no longer be focused
    expect(findNode(result2, "child1")!.focused).toBe(false);
    expect(findNode(result2, "grandchild2")!.focused).toBe(true);
  });

  it("clears all focus when id is null", () => {
    // First set some focus
    const tree = buildTestTree();
    const focused = setFocus(tree, "child1");
    const cleared = setFocus(focused, null);
    expect(findNode(cleared, "child1")!.focused).toBe(false);
    // All nodes should have focused=false
    expect(hasAnyFocus(cleared)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getDirectBranches
// ---------------------------------------------------------------------------

describe("getDirectBranches", () => {
  it("returns children with id, title, and progress", () => {
    const tree = buildTestTree();
    const branches = getDirectBranches(tree);
    expect(branches).toHaveLength(2);
    expect(branches[0]).toEqual({
      id: "child1",
      title: "Child 1",
      progress: 50,
    });
    expect(branches[1]).toEqual({
      id: "child2",
      title: "Child 2",
      progress: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// getPriorityBreakdown
// ---------------------------------------------------------------------------

describe("getPriorityBreakdown", () => {
  it("counts total and done per priority across all non-root nodes", () => {
    const tree = buildTestTree();
    const breakdown = getPriorityBreakdown(tree);
    // child1: priority=high, status=doing
    // grandchild1: priority=critical, status=done
    // grandchild2: priority=medium, status=todo
    // child2: priority=low, status=todo
    expect(breakdown).toEqual({
      critical: { total: 1, done: 1 },
      high: { total: 1, done: 0 },
      medium: { total: 1, done: 0 },
      low: { total: 1, done: 0 },
    });
  });

  it("does not count the root node", () => {
    const tree = buildTestTree();
    // root has priority=medium, status=todo — should NOT be counted
    const breakdown = getPriorityBreakdown(tree);
    const mediumCount = breakdown.medium.total;
    // Only grandchild2 has medium priority
    expect(mediumCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getOverdueAndUpcoming (time-dependent — uses computed dates)
// ---------------------------------------------------------------------------

describe("getOverdueAndUpcoming", () => {
  it("returns overdue nodes (past dueDate, not done)", () => {
    const pastDate = daysFromNow(-30);
    const root: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "overdue-node",
          title: "Overdue Item",
          expanded: false,
          status: "todo",
          priority: "high",
          children: [],
          startDate: "2026-01-01",
          dueDate: pastDate,
        },
        {
          id: "done-overdue",
          title: "Done Overdue",
          expanded: false,
          status: "done",
          priority: "high",
          children: [],
          startDate: "2026-01-01",
          dueDate: pastDate,
        },
      ],
      startDate: "2026-01-01",
    };
    const { overdue, upcoming } = getOverdueAndUpcoming(root);
    expect(overdue.find((n) => n.id === "overdue-node")).toBeTruthy();
    expect(overdue.find((n) => n.id === "done-overdue")).toBeFalsy();
  });

  it("returns upcoming nodes within the default 5-day window", () => {
    const upcomingDate = daysFromNow(2); // 2 days from now → within window
    const farFutureDate = daysFromNow(30); // 30 days → outside window
    const root: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "soon",
          title: "Soon",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-01-01",
          dueDate: upcomingDate,
        },
        {
          id: "far",
          title: "Far",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-01-01",
          dueDate: farFutureDate,
        },
        {
          id: "done-soon",
          title: "Done Soon",
          expanded: false,
          status: "done",
          priority: "medium",
          children: [],
          startDate: "2026-01-01",
          dueDate: upcomingDate,
        },
      ],
      startDate: "2026-01-01",
    };
    const { upcoming } = getOverdueAndUpcoming(root);
    expect(upcoming.find((n) => n.id === "soon")).toBeTruthy();
    expect(upcoming.find((n) => n.id === "far")).toBeFalsy();
    expect(upcoming.find((n) => n.id === "done-soon")).toBeFalsy();
  });

  it("sorts overdue nodes chronologically", () => {
    const olderDate = daysFromNow(-20);
    const newerDate = daysFromNow(-10);
    const root: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "b",
          title: "Second",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-01-01",
          dueDate: newerDate,
        },
        {
          id: "a",
          title: "First",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-01-01",
          dueDate: olderDate,
        },
      ],
      startDate: "2026-01-01",
    };
    const { overdue } = getOverdueAndUpcoming(root);
    expect(overdue[0].id).toBe("a");
    expect(overdue[1].id).toBe("b");
  });
});

// ---------------------------------------------------------------------------
// daysOverdue
// ---------------------------------------------------------------------------

describe("daysOverdue", () => {
  it("returns a positive number for a past date", () => {
    const past = daysFromNow(-10);
    const days = daysOverdue(past);
    expect(days).toBeGreaterThanOrEqual(9); // may be 10 or 9 depending on time of day
    expect(days).toBeLessThanOrEqual(11);
  });

  it("returns a negative number for a future date", () => {
    const future = daysFromNow(10);
    const days = daysOverdue(future);
    expect(days).toBeLessThanOrEqual(-9);
    expect(days).toBeGreaterThanOrEqual(-11);
  });

  it("returns approximately 0 for today's date", () => {
    const today = daysFromNow(0);
    const days = daysOverdue(today);
    expect(Math.abs(days)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// searchNodes
// ---------------------------------------------------------------------------

function buildSearchTestTree(): TreeNode {
  return {
    id: "root",
    title: "Root",
    expanded: true,
    status: "todo",
    priority: "medium",
    children: [
      {
        id: "child1",
        title: "Configurar servidor",
        expanded: true,
        status: "doing",
        priority: "high",
        children: [],
        startDate: "2026-01-01",
        comments: "Usar Docker para el despliegue",
      },
      {
        id: "child2",
        title: "Diseñar base de datos",
        expanded: false,
        status: "todo",
        priority: "medium",
        children: [],
        startDate: "2026-01-01",
        comments: "Revisar esquema de PostgreSQL con índices",
      },
      {
        id: "child3",
        title: "Frontend",
        expanded: false,
        status: "todo",
        priority: "medium",
        children: [],
        startDate: "2026-01-01",
        comments: "usar react con typescript",
      },
    ],
    startDate: "2026-01-01",
  };
}

describe("searchNodes", () => {
  it("matches by title case-insensitively", () => {
    const tree = buildSearchTestTree();
    const results = searchNodes(tree, "servidor");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("child1");
    expect(results[0].matchField).toBe("title");
  });

  it("matches by comments case-insensitively", () => {
    const tree = buildSearchTestTree();
    const results = searchNodes(tree, "docker");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("child1");
    expect(results[0].matchField).toBe("comments");
    expect(results[0].matchSnippet).toBeTruthy();
  });

  it("matches multiple nodes across title and comments", () => {
    const tree = buildSearchTestTree();
    // child1 comment: "Usar Docker..." → matches "usar"
    // child3 comment: "usar react..." → matches "usar"
    const results = searchNodes(tree, "usar");
    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.id).sort();
    expect(ids).toEqual(["child1", "child3"]);
  });

  it("does not duplicate a node when both title and comments match", () => {
    const tree = buildSearchTestTree();
    // child1: title="Configurar servidor" contains "config"
    //        comment="Usar Docker para el despliegue" does NOT contain "config"
    // Let's use a tree where a node explicitly matches in both fields
    const dualTree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "dual",
          title: "PostgreSQL setup",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-01-01",
          comments: "postgresql connection string here",
        },
      ],
      startDate: "2026-01-01",
    };
    const results = searchNodes(dualTree, "postgresql");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("dual");
    expect(results[0].matchField).toBe("title"); // title match wins
  });

  it("returns empty array when query is empty", () => {
    const tree = buildSearchTestTree();
    expect(searchNodes(tree, "")).toHaveLength(0);
  });

  it("returns empty array when no match is found", () => {
    const tree = buildSearchTestTree();
    const results = searchNodes(tree, "zzzznotfound");
    expect(results).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const tree = buildSearchTestTree();
    const upper = searchNodes(tree, "SERVIDOR");
    const lower = searchNodes(tree, "servidor");
    expect(upper).toEqual(lower);
  });

  it("includes snippet for comment matches", () => {
    const tree = buildSearchTestTree();
    const results = searchNodes(tree, "índices");
    expect(results).toHaveLength(1);
    expect(results[0].matchSnippet).toBeTruthy();
    expect(results[0].matchSnippet!.toLowerCase()).toContain("índices");
  });
});

// ---------------------------------------------------------------------------
// calculateProgressMap
// ---------------------------------------------------------------------------

describe("calculateProgressMap", () => {
  it("returns a Map with progress for every node in the tree", () => {
    const tree = buildTestTree();
    const map = calculateProgressMap(tree);
    expect(map.size).toBe(5); // root, child1, child2, grandchild1, grandchild2
    expect(map.get("grandchild1")).toBe(100);
    expect(map.get("grandchild2")).toBe(0);
    expect(map.get("child1")).toBe(50);
    expect(map.get("child2")).toBe(0);
    expect(map.get("root")).toBe(25);
  });
});
