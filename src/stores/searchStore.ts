import { writable, derived } from "svelte/store";
import { tree } from "./treeStore";
import { searchNodes } from "../utils/treeUtils";

export const query = writable("");

export const results = derived([query, tree], ([$query, $tree]) => {
  return searchNodes($tree, $query);
});
