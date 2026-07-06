import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { query, results } from "./searchStore";
import { tree } from "./treeStore";
import type { TreeNode } from "../types";

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
        title: "Configurar servidor",
        expanded: false,
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
      },
    ],
    startDate: "2026-01-01",
  };
}

describe("searchStore", () => {
  beforeEach(() => {
    query.set("");
    tree.set(buildTestTree());
  });

  describe("query-reactive result filtering", () => {
    it("returns empty results when query is empty", () => {
      expect(get(results)).toHaveLength(0);
    });

    it("filters results by title", () => {
      query.set("servidor");
      const res = get(results);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("child1");
    });

    it("filters results by comments", () => {
      query.set("Docker");
      const res = get(results);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("child1");
      expect(res[0].matchField).toBe("comments");
    });

    it("returns empty array when no match", () => {
      query.set("zzzznotfound");
      expect(get(results)).toHaveLength(0);
    });

    it("reactively updates results when tree changes", () => {
      query.set("servidor");
      expect(get(results)).toHaveLength(1);

      // Replace tree with one that has no match
      const emptyTree: TreeNode = {
        id: "root",
        title: "Empty",
        expanded: true,
        status: "todo",
        priority: "medium",
        children: [],
        startDate: "2026-01-01",
      };
      tree.set(emptyTree);
      expect(get(results)).toHaveLength(0);
    });

    it("reactively updates results when query changes", () => {
      query.set("servidor");
      expect(get(results)).toHaveLength(1);

      query.set("base de datos");
      expect(get(results)).toHaveLength(1);
      expect(get(results)[0].id).toBe("child2");
    });
  });
});
