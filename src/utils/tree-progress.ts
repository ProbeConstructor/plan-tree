import type { TreeNode, VirtualInstance, CompletionsMap } from "../types";

export function calculateNodeProgress(node: TreeNode): number {
  if (node.children.length === 0) {
    if (node.status === "done") return 100;
    if (node.status === "doing") return 50;
    return 0;
  }

  const total = node.children.length;

  const sum = node.children.reduce(
    (acc, child) => acc + calculateNodeProgress(child),
    0,
  );

  return Math.round(sum / total);
}

export function calculateGlobalProgress(node: TreeNode): number {
  return calculateNodeProgress(node);
}

export function calculateProgressMap(root: TreeNode): Map<string, number> {
  const map = new Map<string, number>();
  function visit(node: TreeNode): number {
    let progress: number;
    if (node.children.length === 0) {
      switch (node.status) {
        case "done":
          progress = 100;
          break;
        case "doing":
          progress = 50;
          break;
        default:
          progress = 0;
      }
    } else {
      let total = 0;
      for (const child of node.children) {
        total += visit(child);
      }
      progress = Math.round(total / node.children.length);
    }
    map.set(node.id, progress);
    return progress;
  }
  visit(root);
  return map;
}

export function getDirectBranches(
  root: TreeNode,
): { id: string; title: string; progress: number }[] {
  return root.children.map((child) => ({
    id: child.id,
    title: child.title,
    progress: calculateNodeProgress(child),
  }));
}

export function getPriorityBreakdown(root: TreeNode) {
  const breakdown = {
    critical: { total: 0, done: 0 },
    high: { total: 0, done: 0 },
    medium: { total: 0, done: 0 },
    low: { total: 0, done: 0 },
  };

  function walk(node: TreeNode) {
    if (breakdown[node.priority]) {
      breakdown[node.priority].total++;
      if (node.status === "done") breakdown[node.priority].done++;
    }
    node.children.forEach(walk);
  }

  root.children.forEach(walk); // no contamos el root mismo

  return breakdown;
}

export function getStatusBreakdown(root: TreeNode): { todo: number; doing: number; done: number } {
  const breakdown = { todo: 0, doing: 0, done: 0 };

  function walk(node: TreeNode) {
    if (node.status === "todo") breakdown.todo++;
    else if (node.status === "doing") breakdown.doing++;
    else if (node.status === "done") breakdown.done++;
    node.children.forEach(walk);
  }

  walk(root);
  return breakdown;
}

export function getTodayNodes(
  tree: TreeNode,
  completions?: CompletionsMap,
): (TreeNode | VirtualInstance)[] {
  function flatten(node: TreeNode): TreeNode[] {
    return [node, ...node.children.flatMap(flatten)];
  }

  const today = new Date().toISOString().slice(0, 10);

  const treeNodes = tree.children
    .flatMap(flatten)
    .filter(
      (node) =>
        node.status !== "done" &&
        (node.priority === "critical" || node.priority === "high"),
    );

  if (!completions) return treeNodes;

  const virtuals: VirtualInstance[] = [];
  const c = completions;
  function walk(node: TreeNode): void {
    if (node.recurrence && node.startDate <= today) {
      if (!c[node.id]?.[today]) {
        virtuals.push({
          id: `${node.id}::${today}`,
          nodeId: node.id,
          date: today,
          title: node.title,
          status: "todo",
          isVirtual: true,
        });
      }
    }
    for (const child of node.children) walk(child);
  }
  for (const child of tree.children) walk(child);

  return [...treeNodes, ...virtuals];
}

export function getOverdueAndUpcoming(
  root: TreeNode,
  upcomingDays = 5,
  completions?: CompletionsMap,
): { overdue: (TreeNode | VirtualInstance)[]; upcoming: (TreeNode | VirtualInstance)[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + upcomingDays);
  const limitStr = limit.toISOString().slice(0, 10);

  const overdue: (TreeNode | VirtualInstance)[] = [];
  const upcoming: (TreeNode | VirtualInstance)[] = [];

  function walk(node: TreeNode) {
    if (node.dueDate && node.status !== "done") {
      const due = new Date(node.dueDate);
      if (due < today) overdue.push(node);
      else if (due <= limit) upcoming.push(node);
    }
    node.children.forEach(walk);
  }

  root.children.forEach(walk);

  // Add recurring virtual instances
  if (completions) {
    const c = completions;
    function walkRecurring(node: TreeNode): void {
      if (node.recurrence) {
        const start = new Date(node.startDate + "T00:00:00");
        if (start > limit) return;

        const checkFrom = start < today ? start : today;
        const checkEnd = new Date(limitStr + "T00:00:00");

        const current = new Date(checkFrom);
        while (current <= checkEnd) {
          const dateStr = current.toISOString().slice(0, 10);
          if (dateStr >= node.startDate) {
            if (node.recurrence.endDate && dateStr > node.recurrence.endDate) break;

            let matches = false;
            if (node.recurrence.type === "daily") {
              const diffDays = Math.round((current.getTime() - start.getTime()) / 86400000);
              if (diffDays >= 0 && diffDays % node.recurrence.interval === 0) matches = true;
            } else if (node.recurrence.type === "weekly") {
              const diffDays = Math.round((current.getTime() - start.getTime()) / 86400000);
              if (diffDays >= 0) {
                const weeksElapsed = Math.floor(diffDays / 7);
                if (weeksElapsed % node.recurrence.interval === 0) {
                  const jsDay = current.getDay();
                  const monDay = (jsDay + 6) % 7;
                  if (node.recurrence.daysOfWeek ? node.recurrence.daysOfWeek.includes(monDay) : true) {
                    matches = true;
                  }
                }
              }
            }

            if (matches && !c[node.id]?.[dateStr]) {
              const vi: VirtualInstance = {
                id: `${node.id}::${dateStr}`,
                nodeId: node.id,
                date: dateStr,
                title: node.title,
                status: current < today ? "missed" : "todo",
                isVirtual: true,
              };
              if (current < today) {
                overdue.push(vi);
              } else {
                upcoming.push(vi);
              }
            }
          }
          current.setDate(current.getDate() + 1);
        }
      }
      for (const child of node.children) walkRecurring(child);
    }
    for (const child of root.children) walkRecurring(child);
  }

  overdue.sort((a, b) => {
    const da = "date" in a ? a.date : (a as TreeNode).dueDate ?? "";
    const db = "date" in b ? b.date : (b as TreeNode).dueDate ?? "";
    return da < db ? -1 : 1;
  });
  upcoming.sort((a, b) => {
    const da = "date" in a ? a.date : (a as TreeNode).dueDate ?? "";
    const db = "date" in b ? b.date : (b as TreeNode).dueDate ?? "";
    return da < db ? -1 : 1;
  });

  return { overdue, upcoming };
}
