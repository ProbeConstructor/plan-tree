export type TreeNode = {
  id: string;
  title: string;
  expanded: boolean;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high" | "critical";
  children: TreeNode[];

  // 📅 fechas
  startDate: string;
  dueDate?: string;

  // 🆕 para foco
  focused?: boolean;

  // 🖼️ icono
  icon?: string;
};

export interface Project {
  id: string;
  name: string;
  visibility: "private" | "public";
  tree: TreeNode;
}

export interface Workspace {
  projects: Project[];
  activeProjectId: string | null;
}

export interface TreeViewNode {
  node: TreeNode;
  depth: number;
  path: string;
  isRoot: boolean;
  parentId?: string;
  subtreeWidth: number;
  x: number;
  y: number;
}