import type { PanelId } from "../types";
import { getPanelInstance, snapshotInstance } from "./panelRegistry";

// ── Backward-compatible alias (left panel) ───────────────────
export const completions = getPanelInstance("left").completions;

// ── Panel-scoped toggle ──────────────────────────────────────

export function toggle(nodeId: string, date: string, panelId: PanelId = "left"): void {
  const instance = getPanelInstance(panelId);

  // Snapshot BEFORE mutation so undo restores the pre-toggle state
  snapshotInstance(instance);

  instance.completions.update((map) => {
    const nodeCompletions = map[nodeId];
    if (nodeCompletions?.[date]) {
      // Remove completion
      const { [date]: _removed, ...rest } = nodeCompletions;
      if (Object.keys(rest).length === 0) {
        const { [nodeId]: _removedNode, ...remaining } = map;
        return remaining;
      }
      return { ...map, [nodeId]: rest };
    }
    // Add completion
    return {
      ...map,
      [nodeId]: { ...nodeCompletions, [date]: true } as Record<string, true>,
    };
  });
}

export function reset(panelId: PanelId = "left"): void {
  getPanelInstance(panelId).completions.set({});
}
