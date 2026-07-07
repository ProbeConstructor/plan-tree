import type { TreeNode, ProjectData } from "../types";
import { writable } from "svelte/store";

export type AutoSaveStatus = "idle" | "saving" | "error";

type SaveFn = (project: string, data: ProjectData) => Promise<void>;

/** Callback opcional que se dispara después de un guardado exitoso. */
export type AfterSaveFn = (project: string, data: ProjectData) => Promise<void> | void;

/** Cuenta nodos totales recorriendo recursivamente. */
function countNodes(node: TreeNode): number {
  let count = 1;
  for (const child of node.children ?? []) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Si el último guardado tenía >1 nodo y de repente el tree tiene ≤1,
 * no guardamos: es casi seguro un estado corrupto (resetTree, crash, carga fallida).
 */
const SUSPICIOUS_DROP_THRESHOLD = 1;

export class AutoSaveStrategy {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingData: ProjectData | null = null;
  private pendingProject: string | null = null;
  private saveFn: SaveFn;
  private debounceMs: number;
  private maxRetries: number;

  /** Nodo conocido por proyecto — actualizado tras cada guardado exitoso. */
  private lastSavedNodeCount = new Map<string, number>();

  /** Callback opcional: se ejecuta después de cada flush exitoso. */
  onAfterSave: AfterSaveFn | null = null;

  readonly status = writable<AutoSaveStatus>("idle");

  constructor(saveFn: SaveFn, debounceMs = 2000, maxRetries = 3) {
    this.saveFn = saveFn;
    this.debounceMs = debounceMs;
    this.maxRetries = maxRetries;
  }

  /**
   * Permite al exterior sincronizar el contador conocido (ej: después de cargar
   * un proyecto desde disco o al crearlo).
   */
  syncNodeCount(project: string, tree: TreeNode): void {
    this.lastSavedNodeCount.set(project, countNodes(tree));
  }

  schedule(project: string, data: ProjectData): void {
    // 🛡️ Guarda contra guardado de árbol vacío
    const newCount = countNodes(data.tree);
    const lastCount = this.lastSavedNodeCount.get(project);

    if (
      lastCount !== undefined &&
      lastCount > SUSPICIOUS_DROP_THRESHOLD &&
      newCount <= SUSPICIOUS_DROP_THRESHOLD
    ) {
      console.warn(
        `[AutoSave] BLOQUEADO: "${project}" cayó de ${lastCount} a ${newCount} nodos. ` +
          "No se guarda para no perder datos. Si es intencional, forzá undo o recargá.",
      );
      this.cancel();
      return;
    }

    this.pendingProject = project;
    this.pendingData = data;

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const project = this.pendingProject;
    const data = this.pendingData;
    this.pendingProject = null;
    this.pendingData = null;

    if (!project || !data) return;

    this.status.set("saving");

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.saveFn(project, data);
      } catch {
        if (attempt < this.maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
        continue;
      }

      // ✅ Guardado exitoso — actualizar contador conocido
      this.lastSavedNodeCount.set(project, countNodes(data.tree));

      // onAfterSave fire-and-forget — error NO debe afectar el save ni el status
      try {
        await this.onAfterSave?.(project, data);
      } catch {
        // silently swallow: snapshot errors no interrumpen el auto-save
      }

      this.status.set("idle");
      return;
    }

    this.status.set("error");
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingProject = null;
    this.pendingData = null;
  }
}
