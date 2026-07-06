import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TreeNode } from "../types";

// ---------------------------------------------------------------------------
// Mock de Tauri — necesario para que los imports dinámicos funcionen en vitest
// ---------------------------------------------------------------------------

const mockFs: Record<string, string> = {};

vi.mock("@tauri-apps/plugin-fs", () => {
  return {
    readTextFile: vi.fn(async (path: string) => {
      const content = mockFs[path];
      if (content === undefined) throw new Error("ENOENT");
      return content;
    }),
    writeTextFile: vi.fn(async (path: string, content: string) => {
      mockFs[path] = content;
    }),
    mkdir: vi.fn(async () => {}),
    remove: vi.fn(async (path: string) => {
      delete mockFs[path];
    }),
    rename: vi.fn(async (oldPath: string, newPath: string) => {
      mockFs[newPath] = mockFs[oldPath];
      delete mockFs[oldPath];
    }),
    BaseDirectory: { AppData: 0 },
  };
});

vi.mock("./vaultManager", () => ({
  encryptText: vi.fn(async (x: string) => x),
  decryptText: vi.fn(async (x: string) => x),
}));

vi.mock("./profileManager", () => ({
  activeProfileDir: vi.fn(() => "/mock/profile"),
}));

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

// ---------------------------------------------------------------------------
// 5.4: capture() + loadSnapshots() round-trip
// ---------------------------------------------------------------------------

describe("capture + loadSnapshots round-trip", () => {
  beforeEach(() => {
    // Limpiar el FS simulado antes de cada test
    for (const key of Object.keys(mockFs)) {
      delete mockFs[key];
    }
  });

  it("persists and retrieves snapshots correctly", async () => {
    const { progressSnapshot } = await import("../services/progressSnapshotService");

    const tree = buildTestTree();

    // Capturar 3 snapshots
    await progressSnapshot.capture("TestProject", tree);
    await progressSnapshot.capture("TestProject", tree);
    await progressSnapshot.capture("TestProject", tree);

    // Cargar todos (usamos año/mes actual en UTC)
    const now = new Date();
    const result = await progressSnapshot.loadSnapshots(
      "TestProject",
      now.getUTCFullYear(),
      now.getUTCMonth(),
    );

    expect(result).toHaveLength(3);
    expect(result[0].totalNodes).toBe(5);
    expect(result[1].globalProgress).toBe(25);
    expect(result[2].branchProgress).toHaveLength(2);
  });

  it("returns empty array when no snapshots exist", async () => {
    const { progressSnapshot } = await import("../services/progressSnapshotService");

    const result = await progressSnapshot.loadSnapshots("NonExistent", 2026, 6);
    expect(result).toEqual([]);
  });

  it("filters snapshots by month", async () => {
    const { progressSnapshot } = await import("../services/progressSnapshotService");
    const tree = buildTestTree();

    await progressSnapshot.capture("TestProject", tree);
    await progressSnapshot.capture("TestProject", tree);

    // Buscar en otro mes — no debería encontrar nada
    const otherMonth = new Date().getUTCMonth() === 0 ? 6 : 0;
    const otherYear = new Date().getUTCFullYear();
    const result = await progressSnapshot.loadSnapshots("TestProject", otherYear, otherMonth);

    // Solo si el mes actual NO es el mes alternativo
    if (new Date().getUTCMonth() !== otherMonth) {
      expect(result).toHaveLength(0);
    }
  });

  it("renameProject renames the progress file", async () => {
    const { progressSnapshot } = await import("../services/progressSnapshotService");
    const tree = buildTestTree();

    await progressSnapshot.capture("OldName", tree);
    await progressSnapshot.renameProject("OldName", "NewName");

    // Cargar con nombre nuevo debería funcionar
    const now = new Date();
    const result = await progressSnapshot.loadSnapshots("NewName", now.getUTCFullYear(), now.getUTCMonth());
    expect(result).toHaveLength(1);

    // Cargar con nombre viejo debería dar vacío
    const oldResult = await progressSnapshot.loadSnapshots("OldName", now.getUTCFullYear(), now.getUTCMonth());
    expect(oldResult).toEqual([]);
  });

  it("deleteProject removes the progress file", async () => {
    const { progressSnapshot } = await import("../services/progressSnapshotService");
    const tree = buildTestTree();

    await progressSnapshot.capture("ToDelete", tree);
    await progressSnapshot.deleteProject("ToDelete");

    const now = new Date();
    const result = await progressSnapshot.loadSnapshots("ToDelete", now.getUTCFullYear(), now.getUTCMonth());
    expect(result).toEqual([]);
  });

  it("corrupt file returns empty array gracefully", async () => {
    // Simular un archivo corrupto
    mockFs["some/corrupt.progress.plan"] = "::: BASURA :::";

    const { progressSnapshot } = await import("../services/progressSnapshotService");

    // loadSnapshots debe devolver [] sin lanzar
    const result = await progressSnapshot.loadSnapshots("corrupt", 2026, 6);
    expect(result).toEqual([]);
  });
});
