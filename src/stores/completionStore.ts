import { writable } from "svelte/store";
import type { CompletionsMap } from "../types";
import { snapshot } from "./treeStore";

export const completions = writable<CompletionsMap>({});

export function toggle(nodeId: string, date: string): void {
  // Snapshot BEFORE mutation so undo restores the pre-toggle state
  snapshot();
  completions.update((map) => {
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

export function reset(): void {
  completions.set({});
}
