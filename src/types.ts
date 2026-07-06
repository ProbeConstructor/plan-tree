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

  // 💬 comentarios en markdown
  comments?: string;
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

// 📊 progreso mensual
export type StatusBreakdown = { todo: number; doing: number; done: number };
export type PriorityCount = { total: number; done: number };
export type PriorityBreakdown = Record<"critical" | "high" | "medium" | "low", PriorityCount>;
export type BranchProgress = { id: string; title: string; progress: number };

export interface Snapshot {
  timestamp: string;           // ISO 8601
  globalProgress: number;
  branchProgress: BranchProgress[];
  totalNodes: number;
  doneNodes: number;
  statusBreakdown: StatusBreakdown;
  priorityBreakdown: PriorityBreakdown;
}