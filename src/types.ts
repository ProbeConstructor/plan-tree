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

  // ♻️ recurrencia
  recurrence?: RecurrenceRule;
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

// ♻️ recurrencia
export type RecurrenceType = "daily" | "weekly";

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;       // ≥ 1
  daysOfWeek?: number[];  // 0=Mon..6=Sun, weekly only
  endDate?: string;       // ISO date, stops generation
}

export type CompletionsMap = Record<string, Record<string, true>>;

export interface ProjectData {
  tree: TreeNode;
  completions: CompletionsMap;
}

export interface VirtualInstance {
  id: string;             // "${nodeId}::${date}"
  nodeId: string;
  date: string;
  title: string;
  status: "todo" | "done" | "missed" | "doing";
  isVirtual: true;
}

export interface Snapshot {
  timestamp: string;           // ISO 8601
  globalProgress: number;
  branchProgress: BranchProgress[];
  totalNodes: number;
  doneNodes: number;
  statusBreakdown: StatusBreakdown;
  priorityBreakdown: PriorityBreakdown;
}