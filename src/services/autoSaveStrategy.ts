import type { TreeNode } from "../types";
import { writable } from "svelte/store";

export type AutoSaveStatus = "idle" | "saving" | "error";

type SaveFn = (project: string, data: TreeNode) => Promise<void>;

/** Callback opcional que se dispara después de un guardado exitoso. */
export type AfterSaveFn = (project: string, data: TreeNode) => Promise<void> | void;

export class AutoSaveStrategy {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingData: TreeNode | null = null;
  private pendingProject: string | null = null;
  private saveFn: SaveFn;
  private debounceMs: number;
  private maxRetries: number;

  /** Callback opcional: se ejecuta después de cada flush exitoso. */
  onAfterSave: AfterSaveFn | null = null;

  readonly status = writable<AutoSaveStatus>("idle");

  constructor(saveFn: SaveFn, debounceMs = 2000, maxRetries = 3) {
    this.saveFn = saveFn;
    this.debounceMs = debounceMs;
    this.maxRetries = maxRetries;
  }

  schedule(project: string, data: TreeNode): void {
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
