import type { TreeNode } from "../types";

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "#ef4444";
    case "high":
      return "#f59e0b";
    case "medium":
      return "#3b82f6";
    case "low":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}

export function getProgressColor(progress: number): string {
  if (progress === 100) return "#4CAF50";
  if (progress >= 50) return "#FFC107";
  if (progress > 0) return "#FF9800";
  return "#F44336";
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
  switch (depth) {
    case 0:
      return "Usuario";
    case 1:
      return "Nuevo sueño";
    case 2:
      return "Nueva meta";
    case 3:
      return "Nuevo objetivo";
    case 4:
      return "Nueva tarea";
    default:
      return "Nueva subtarea";
  }
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
