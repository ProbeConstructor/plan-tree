import type { TreeNode } from "../types";
import { get } from "svelte/store";
import { t } from "svelte-i18n";

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "var(--accent-danger)";
    case "high":
      return "var(--accent-warning)";
    case "medium":
      return "var(--accent-primary)";
    case "low":
      return "var(--text-muted)";
    default:
      return "var(--text-muted)";
  }
}

export function getProgressColor(progress: number): string {
  if (progress === 100) return "var(--accent-success)";
  if (progress >= 50) return "var(--accent-warning)";
  if (progress > 0) return "var(--accent-warning)";
  return "var(--accent-danger)";
}

export function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case "critical":
      return "🚨";
    case "high":
      return "🔥";
    case "medium":
      return "📌";
    case "low":
      return "💡";
    default:
      return "❓";
  }
}

export function getStatusEmoji(status: string): string {
  switch (status) {
    case "todo":
      return "📋";
    case "doing":
      return "🚧";
    case "done":
      return "✅";
    default:
      return "❓";
  }
}

export function getNodeType(depth: number): string {
  switch (depth) {
    case 0:
      return "👤";
    case 1:
      return "🌟";
    case 2:
      return "🎯";
    case 3:
      return "📌";
    case 4:
      return "✅";
    default:
      return "📝";
  }
}

export function getDefaultTitle(depth: number): string {
  const key = `tree.defaults.depth${Math.min(depth, 5)}`;
  return get(t)(key);
}

export function isOverdue(node: TreeNode): boolean {
  if (!node.dueDate || node.status === "done") return false;
  const today = new Date().toISOString().slice(0, 10);
  return node.dueDate < today;
}

export function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return Math.round((today.getTime() - due.getTime()) / 86400000);
}
