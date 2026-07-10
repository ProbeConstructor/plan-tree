import { writable, derived } from "svelte/store";
import { tree } from "./treeStore";
import { tagDefs } from "./tagStore";
import { searchNodes } from "../utils/treeUtils";

export const query = writable("");

export const results = derived([query, tree, tagDefs], ([$query, $tree, $tagDefs]) => {
  return searchNodes($tree, $query, $tagDefs);
});
