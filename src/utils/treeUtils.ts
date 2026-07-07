// Barrel — re-exports from focused tree modules.
// Existing imports from "treeUtils" keep working.
// New code should import directly from the focused module.

export {
  findNode,
  containsId,
  extractNode,
} from "./tree-traversal";

export {
  updateNode,
  deleteNode,
  moveNode,
  hasAnyFocus,
  setFocus,
  toggleFavorite,
} from "./tree-mutation";

export {
  calculateNodeProgress,
  calculateGlobalProgress,
  calculateProgressMap,
  getDirectBranches,
  getPriorityBreakdown,
  getStatusBreakdown,
  getTodayNodes,
  getOverdueAndUpcoming,
} from "./tree-progress";

export {
  getPriorityColor,
  getProgressColor,
  getPriorityEmoji,
  getStatusEmoji,
  getNodeType,
  getDefaultTitle,
  isOverdue,
  daysOverdue,
} from "./tree-display";

export { collectFavorites, getFavoriteIds } from "./tree-favorites";

export type { SearchResult } from "./tree-search";
export { searchNodes } from "./tree-search";
