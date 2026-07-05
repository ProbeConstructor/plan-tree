import type { TreeNode } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES: string[] = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const WEEK_DAYS_SHORT: string[] = [
  "lun", "mar", "mié", "jue", "vie", "sáb", "dom",
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
): Map<string, TreeNode[]> {
  const result = new Map<string, TreeNode[]>();
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
  return `${MONTH_NAMES[month]} ${year}`;
}

// ---------------------------------------------------------------------------
// getWeekDays
// ---------------------------------------------------------------------------

/**
 * Returns abbreviated Spanish day names starting with Monday.
 */
export function getWeekDays(): string[] {
  return [...WEEK_DAYS_SHORT];
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
export function getStatusDotColor(status: TreeNode["status"]): string {
  const colors: Record<TreeNode["status"], string> = {
    todo: "#6b7280",
    doing: "#3b82f6",
    done: "#22c55e",
  };
  return colors[status];
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
  nodes: TreeNode[],
  maxVisible: number,
  expanded: boolean,
): { visible: TreeNode[]; overflow: number } {
  if (expanded) {
    return { visible: nodes, overflow: 0 };
  }
  return {
    visible: nodes.slice(0, maxVisible),
    overflow: Math.max(0, nodes.length - maxVisible),
  };
}
