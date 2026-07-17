import type { TreeNode, Snapshot, CompletionsMap } from "../types";
import { encryptText, decryptText } from "./vaultManager";
import { activeProfileDir } from "../utils/pathUtils";
import { readTextFile, writeTextFile, mkdir, rename, remove } from "./fsAdapter";
import {
  calculateGlobalProgress,
  getDirectBranches,
  getPriorityBreakdown,
  getStatusBreakdown,
} from "../utils/treeUtils";
import { writable, get } from "svelte/store";

const PROGRESS_EXTENSION = ".progress.plan";

/**
 * Store that increments every time a snapshot is captured.
 * Progress.svelte subscribes to re-fetch data after auto-save.
 */
export const snapshotEvent = writable(0);

function projectsDir(): string {
  return `${activeProfileDir()}/projects`;
}

/** Ruta del archivo de snapshots para un proyecto. */
export function progressPath(name: string): string {
  return `${projectsDir()}/${name}${PROGRESS_EXTENSION}`;
}

/**
 * Calcula un Snapshot a partir del árbol actual.
 * Reusa treeUtils para todos los cómputos.
 */
export function computeSnapshot(data: TreeNode, completions?: CompletionsMap): Snapshot {
  const globalProgress = calculateGlobalProgress(data, completions);
  const branchProgress = getDirectBranches(data);
  const statusBreakdown = getStatusBreakdown(data, completions);
  const priorityBreakdown = getPriorityBreakdown(data, completions);

  let totalNodes = 0;
  let doneNodes = 0;
  function walk(node: TreeNode) {
    totalNodes++;
    if (
      node.status === "done" ||
      (completions != null &&
        completions[node.id] != null &&
        Object.keys(completions[node.id]).length > 0)
    ) {
      doneNodes++;
    }
    (node.children ?? []).forEach(walk);
  }
  walk(data);

  return {
    timestamp: new Date().toISOString(),
    globalProgress,
    branchProgress,
    totalNodes,
    doneNodes,
    statusBreakdown,
    priorityBreakdown,
  };
}

/** Servicio de snapshots de progreso mensual. */
class ProgressSnapshotService {
  /**
   * Cola de promesas para serializar escrituras.
   * Garantiza que dos captures concurrentes no se pisen.
   */
  private writeQueue: Promise<void> = Promise.resolve();

  private async serialized<T>(fn: () => Promise<T>): Promise<T> {
    const result: Promise<T> = this.writeQueue.then(fn);
    // Engullir errores en la cadena para que la cola nunca se rompa
    this.writeQueue = result.then(() => {}, (e) => {
      console.error("[SNAPSHOT-DEBUG] serialized queue swallowed error:", e);
    });
    return result;
  }

  /**
   * Captura un snapshot del árbol y lo persiste.
   * Fire-and-forget desde la perspectiva del llamante:
   * la serialización interna evita condiciones de carrera.
   */
  async capture(project: string, data: TreeNode, completions?: CompletionsMap): Promise<void> {
    return this.serialized(async () => {
      const snapshot = computeSnapshot(data, completions);
      console.log(`[SNAPSHOT-DEBUG] capture(): computed snapshot — totalNodes=${snapshot.totalNodes}, doneNodes=${snapshot.doneNodes}, progress=${snapshot.globalProgress}`);

      // Leer snapshots existentes
      let snapshots: Snapshot[] = [];
      try {
        const raw = await readTextFile(progressPath(project));
        const decrypted = await decryptText(raw);
        const parsed = JSON.parse(decrypted);
        if (Array.isArray(parsed)) snapshots = parsed;
        // si no es array, arrancar de cero
      } catch {
        // No existe o corrupto → arrancar de cero
      }

      snapshots.push(snapshot);
      console.log(`[SNAPSHOT-DEBUG] capture(): total snapshots in file now: ${snapshots.length}, latest doneNodes: ${snapshots[snapshots.length - 1].doneNodes}`);

      // Escribir
      const encrypted = await encryptText(JSON.stringify(snapshots));
      await mkdir(projectsDir(), { recursive: true });
      await writeTextFile(progressPath(project), encrypted);
      console.log(`[SNAPSHOT-DEBUG] capture(): wrote ${progressPath(project)} successfully`);

      // Notificar a suscriptores (Progress.svelte) que hay un snapshot nuevo
      snapshotEvent.update((n) => n + 1);
      console.log(`[SNAPSHOT-DEBUG] capture(): snapshotEvent incremented to ${get(snapshotEvent)}`);
    });
  }

  /**
   * Carga los snapshots de un proyecto para un mes específico.
   * Devuelve [] si el archivo no existe o está corrupto.
   */
  async loadSnapshots(
    project: string,
    year: number,
    month: number,
  ): Promise<Snapshot[]> {
    try {
      const raw = await readTextFile(progressPath(project));
      const decrypted = await decryptText(raw);
      const all: Snapshot[] = JSON.parse(decrypted);
      const filtered = all.filter((s) => {
        const d = new Date(s.timestamp);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      console.log(`[SNAPSHOT-DEBUG] loadSnapshots("${project}", ${year}, ${month}): total=${all.length}, filtered=${filtered.length}, lastDoneNodes=${filtered.length > 0 ? filtered[filtered.length - 1].doneNodes : "N/A"}`);
      return filtered;
    } catch {
      console.log(`[SNAPSHOT-DEBUG] loadSnapshots("${project}", ${year}, ${month}): file not found or corrupt, returning []`);
      return [];
    }
  }

  /** Renombra el archivo de progreso. No falla si no existe. */
  async renameProject(oldName: string, newName: string): Promise<void> {
    try {
      await rename(progressPath(oldName), progressPath(newName));
    } catch {
      // Si el archivo viejo no existe, no es error
    }
  }

  /** Elimina el archivo de progreso. No falla si no existe. */
  async deleteProject(name: string): Promise<void> {
    try {
      await remove(progressPath(name));
    } catch {
      // Si no existe, no es error
    }
  }
}

/** Instancia singleton del servicio. */
export const progressSnapshot = new ProgressSnapshotService();
