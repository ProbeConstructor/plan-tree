import type { TreeNode } from "../types";

export function findNode(tree: TreeNode, id: string): TreeNode | null {
  if (tree.id === id) return tree;

  for (const child of tree.children) {
    const found = findNode(child, id);
    if (found) return found;
  }

  return null;
}

function containsId(node: TreeNode, id: string): boolean {
  if (node.id === id) return true;
  return node.children.some((child) => containsId(child, id));
}

export function moveNode(
  root: TreeNode,
  draggedId: string,
  targetParentId: string,
): TreeNode {
  if (draggedId === targetParentId) return root;
  if (draggedId === root.id) return root; // no se puede mover el origen
  const draggedNode = findNode(root, draggedId);
  if (!draggedNode) return root;
  if (containsId(draggedNode, targetParentId)) return root; // soltarías dentro de sí mismo
  // Validar que el target existe ANTES de mutar — si no, el deleteNode
  // borra el nodo y updateNode es no-op, dejándolo huérfano (data loss).
  if (!findNode(root, targetParentId)) return root;
  const withoutDragged = deleteNode(root, draggedId);
  return updateNode(withoutDragged, targetParentId, (n) => ({
    ...n,
    expanded: true,
    children: [...n.children, draggedNode],
  }));
}

export function updateNode(
  tree: TreeNode,
  id: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode {
  if (tree.id === id) {
    return updater(tree);
  }

  return {
    ...tree,
    children: tree.children.map((child) => updateNode(child, id, updater)),
  };
}

export function deleteNode(tree: TreeNode, id: string): TreeNode {
  return {
    ...tree,
    children: tree.children
      .filter((c) => c.id !== id)
      .map((c) => deleteNode(c, id)),
  };
}

/**
 * Saca el nodo `id` (y todo lo que cuelga de él) del árbol, devolviendo
 * AMBAS cosas: una copia independiente del nodo extraído (para usarla
 * como raíz de un proyecto nuevo) y el árbol que queda sin él.
 */
export function extractNode(
  tree: TreeNode,
  id: string,
): { extracted: TreeNode | null; remainingTree: TreeNode } {
  const extracted = findNode(tree, id);

  if (!extracted) {
    return { extracted: null, remainingTree: tree };
  }

  return {
    extracted: structuredClone(extracted),
    remainingTree: deleteNode(tree, id),
  };
}

export function calculateNodeProgress(node: TreeNode): number {
  if (node.children.length === 0) {
    if (node.status === "done") return 100;
    if (node.status === "doing") return 50;
    return 0;
  }

  const total = node.children.length;

  const sum = node.children.reduce(
    (acc, child) => acc + calculateNodeProgress(child),
    0,
  );

  return Math.round(sum / total);
}

export function calculateGlobalProgress(node: TreeNode): number {
  return calculateNodeProgress(node);
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "#ef4444"; // rojo
    case "high":
      return "#f59e0b"; // ambar
    case "medium":
      return "#3b82f6"; // azul
    case "low":
      return "#6b7280"; // gris
    default:
      return "#6b7280";
  }
}

export function getProgressColor(progress: number): string {
  if (progress === 100) return "#4CAF50"; // verde
  if (progress >= 50) return "#FFC107"; // amarillo
  if (progress > 0) return "#FF9800"; // naranja
  return "#F44336"; // rojo
}

export function getTodayNodes(tree: TreeNode): TreeNode[] {
  function flatten(node: TreeNode): TreeNode[] {
    return [node, ...node.children.flatMap(flatten)];
  }

  // 👇 solo los hijos del root, así el "Objetivo principal"
  // nunca aparece en la lista de "Para Hoy"
  return tree.children
    .flatMap(flatten)
    .filter(
      (node) =>
        node.status !== "done" &&
        (node.priority === "critical" || node.priority === "high"),
    );
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

export function hasAnyFocus(node: TreeNode): boolean {
  if (node.focused) return true;
  return node.children.some(hasAnyFocus);
}

export function setFocus(root: TreeNode, id: string | null): TreeNode {
  function clearFocus(n: TreeNode): TreeNode {
    return { ...n, focused: false, children: n.children.map(clearFocus) };
  }

  const cleared = clearFocus(root);
  if (!id) return cleared; // id null = quitar el foco de todos

  return updateNode(cleared, id, (n) => ({ ...n, focused: true }));
}

export function getDirectBranches(
  root: TreeNode,
): { id: string; title: string; progress: number }[] {
  return root.children.map((child) => ({
    id: child.id,
    title: child.title,
    progress: calculateNodeProgress(child),
  }));
}

export function getPriorityBreakdown(root: TreeNode) {
  const breakdown = {
    critical: { total: 0, done: 0 },
    high: { total: 0, done: 0 },
    medium: { total: 0, done: 0 },
    low: { total: 0, done: 0 },
  };

  function walk(node: TreeNode) {
    // 🛡️ defensivo: si algun nodo viejo no tiene priority valida,
    // no explota, simplemente no lo cuenta.
    if (breakdown[node.priority]) {
      breakdown[node.priority].total++;
      if (node.status === "done") breakdown[node.priority].done++;
    }
    node.children.forEach(walk);
  }

  root.children.forEach(walk); // no contamos el root mismo

  return breakdown;
}

export function getStatusBreakdown(root: TreeNode): { todo: number; doing: number; done: number } {
  const breakdown = { todo: 0, doing: 0, done: 0 };

  function walk(node: TreeNode) {
    if (node.status === "todo") breakdown.todo++;
    else if (node.status === "doing") breakdown.doing++;
    else if (node.status === "done") breakdown.done++;
    node.children.forEach(walk);
  }

  walk(root);
  return breakdown;
}

export function getOverdueAndUpcoming(root: TreeNode, upcomingDays = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + upcomingDays);

  const overdue: TreeNode[] = [];
  const upcoming: TreeNode[] = [];

  function walk(node: TreeNode) {
    if (node.dueDate && node.status !== "done") {
      const due = new Date(node.dueDate);
      if (due < today) overdue.push(node);
      else if (due <= limit) upcoming.push(node);
    }
    node.children.forEach(walk);
  }

  root.children.forEach(walk);

  overdue.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  upcoming.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  return { overdue, upcoming };
}

export function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return Math.round((today.getTime() - due.getTime()) / 86400000);
}

export function calculateProgressMap(root: TreeNode): Map<string, number> {
  const map = new Map<string, number>();
  function visit(node: TreeNode): number {
    let progress: number;
    if (node.children.length === 0) {
      switch (node.status) {
        case "done":
          progress = 100;
          break;
        case "doing":
          progress = 50;
          break;
        default:
          progress = 0;
      }
    } else {
      let total = 0;
      for (const child of node.children) {
        total += visit(child);
      }
      progress = Math.round(total / node.children.length);
    }
    map.set(node.id, progress);
    return progress;
  }
  visit(root);
  return map;
}
