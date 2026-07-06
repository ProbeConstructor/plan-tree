import { writable, derived } from "svelte/store";
import { tree } from "./treeStore";
import { searchNodes } from "../utils/treeUtils";

export const query = writable("");
export const isOpen = writable(false);

export const results = derived([query, tree], ([$query, $tree]) => {
  return searchNodes($tree, $query);
});

export function openSearch() {
  query.set("");
  isOpen.set(true);
}

export function closeSearch() {
  isOpen.set(false);
  query.set("");
}
