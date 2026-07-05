import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TreeNode } from "../types";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { openModal, closeModal, mockTree, treeSubscribers } = vi.hoisted(() => {
  const openModal = vi.fn();
  const closeModal = vi.fn();
  const treeSubscribers: Array<(val: TreeNode) => void> = [];

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const todayStr = `${year}-${month}-${String(now.getDate()).padStart(2, "0")}`;

  const mockTree: TreeNode = {
    id: "root",
    title: "Root",
    expanded: true,
    status: "todo",
    priority: "medium",
    children: [
      {
        id: "calendar-node-1",
        title: "Calendar Task",
        expanded: false,
        status: "doing",
        priority: "high",
        children: [],
        startDate: todayStr,
      },
      {
        id: "no-date-node",
        title: "No Date",
        expanded: false,
        status: "todo",
        priority: "medium",
        children: [],
        startDate: "",
      },
    ],
    startDate: "",
  };

  return { openModal, closeModal, mockTree, treeSubscribers };
});

vi.mock("../stores/treeStore", () => ({
  tree: {
    subscribe: (fn: (val: TreeNode) => void) => {
      treeSubscribers.push(fn);
      fn(mockTree);
      return () => {
        const idx = treeSubscribers.indexOf(fn);
        if (idx >= 0) treeSubscribers.splice(idx, 1);
      };
    },
  },
}));

vi.mock("../stores/modalStore", () => ({
  openModal,
  closeModal,
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { mount, unmount } from "svelte";
import Calendar from "./Calendar.svelte";

/** Wait for pending microtasks to flush. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Calendar node click", () => {
  let target: HTMLDivElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    treeSubscribers.length = 0;
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
    unmount(component as never);
    target.remove();
  });

  it("calls openModal when a calendar node is clicked", async () => {
    component = mount(Calendar, { target });

    await tick();
    await tick();

    // Find node-entry buttons (the buttons that represent nodes in the calendar grid)
    const nodeButtons = target.querySelectorAll<HTMLButtonElement>(".node-entry");
    expect(nodeButtons.length).toBeGreaterThan(0);

    // Click the first visible node
    nodeButtons[0].click();

    // Verify openModal was called with NodeDetailModal-like args
    expect(openModal).toHaveBeenCalledOnce();
    const [componentArg, propsArg] = openModal.mock.calls[0];
    // Component should be NodeDetailModal (we check it's a function/class)
    expect(typeof componentArg).toBe("function");
    // Props should contain nodeId
    expect(propsArg).toHaveProperty("nodeId");
    expect(typeof propsArg.nodeId).toBe("string");
  });
});

describe("Calendar navigation", () => {
  let target: HTMLDivElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    treeSubscribers.length = 0;
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
    unmount(component as never);
    target.remove();
  });

  it("renders the month header with current month and year", async () => {
    component = mount(Calendar, { target });
    await tick();
    await tick();

    const header = target.querySelector<HTMLElement>(".month-title");
    expect(header).toBeTruthy();
    // Should contain the current year (e.g. "2026")
    expect(header!.textContent).toContain(String(new Date().getFullYear()));
  });

  it("navigates to previous month when ◀ is clicked", async () => {
    component = mount(Calendar, { target });
    await tick();
    await tick();

    const navBtns = target.querySelectorAll<HTMLButtonElement>(".nav-btn");
    expect(navBtns.length).toBe(2);

    // Click ◀ (first nav button)
    navBtns[0].click();
    await tick();

    // Header should reflect the new month — the year might have changed if
    // we're in January, but the button should still work without error
    const header = target.querySelector<HTMLElement>(".month-title");
    expect(header).toBeTruthy();
    expect(header!.textContent).toBeTruthy();
  });

  it("navigates to next month when ▶ is clicked", async () => {
    component = mount(Calendar, { target });
    await tick();
    await tick();

    const navBtns = target.querySelectorAll<HTMLButtonElement>(".nav-btn");
    expect(navBtns.length).toBe(2);

    // Click ▶ (second nav button)
    navBtns[1].click();
    await tick();

    const header = target.querySelector<HTMLElement>(".month-title");
    expect(header).toBeTruthy();
    expect(header!.textContent).toBeTruthy();
  });

  it("has a Hoy button that resets to current month", async () => {
    component = mount(Calendar, { target });
    await tick();
    await tick();

    const todayBtn = target.querySelector<HTMLButtonElement>(".today-btn");
    expect(todayBtn).toBeTruthy();
    expect(todayBtn!.textContent).toBe("Hoy");

    // Navigate away
    const navBtns = target.querySelectorAll<HTMLButtonElement>(".nav-btn");
    navBtns[0].click(); // prev month
    await tick();

    // Click Hoy
    todayBtn!.click();
    await tick();

    const header = target.querySelector<HTMLElement>(".month-title");
    expect(header).toBeTruthy();
    // Should be back to current month/year
    expect(header!.textContent).toContain(String(new Date().getFullYear()));
  });
});

describe("Calendar overflow", () => {
  let target: HTMLDivElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    treeSubscribers.length = 0;
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
    unmount(component as never);
    target.remove();
  });

  it("shows +N más when a day has more than 3 nodes", async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Override the tree to have 5 nodes on today's date
    const overflowingTree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: Array.from({ length: 5 }, (_, i) => ({
        id: `overflow-node-${i}`,
        title: `Tarea ${i + 1}`,
        expanded: false,
        status: "todo" as const,
        priority: "low" as const,
        children: [] as TreeNode[],
        startDate: todayStr,
      })),
      startDate: "",
    };

    // Override the tree subscriber to push the overflowing tree
    treeSubscribers.length = 0;

    component = mount(Calendar, { target });

    // Push the overflowing tree
    treeSubscribers.forEach((fn) => fn(overflowingTree));
    await tick();
    await tick();

    // Should see an overflow button
    const overflowBtn = target.querySelector<HTMLButtonElement>(".overflow-btn");
    expect(overflowBtn).toBeTruthy();
    expect(overflowBtn!.textContent).toContain("más");
  });

  it("expands to show all entries when +N más is clicked", async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    const overflowingTree: TreeNode = {
      id: "root",
      title: "Root",
      expanded: true,
      status: "todo",
      priority: "medium",
      children: Array.from({ length: 5 }, (_, i) => ({
        id: `overflow-node-${i}`,
        title: `Tarea ${i + 1}`,
        expanded: false,
        status: "todo" as const,
        priority: "low" as const,
        children: [] as TreeNode[],
        startDate: todayStr,
      })),
      startDate: "",
    };

    treeSubscribers.length = 0;
    component = mount(Calendar, { target });
    treeSubscribers.forEach((fn) => fn(overflowingTree));
    await tick();
    await tick();

    // Click the overflow button to expand
    const overflowBtn = target.querySelector<HTMLButtonElement>(".overflow-btn");
    expect(overflowBtn).toBeTruthy();
    overflowBtn!.click();
    await tick();

    // Now all 5 node entries should be visible
    const nodeEntries = target.querySelectorAll<HTMLElement>(".node-entry");
    expect(nodeEntries.length).toBe(5);

    // Should now show "Mostrar menos"
    const showLess = target.querySelector<HTMLButtonElement>(".overflow-btn");
    expect(showLess).toBeTruthy();
    expect(showLess!.textContent).toContain("Mostrar");
  });
});
