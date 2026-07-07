import type { TreeNode } from "../types";

export type SearchResult = {
  id: string;
  title: string;
  matchField: "title" | "comments";
  matchSnippet?: string;
};

function getMatchSnippet(text: string, query: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return text.slice(0, 80);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 50);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet += "...";
  return snippet;
}

export function searchNodes(tree: TreeNode, query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  function walk(node: TreeNode) {
    const titleMatch = node.title.toLowerCase().includes(q);

    if (titleMatch) {
      results.push({ id: node.id, title: node.title, matchField: "title" });
    }

    if (node.comments && node.comments.toLowerCase().includes(q)) {
      if (!results.some((r) => r.id === node.id)) {
        const snippet = getMatchSnippet(node.comments, q);
        results.push({ id: node.id, title: node.title, matchField: "comments", matchSnippet: snippet });
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(tree);
  return results;
}
