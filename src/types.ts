export interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

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

  // ⭐ favoritos
  favorite?: boolean;

  // 🖼️ icono
  icon?: string;

  // 💬 comentarios en markdown
  comments?: string;

  // ♻️ recurrencia
  recurrence?: RecurrenceRule;

  // 🏷️ tags (array of TagDefinition IDs)
  tags?: string[];
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

/** Identifies which panel a store instance belongs to. */
export type PanelId = "left" | "right";

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

// ── Plugin System ────────────────────────────────────────────

/** Available permissions a plugin can declare in its manifest. */
export type PluginPermission =
  | "tree_read"
  | "tree_write"
  | "view_register"
  | "command_register"
  | "css_inject"
  | "settings_write";

/** Set of all valid permission strings for validation. */
export const VALID_PERMISSIONS: ReadonlySet<PluginPermission> = new Set([
  "tree_read",
  "tree_write",
  "view_register",
  "command_register",
  "css_inject",
  "settings_write",
]);

/**
 * Plugin manifest — parsed from `manifest.json` in each plugin directory.
 * Required fields: id, name, version, permissions, entry.
 */
export interface PluginManifest {
  /** Unique plugin identifier (kebab-case recommended). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Semver version string. */
  version: string;
  /** Permissions this plugin requires. */
  permissions: PluginPermission[];
  /** Relative path to the ES module entry point (e.g. "index.js"). */
  entry: string;
  /** Optional schema for plugin settings — drives the settings UI form. */
  settingsSchema?: Record<string, { type: string; default?: unknown }>;
}

/**
 * Runtime metadata for a discovered/loaded plugin, stored in the plugin store.
 */
export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  status: "loaded" | "active" | "disabled" | "errored";
  error?: string;
  permissions: PluginPermission[];
}

/**
 * Contract for a plugin's entry-point module.
 * Plugins must export `activate` and optionally `deactivate`.
 */
export interface PluginModule {
  activate(api: PluginAPI): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

/**
 * Scoped facade passed to plugin `activate()`.
 * Enforces permissions at call-time and wraps every call in crash isolation.
 */
export interface PluginAPI {
  views: { register(id: string, component: unknown): void };
  commands: {
    register(cmd: {
      id: string;
      label: string;
      category?: string;
      icon?: string;
      enabled?: () => boolean;
      action: () => void;
    }): void;
  };
  tree: {
    read(): TreeNode;
    addNode(parentId: string, data: Partial<TreeNode>): string;
    updateNode(nodeId: string, patch: Partial<TreeNode>): void;
    deleteNode(nodeId: string): void;
  };
  events: {
    onNodeChange(cb: (node: TreeNode, type: string) => void): () => void;
    onProjectLoad(cb: (project: string) => void): () => void;
    onPluginUnload(cb: () => void): () => void;
  };
  css: { inject(css: string): void; remove(id: string): void };
  settings: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
  };
}