import { writable } from "svelte/store";
import type { LayoutNode } from "../utils/treeLayout";

export const layoutStore = writable(new Map<string, LayoutNode>());
