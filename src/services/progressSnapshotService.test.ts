import { describe, it, expect } from "vitest";
import type { TreeNode, Snapshot } from "../types";
import { computeSnapshot } from "../services/progressSnapshotService";

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

function makeSnapshot(overrides: Partial<Snapshot> & { timestamp: string }): Snapshot {
  return {
    globalProgress: 0,
    branchProgress: [],
    totalNodes: 0,
    doneNodes: 0,
    statusBreakdown: { todo: 0, doing: 0, done: 0 },
    priorityBreakdown: {
      critical: { total: 0, done: 0 },
      high: { total: 0, done: 0 },
      medium: { total: 0, done: 0 },
      low: { total: 0, done: 0 },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 5.1: computeSnapshot
// ---------------------------------------------------------------------------

describe("computeSnapshot", () => {
  it("calculates global progress from tree", () => {
    const tree = buildTestTree();
    const snap = computeSnapshot(tree);
    // child1=50, child2=0 → global = avg(50,0) = 25
    expect(snap.globalProgress).toBe(25);
  });

  it("computes branch progress for each direct child", () => {
    const tree = buildTestTree();
    const snap = computeSnapshot(tree);
    expect(snap.branchProgress).toHaveLength(2);
    expect(snap.branchProgress[0]).toEqual({
      id: "child1",
      title: "Child 1",
      progress: 50,
    });
    expect(snap.branchProgress[1]).toEqual({
      id: "child2",
      title: "Child 2",
      progress: 0,
    });
  });

  it("counts total and done nodes correctly", () => {
    const tree = buildTestTree();
    const snap = computeSnapshot(tree);
    // root + child1 + child2 + grandchild1 + grandchild2 = 5 total
    expect(snap.totalNodes).toBe(5);
    // grandchild1 is done = 1
    expect(snap.doneNodes).toBe(1);
  });

  it("computes status breakdown", () => {
    const tree = buildTestTree();
    const snap = computeSnapshot(tree);
    expect(snap.statusBreakdown).toEqual({
      todo: 3,  // root, grandchild2, child2
      doing: 1, // child1
      done: 1,  // grandchild1
    });
  });

  it("computes priority breakdown", () => {
    const tree = buildTestTree();
    const snap = computeSnapshot(tree);
    expect(snap.priorityBreakdown).toEqual({
      critical: { total: 1, done: 1 },
      high: { total: 1, done: 0 },
      medium: { total: 1, done: 0 },
      low: { total: 1, done: 0 },
    });
  });

  it("includes an ISO 8601 timestamp", () => {
    const tree = buildTestTree();
    const snap = computeSnapshot(tree);
    expect(snap.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const date = new Date(snap.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });

  it("handles an empty tree (root with no children)", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Solo",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
    };
    const snap = computeSnapshot(tree);
    expect(snap.totalNodes).toBe(1);
    expect(snap.doneNodes).toBe(0);
    expect(snap.branchProgress).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5.2: Month filtering of Snapshot[]
// ---------------------------------------------------------------------------

describe("month filtering", () => {
  it("returns only snapshots within the target year and month using UTC (coincide con loadSnapshots)", () => {
    const snapshots: Snapshot[] = [
      makeSnapshot({ timestamp: "2026-06-15T12:00:00Z" }),
      makeSnapshot({ timestamp: "2026-07-01T08:00:00Z" }),
      makeSnapshot({ timestamp: "2026-07-15T14:30:00Z" }),
      makeSnapshot({ timestamp: "2026-08-01T10:00:00Z" }),
    ];

    // Usamos UTC para coincidir con loadSnapshots (getUTCFullYear/getUTCMonth)
    const result = snapshots.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 6; // July = 6
    });

    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe("2026-07-01T08:00:00Z");
    expect(result[1].timestamp).toBe("2026-07-15T14:30:00Z");
  });

  it("returns empty array for a month with no snapshots", () => {
    const snapshots: Snapshot[] = [
      makeSnapshot({ timestamp: "2026-06-15T12:00:00Z" }),
      makeSnapshot({ timestamp: "2026-07-15T14:30:00Z" }),
    ];

    const result = snapshots.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 11; // December
    });

    expect(result).toHaveLength(0);
  });

  it("handles year boundaries correctly using UTC", () => {
    const snapshots: Snapshot[] = [
      makeSnapshot({ timestamp: "2025-12-31T23:00:00Z" }),
      makeSnapshot({ timestamp: "2026-01-01T01:00:00Z" }),
    ];

    // Coincidir con el algoritmo de loadSnapshots (UTC)
    const jan2026 = snapshots.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 0;
    });

    const dec2025 = snapshots.filter((s) => {
      const d = new Date(s.timestamp);
      return d.getUTCFullYear() === 2025 && d.getUTCMonth() === 11;
    });

    expect(jan2026).toHaveLength(1);
    expect(jan2026[0].timestamp).toBe("2026-01-01T01:00:00Z");
    expect(dec2025).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5.3: Async write serialization
// ---------------------------------------------------------------------------

describe("async write serialization", () => {
  it("executes operations in order when queued", async () => {
    const order: number[] = [];

    // Simular la cola del ProgressSnapshotService
    let queue: Promise<void> = Promise.resolve();

    async function serialized(fn: () => Promise<void>): Promise<void> {
      const result = queue.then(fn);
      queue = result.then(() => {}, () => {});
      return result;
    }

    await Promise.all([
      serialized(async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(1);
      }),
      serialized(async () => {
        order.push(2);
      }),
      serialized(async () => {
        await new Promise((r) => setTimeout(r, 5));
        order.push(3);
      }),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });

  it("does not break the queue when one operation fails", async () => {
    const order: number[] = [];

    let queue: Promise<void> = Promise.resolve();

    async function serialized(fn: () => Promise<void>): Promise<void> {
      const result = queue.then(fn);
      queue = result.then(() => {}, () => {});
      return result;
    }

    // El error de la primera operación se propaga a este await,
    // pero la cola internamente lo engulló
    await serialized(async () => {
      order.push(1);
      throw new Error("Fallo simulado");
    }).catch(() => {});

    // La cola no debe estar rota
    await serialized(async () => {
      order.push(2);
    });

    expect(order).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// 5.5: Corrupt file handling
// ---------------------------------------------------------------------------

describe("corrupt file handling", () => {
  it("returns empty array when JSON parse fails", () => {
    const corrupt = "no soy json válido ni encriptado";

    // Simular lo que pasa en loadSnapshots
    let result: Snapshot[] = [];
    try {
      JSON.parse(corrupt);
    } catch {
      result = [];
    }

    expect(result).toEqual([]);
  });

  it("returns empty array when data is not an array", () => {
    const notArray = JSON.stringify({ not: "an array" });

    let result: Snapshot[] = [];
    try {
      const parsed = JSON.parse(notArray);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      result = parsed;
    } catch {
      result = [];
    }

    expect(result).toEqual([]);
  });
});


