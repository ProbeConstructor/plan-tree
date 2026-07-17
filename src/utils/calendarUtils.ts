import type { TreeNode, VirtualInstance } from "../types";
import { get } from "svelte/store";
import { t } from "svelte-i18n";

// ---------------------------------------------------------------------------
// Constants (derived from i18n)
// ---------------------------------------------------------------------------

const MONTH_KEYS = [
  "calendar.months.january",
  "calendar.months.february",
  "calendar.months.march",
  "calendar.months.april",
  "calendar.months.may",
  "calendar.months.june",
  "calendar.months.july",
  "calendar.months.august",
  "calendar.months.september",
  "calendar.months.october",
  "calendar.months.november",
  "calendar.months.december",
];

const DAY_KEYS = [
  "calendar.days.monday",
  "calendar.days.tuesday",
  "calendar.days.wednesday",
  "calendar.days.thursday",
  "calendar.days.friday",
  "calendar.days.saturday",
  "calendar.days.sunday",
];

// ---------------------------------------------------------------------------
// getMonthGrid
// ---------------------------------------------------------------------------

/**
 * Returns a 6×7 2D array (weeks × days) for the given month, Monday start.
 * Cells outside the month are null.
 */
export function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1);
  const jsDay = firstDay.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const startOffset = (jsDay + 6) % 7; // Monday=0, Tuesday=1, …, Sunday=6

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid: (number | null)[][] = [];
  let day = 1;

  for (let week = 0; week < 6; week++) {
    const row: (number | null)[] = [];
    for (let col = 0; col < 7; col++) {
      if ((week === 0 && col < startOffset) || day > daysInMonth) {
        row.push(null);
      } else {
        row.push(day);
        day++;
      }
    }
    grid.push(row);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// groupNodesByDate
// ---------------------------------------------------------------------------

/**
 * Walks the tree depth-first (skipping root) and groups nodes by date.
 * Only dates within the requested year/month are included.
 * Uses a Set internally to deduplicate when startDate === dueDate.
 */
export function groupNodesByDate(
  tree: TreeNode,
  year: number,
  month: number,
  virtuals?: VirtualInstance[],
): Map<string, (TreeNode | VirtualInstance)[]> {
  const result = new Map<string, (TreeNode | VirtualInstance)[]>();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  function walk(node: TreeNode): void {
    // Use a Set to dedupe when startDate === dueDate on the same day
    const dateSet = new Set<string>();

    if (node.startDate && node.startDate.startsWith(prefix)) {
      dateSet.add(node.startDate);
    }
    if (node.dueDate && node.dueDate.startsWith(prefix)) {
      dateSet.add(node.dueDate);
    }

    for (const dateKey of dateSet) {
      if (!result.has(dateKey)) {
        result.set(dateKey, []);
      }
      result.get(dateKey)!.push(node);
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  // Skip root — walk its children
  for (const child of tree.children) {
    walk(child);
  }

  // Merge virtual instances into the same map
  if (virtuals) {
    for (const v of virtuals) {
      if (!result.has(v.date)) {
        result.set(v.date, []);
      }
      result.get(v.date)!.push(v);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// formatMonthYear
// ---------------------------------------------------------------------------

/**
 * Returns a Spanish-formatted month and year string, e.g. "julio 2026".
 * Month is 0-indexed.
 */
export function formatMonthYear(year: number, month: number): string {
  return `${get(t)(MONTH_KEYS[month])} ${year}`;
}

// ---------------------------------------------------------------------------
// getWeekDays
// ---------------------------------------------------------------------------

/**
 * Returns abbreviated Spanish day names starting with Monday.
 */
export function getWeekDays(): string[] {
  return DAY_KEYS.map((key) => get(t)(key));
}

// ---------------------------------------------------------------------------
// isToday
// ---------------------------------------------------------------------------

/**
 * Returns true if the given date (year, month, day) matches the current date.
 * Month is 0-indexed.
 */
export function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

// ---------------------------------------------------------------------------
// getStatusDotColor
// ---------------------------------------------------------------------------

/**
 * Returns the hex color for a status dot indicator.
 * - todo: gray (#6b7280)
 * - doing: blue (#3b82f6)
 * - done: green (#22c55e)
 */
export function getStatusDotColor(status: string): string {
  const colors: Record<string, string> = {
    todo: "var(--text-muted)",
    doing: "var(--accent-primary)",
    done: "var(--accent-success)",
    missed: "var(--accent-danger)",
  };
  return colors[status] ?? "var(--text-muted)";
}

// ---------------------------------------------------------------------------
// getCellDisplayInfo
// ---------------------------------------------------------------------------

/**
 * Determines which nodes to show in a calendar cell and how many overflow.
 *
 * @param nodes     All nodes for that date
 * @param maxVisible Maximum nodes to show when collapsed (e.g. 3)
 * @param expanded  Whether the cell has been expanded via "+N más"
 * @returns An object with `visible` nodes and `overflow` count
 */
export function getCellDisplayInfo(
  nodes: (TreeNode | VirtualInstance)[],
  maxVisible: number,
  expanded: boolean,
): { visible: (TreeNode | VirtualInstance)[]; overflow: number } {
  if (expanded) {
    return { visible: nodes, overflow: 0 };
  }
  return {
    visible: nodes.slice(0, maxVisible),
    overflow: Math.max(0, nodes.length - maxVisible),
  };
}
