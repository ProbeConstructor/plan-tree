import { describe, it, expect } from "vitest";
import type { TreeNode } from "../types";
import {
  getMonthGrid,
  groupNodesByDate,
  formatMonthYear,
  getWeekDays,
  isToday,
  getStatusDotColor,
  getCellDisplayInfo,
} from "./calendarUtils";

// ---------------------------------------------------------------------------
// getMonthGrid
// ---------------------------------------------------------------------------

describe("getMonthGrid", () => {
  it("returns exactly 6 rows × 7 cols", () => {
    const grid = getMonthGrid(2026, 0);
    expect(grid.length).toBe(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
    }
  });

  it("week starts on Monday (Jan 2026 starts on Thursday → offset 3)", () => {
    const grid = getMonthGrid(2026, 0);
    // Jan 1 2026 is Thursday → Monday-start offset = 3
    // First week: [null, null, null, 1, 2, 3, 4]
    expect(grid[0][0]).toBeNull(); // Monday
    expect(grid[0][1]).toBeNull(); // Tuesday
    expect(grid[0][2]).toBeNull(); // Wednesday
    expect(grid[0][3]).toBe(1);    // Thursday
    expect(grid[0][4]).toBe(2);    // Friday
    expect(grid[0][5]).toBe(3);    // Saturday
    expect(grid[0][6]).toBe(4);    // Sunday
    // First Monday is Jan 5 in week 1 (row index 1)
    expect(grid[1][0]).toBe(5);
  });

  it("first day of month appears in correct column", () => {
    // Jan 2026: Thu → col 3
    const gridJan = getMonthGrid(2026, 0);
    expect(gridJan[0][3]).toBe(1);

    // Feb 2026: Sun → col 6
    const gridFeb = getMonthGrid(2026, 1);
    expect(gridFeb[0][6]).toBe(1);

    // Mar 2026: Sun → col 6
    const gridMar = getMonthGrid(2026, 2);
    expect(gridMar[0][6]).toBe(1);

    // Dec 2026: Tue → col 1
    const gridDec = getMonthGrid(2026, 11);
    expect(gridDec[0][1]).toBe(1);
  });

  it("last day of month in correct position", () => {
    // Jan 31 2026: Saturday → col 5
    const gridJan = getMonthGrid(2026, 0);
    expect(gridJan[4][5]).toBe(31);
    expect(gridJan[4][6]).toBeNull();

    // Feb 28 2026: Saturday → col 5
    const gridFeb = getMonthGrid(2026, 1);
    expect(gridFeb[4][5]).toBe(28);
    expect(gridFeb[4][6]).toBeNull();
  });

  it("has null padding in first and last weeks", () => {
    const grid = getMonthGrid(2026, 0);
    // First 3 cols of first week are null (Mon-Wed before Jan 1)
    expect(grid[0].slice(0, 3)).toEqual([null, null, null]);
    // Row 5 is entirely null (6th week padding)
    expect(grid[5]).toEqual([null, null, null, null, null, null, null]);
  });

  it("handles December → January wrap correctly", () => {
    // Dec 2026: 31 days, starts Tuesday (col 1)
    // Row 4 should have Dec 31 at the correct position
    const grid = getMonthGrid(2026, 11);
    // Dec 1 = Tue → col 1, so Dec 31 = Thu → (1 + 30) % 7 = 3 → col 3
    expect(grid[4][3]).toBe(31);
    expect(grid[4][4]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// groupNodesByDate
// ---------------------------------------------------------------------------

describe("groupNodesByDate", () => {
  it("includes node with startDate only in target month", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "start-only",
          title: "Start Only",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-03-15",
        },
      ],
      startDate: "2026-01-01",
    };

    const result = groupNodesByDate(tree, 2026, 2); // March
    expect(result.size).toBe(1);
    expect(result.get("2026-03-15")).toHaveLength(1);
    expect(result.get("2026-03-15")![0].id).toBe("start-only");
  });

  it("includes node with dueDate in target month even when startDate is outside", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "due-only",
          title: "Due Only",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-02-01",   // February — outside target
          dueDate: "2026-03-20",     // March — inside target
        },
      ],
      startDate: "2026-01-01",
    };

    const result = groupNodesByDate(tree, 2026, 2); // March
    expect(result.size).toBe(1);
    expect(result.get("2026-03-20")).toHaveLength(1);
    expect(result.get("2026-03-20")![0].id).toBe("due-only");
  });

  it("creates separate entries for startDate and dueDate on different days", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "multi-date",
          title: "Multi Date",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-03-15",
          dueDate: "2026-03-20",
        },
      ],
      startDate: "2026-01-01",
    };

    const result = groupNodesByDate(tree, 2026, 2); // March
    expect(result.size).toBe(2);
    expect(result.get("2026-03-15")).toHaveLength(1);
    expect(result.get("2026-03-15")![0].id).toBe("multi-date");
    expect(result.get("2026-03-20")).toHaveLength(1);
    expect(result.get("2026-03-20")![0].id).toBe("multi-date");
  });

  it("deduplicates when startDate and dueDate are the same day", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "same-day",
          title: "Same Day",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-03-15",
          dueDate: "2026-03-15",
        },
      ],
      startDate: "2026-01-01",
    };

    const result = groupNodesByDate(tree, 2026, 2); // March
    expect(result.size).toBe(1);
    expect(result.get("2026-03-15")).toHaveLength(1);
    expect(result.get("2026-03-15")![0].id).toBe("same-day");
  });

  it("never includes the root node", () => {
    // Only the root has a date in the target month
    const tree: TreeNode = {
      id: "root",
      title: "Root",
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
          startDate: "2026-02-01", // February — outside target
        },
      ],
      startDate: "2026-01-15", // January — would match if root were included
    };

    const result = groupNodesByDate(tree, 2026, 0); // January
    expect(result.size).toBe(0);
  });

  it("returns empty Map for empty tree", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [],
      startDate: "2026-01-01",
    };

    expect(groupNodesByDate(tree, 2026, 0).size).toBe(0);
  });

  it("filters only dates within the requested month", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "march",
          title: "March Node",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-03-15",
        },
        {
          id: "april",
          title: "April Node",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-04-20",
        },
      ],
      startDate: "2026-01-01",
    };

    const result = groupNodesByDate(tree, 2026, 2); // March only
    expect(result.size).toBe(1);
    expect(result.has("2026-03-15")).toBe(true);
    expect(result.has("2026-04-20")).toBe(false);
  });

  it("walks children recursively (depth-first)", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "parent",
          title: "Parent",
          expanded: true,
          status: "todo",
          priority: "medium",
          children: [
            {
              id: "deep-child",
              title: "Deep",
              expanded: false,
              status: "todo",
              priority: "medium",
              children: [],
              startDate: "2026-03-15",
            },
          ],
          startDate: "2026-02-01", // outside target
        },
      ],
      startDate: "2026-01-01",
    };

    const result = groupNodesByDate(tree, 2026, 2);
    expect(result.get("2026-03-15")).toHaveLength(1);
    expect(result.get("2026-03-15")![0].id).toBe("deep-child");
  });

  it("excludes nodes with empty startDate and no dueDate", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "empty-dates",
          title: "Empty",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "",  // empty string
        },
      ],
      startDate: "",
    };

    const result = groupNodesByDate(tree, 2026, 2);
    expect(result.size).toBe(0);
  });

  it("excludes dates from a different year even when month matches", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "last-year",
          title: "Last Year",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2025-03-15", // March 2025
        },
      ],
      startDate: "",
    };

    const result = groupNodesByDate(tree, 2026, 2); // March 2026
    expect(result.size).toBe(0);
  });

  it("includes only the date that falls in the target year+month when dates span years", () => {
    const tree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: [
        {
          id: "cross-year",
          title: "Cross Year",
          expanded: false,
          status: "todo",
          priority: "medium",
          children: [],
          startDate: "2026-03-15",
          dueDate: "2027-03-20", // different year
        },
      ],
      startDate: "",
    };

    // Query March 2026 — only startDate matches
    const result2026 = groupNodesByDate(tree, 2026, 2);
    expect(result2026.size).toBe(1);
    expect(result2026.has("2026-03-15")).toBe(true);
    expect(result2026.has("2027-03-20")).toBe(false);

    // Query March 2027 — only dueDate matches
    const result2027 = groupNodesByDate(tree, 2027, 2);
    expect(result2027.size).toBe(1);
    expect(result2027.has("2027-03-20")).toBe(true);
    expect(result2027.has("2026-03-15")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatMonthYear
// ---------------------------------------------------------------------------

describe("formatMonthYear", () => {
  it("returns 'julio 2026' for month 6 (July)", () => {
    expect(formatMonthYear(2026, 6)).toBe("julio 2026");
  });

  it("returns 'enero 2026' for month 0 (January)", () => {
    expect(formatMonthYear(2026, 0)).toBe("enero 2026");
  });

  it("returns 'diciembre 2026' for month 11 (December)", () => {
    expect(formatMonthYear(2026, 11)).toBe("diciembre 2026");
  });
});

// ---------------------------------------------------------------------------
// getWeekDays
// ---------------------------------------------------------------------------

describe("getWeekDays", () => {
  it("returns abbreviated Spanish day names starting Monday", () => {
    expect(getWeekDays()).toEqual(["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]);
  });
});

// ---------------------------------------------------------------------------
// isToday
// ---------------------------------------------------------------------------

describe("isToday", () => {
  it("returns true for today's date", () => {
    const today = new Date();
    expect(isToday(today.getFullYear(), today.getMonth(), today.getDate())).toBe(true);
  });

  it("returns false for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())).toBe(false);
  });

  it("returns false for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStatusDotColor
// ---------------------------------------------------------------------------

describe("getStatusDotColor", () => {
  it("returns gray for 'todo'", () => {
    expect(getStatusDotColor("todo")).toBe("var(--text-muted)");
  });

  it("returns blue for 'doing'", () => {
    expect(getStatusDotColor("doing")).toBe("var(--accent-primary)");
  });

  it("returns green for 'done'", () => {
    expect(getStatusDotColor("done")).toBe("var(--accent-success)");
  });
});

// ---------------------------------------------------------------------------
// getCellDisplayInfo
// ---------------------------------------------------------------------------

describe("getCellDisplayInfo", () => {
  const nodes: TreeNode[] = [
    { id: "1", title: "Node 1", expanded: false, status: "todo", priority: "medium", children: [], startDate: "" },
    { id: "2", title: "Node 2", expanded: false, status: "doing", priority: "medium", children: [], startDate: "" },
    { id: "3", title: "Node 3", expanded: false, status: "done", priority: "medium", children: [], startDate: "" },
    { id: "4", title: "Node 4", expanded: false, status: "todo", priority: "medium", children: [], startDate: "" },
    { id: "5", title: "Node 5", expanded: false, status: "todo", priority: "medium", children: [], startDate: "" },
  ];

  it("returns all nodes when not exceeding maxVisible", () => {
    const result = getCellDisplayInfo(nodes.slice(0, 2), 3, false);
    expect(result.visible).toHaveLength(2);
    expect(result.overflow).toBe(0);
  });

  it("truncates to maxVisible and reports overflow count when not expanded", () => {
    const result = getCellDisplayInfo(nodes, 3, false);
    expect(result.visible).toHaveLength(3);
    expect(result.visible[0].id).toBe("1");
    expect(result.visible[1].id).toBe("2");
    expect(result.visible[2].id).toBe("3");
    expect(result.overflow).toBe(2);
  });

  it("returns all nodes and zero overflow when expanded", () => {
    const result = getCellDisplayInfo(nodes, 3, true);
    expect(result.visible).toHaveLength(5);
    expect(result.overflow).toBe(0);
  });

  it("returns empty arrays and zero overflow for empty input", () => {
    const result = getCellDisplayInfo([], 3, false);
    expect(result.visible).toEqual([]);
    expect(result.overflow).toBe(0);
  });

  it("returns zero overflow when node count exactly equals maxVisible", () => {
    const result = getCellDisplayInfo(nodes.slice(0, 3), 3, false);
    expect(result.visible).toHaveLength(3);
    expect(result.overflow).toBe(0);
  });
});
