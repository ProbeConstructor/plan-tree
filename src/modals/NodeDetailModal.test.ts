import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TreeNode } from "../types";

/** Wait for pending microtasks (Svelte reactive updates) to flush. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.mock factories are hoisted to top, so variables must
// come from vi.hoisted() to avoid "Cannot access before initialization"
// ---------------------------------------------------------------------------

const {
  closeModal,
  snapshot,
  mutateTree,
  mockNode,
  mockTree,
  treeSubscribers,
} = vi.hoisted(() => {
  const closeModal = vi.fn();
  const snapshot = vi.fn();
  const mutateTree = vi.fn();

  const treeSubscribers: Array<(val: TreeNode) => void> = [];

  const mockNode: TreeNode = {
    id: "test-1",
    title: "Test Task",
    expanded: false,
    status: "doing",
    priority: "high",
    children: [],
    startDate: "2026-07-01",
    dueDate: "2026-07-15",
  };

  const mockTree: TreeNode = {
    id: "root",
    title: "Root",
    expanded: true,
    status: "todo",
    priority: "medium",
    children: [mockNode],
    startDate: "2026-01-01",
  };

  return {
    closeModal,
    snapshot,
    mutateTree,
    mockNode,
    mockTree,
    treeSubscribers,
  };
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
  snapshot,
  mutateTree,
}));

vi.mock("../stores/modalStore", () => ({
  closeModal,
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { mount, unmount } from "svelte";
import NodeDetailModal, { validateDates } from "./NodeDetailModal.svelte";

// ---------------------------------------------------------------------------
// Pure function: validateDates
// ---------------------------------------------------------------------------

describe("validateDates", () => {
  it("returns null when both dates are empty", () => {
    expect(validateDates("", "")).toBeNull();
  });

  it("returns null when startDate is empty but dueDate is set", () => {
    expect(validateDates("", "2026-07-15")).toBeNull();
  });

  it("returns null when dueDate is empty but startDate is set", () => {
    expect(validateDates("2026-07-01", "")).toBeNull();
  });

  it("returns null when startDate equals dueDate", () => {
    expect(validateDates("2026-07-15", "2026-07-15")).toBeNull();
  });

  it("returns null when startDate is before dueDate", () => {
    expect(validateDates("2026-07-01", "2026-07-15")).toBeNull();
  });

  it("returns error when startDate is after dueDate", () => {
    const result = validateDates("2026-07-20", "2026-07-01");
    expect(result).not.toBeNull();
    expect(result).toContain("fecha de inicio");
  });

  it("returns error message in Spanish", () => {
    const result = validateDates("2026-07-20", "2026-07-01");
    expect(result).toBe(
      "La fecha de inicio debe ser anterior o igual a la fecha de vencimiento.",
    );
  });
});

// ---------------------------------------------------------------------------
// Component: NodeDetailModal
// ---------------------------------------------------------------------------

describe("NodeDetailModal", () => {
  let target: HTMLDivElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    treeSubscribers.length = 0;
    target = createTarget();
  });

  afterEach(() => {
    unmount(component as never);
    target.remove();
  });

  it("renders the node title in read-only form", () => {
    component = mount(NodeDetailModal, {
      target,
      props: { nodeId: "test-1" },
    });

    const titleEl = target.querySelector(".readonly-title");
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe("Test Task");
  });

  it("renders 2 date inputs and 2 selects", () => {
    component = mount(NodeDetailModal, {
      target,
      props: { nodeId: "test-1" },
    });

    const dateInputs = target.querySelectorAll<HTMLInputElement>(
      'input[type="date"]',
    );
    expect(dateInputs.length).toBe(2);

    const selects = target.querySelectorAll<HTMLSelectElement>("select");
    expect(selects.length).toBe(2);
  });

  it("populates status and priority selects from node data after effect runs", async () => {
    component = mount(NodeDetailModal, {
      target,
      props: { nodeId: "test-1" },
    });

    await tick();

    const selects = target.querySelectorAll<HTMLSelectElement>("select");
    expect(selects[0].value).toBe("doing");
    expect(selects[1].value).toBe("high");
  });

  it("calls snapshot, mutateTree, and closeModal on valid save", () => {
    component = mount(NodeDetailModal, {
      target,
      props: { nodeId: "test-1" },
    });

    const saveBtn = findButton(target, "Guardar");
    expect(saveBtn).not.toBeNull();
    saveBtn!.click();

    expect(snapshot).toHaveBeenCalledOnce();
    expect(mutateTree).toHaveBeenCalledOnce();
    expect(closeModal).toHaveBeenCalledOnce();
  });

  it("calls closeModal when Cancel is clicked", () => {
    component = mount(NodeDetailModal, {
      target,
      props: { nodeId: "test-1" },
    });

    const cancelBtn = findButton(target, "Cancelar");
    expect(cancelBtn).not.toBeNull();
    cancelBtn!.click();

    expect(closeModal).toHaveBeenCalledOnce();
    expect(snapshot).not.toHaveBeenCalled();
    expect(mutateTree).not.toHaveBeenCalled();
  });

  it("shows 'nodo ya no existe' when node is null (deleted while open)", () => {
    component = mount(NodeDetailModal, {
      target,
      props: { nodeId: "non-existent-id" },
    });

    expect(target.textContent).toContain("ya no existe");
    expect(target.querySelector("button")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTarget(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function findButton(
  container: HTMLElement,
  text: string,
): HTMLButtonElement | null {
  const buttons = container.querySelectorAll("button");
  for (const btn of buttons) {
    if (btn.textContent?.includes(text)) return btn;
  }
  return null;
}
