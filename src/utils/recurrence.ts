import type { TreeNode, CompletionsMap, VirtualInstance, RecurrenceRule } from "../types";

// ---------------------------------------------------------------------------
// getRecurrenceInstances — generate virtual instances for a given month
// ---------------------------------------------------------------------------

/**
 * Walks the tree (skipping root) and generates VirtualInstance entries
 * for recurring nodes that fall within the given year/month.
 * Completed instances (per completions map) are skipped per R15.
 */
export function getRecurrenceInstances(
  tree: TreeNode,
  completions: CompletionsMap,
  year: number,
  month: number,
): VirtualInstance[] {
  const instances: VirtualInstance[] = [];

  function walk(node: TreeNode): void {
    if (node.recurrence) {
      const generated = generateInstances(node, completions, year, month);
      instances.push(...generated);
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  // Skip root — walk its children
  for (const child of tree.children) {
    walk(child);
  }

  return instances;
}

// ---------------------------------------------------------------------------
// getInstancesInRange — generate virtual instances for a date range
// ---------------------------------------------------------------------------

/**
 * Generates virtual instances for recurring nodes between `from` and `to`
 * (inclusive). Used by dashboard queries.
 */
export function getInstancesInRange(
  tree: TreeNode,
  completions: CompletionsMap,
  from: string,
  to: string,
): VirtualInstance[] {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T00:00:00");
  const instances: VirtualInstance[] = [];

  function walk(node: TreeNode): void {
    if (node.recurrence) {
      const generated = generateInstancesInRange(node, completions, fromDate, toDate);
      instances.push(...generated);
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const child of tree.children) {
    walk(child);
  }

  return instances;
}

// ---------------------------------------------------------------------------
// matchesRecurrence — check if a specific date matches a recurrence rule
// ---------------------------------------------------------------------------

/**
 * Returns true if `date` is a valid recurrence date given the rule and startDate.
 */
export function matchesRecurrence(rule: RecurrenceRule, startDate: string, date: string): boolean {
  const start = new Date(startDate + "T00:00:00");
  const candidate = new Date(date + "T00:00:00");

  if (candidate < start) return false;
  if (rule.endDate && candidate > new Date(rule.endDate + "T00:00:00")) return false;

  const diffDays = Math.round((candidate.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return false;

  if (rule.type === "daily") {
    return diffDays % rule.interval === 0;
  }

  if (rule.type === "weekly") {
    const weeksElapsed = Math.floor(diffDays / 7);
    if (weeksElapsed % rule.interval !== 0) return false;

    // Day-of-week check: 0=Mon..6=Sun
    const jsDay = candidate.getDay();
    const monDay = (jsDay + 6) % 7;
    return rule.daysOfWeek ? rule.daysOfWeek.includes(monDay) : true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// generateInstances — month-scoped generation (for Calendar)
// ---------------------------------------------------------------------------

function generateInstances(
  node: TreeNode,
  completions: CompletionsMap,
  year: number,
  month: number,
): VirtualInstance[] {
  const rule = node.recurrence!;
  const nodeCompletions = completions[node.id] ?? {};

  // Month boundaries
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // Effective start: max(node.startDate, monthStart)
  const nodeStart = new Date(node.startDate + "T00:00:00");
  const effectiveStart = nodeStart > monthStart ? nodeStart : monthStart;

  // Effective end: min(endDate, monthEnd)
  const effectiveEnd = rule.endDate
    ? new Date(rule.endDate + "T00:00:00")
    : monthEnd;

  if (effectiveEnd < effectiveStart) return [];

  const actualEnd = effectiveEnd < monthEnd ? effectiveEnd : monthEnd;

  const instances: VirtualInstance[] = [];
  const current = new Date(effectiveStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (current <= actualEnd) {
    const dateStr = current.toISOString().slice(0, 10);

    if (matchesRecurrence(rule, node.startDate, dateStr)) {
      // Skip completed instances (R15)
      if (!nodeCompletions[dateStr]) {
        const status: "todo" | "missed" = current < today ? "missed" : "todo";
        instances.push({
          id: `${node.id}::${dateStr}`,
          nodeId: node.id,
          date: dateStr,
          title: node.title,
          status,
          isVirtual: true,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return instances;
}

// ---------------------------------------------------------------------------
// generateInstancesInRange — date-range generation (for Dashboard)
// ---------------------------------------------------------------------------

function generateInstancesInRange(
  node: TreeNode,
  completions: CompletionsMap,
  from: Date,
  to: Date,
): VirtualInstance[] {
  const rule = node.recurrence!;
  const nodeCompletions = completions[node.id] ?? {};
  const nodeStart = new Date(node.startDate + "T00:00:00");

  const effectiveStart = nodeStart > from ? nodeStart : from;
  const effectiveEnd = rule.endDate
    ? new Date(rule.endDate + "T00:00:00")
    : to;

  if (effectiveEnd < effectiveStart) return [];

  const actualEnd = effectiveEnd < to ? effectiveEnd : to;

  const instances: VirtualInstance[] = [];
  const current = new Date(effectiveStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (current <= actualEnd) {
    const dateStr = current.toISOString().slice(0, 10);

    if (matchesRecurrence(rule, node.startDate, dateStr)) {
      if (!nodeCompletions[dateStr]) {
        const status: "todo" | "missed" = current < today ? "missed" : "todo";
        instances.push({
          id: `${node.id}::${dateStr}`,
          nodeId: node.id,
          date: dateStr,
          title: node.title,
          status,
          isVirtual: true,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return instances;
}
