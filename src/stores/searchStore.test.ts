import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { query, isOpen, results, openSearch, closeSearch } from "./searchStore";
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
    // Reset store state before each test
    closeSearch();
    tree.set(buildTestTree());
  });

  describe("openSearch / closeSearch", () => {
    it("openSearch sets isOpen to true and clears query", () => {
      query.set("something");
      openSearch();
      expect(get(isOpen)).toBe(true);
      expect(get(query)).toBe("");
    });

    it("closeSearch sets isOpen to false and clears query", () => {
      openSearch();
      query.set("test");
      closeSearch();
      expect(get(isOpen)).toBe(false);
      expect(get(query)).toBe("");
    });
  });

  describe("query-reactive result filtering", () => {
    it("returns empty results when query is empty", () => {
      openSearch();
      expect(get(results)).toHaveLength(0);
    });

    it("filters results by title", () => {
      openSearch();
      query.set("servidor");
      const res = get(results);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("child1");
    });

    it("filters results by comments", () => {
      openSearch();
      query.set("Docker");
      const res = get(results);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("child1");
      expect(res[0].matchField).toBe("comments");
    });

    it("returns empty array when no match", () => {
      openSearch();
      query.set("zzzznotfound");
      expect(get(results)).toHaveLength(0);
    });

    it("reactively updates results when tree changes", () => {
      openSearch();
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
      openSearch();
      query.set("servidor");
      expect(get(results)).toHaveLength(1);

      query.set("base de datos");
      expect(get(results)).toHaveLength(1);
      expect(get(results)[0].id).toBe("child2");
    });
  });
});
