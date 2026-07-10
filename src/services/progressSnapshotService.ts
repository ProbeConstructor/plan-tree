import type { TreeNode, Snapshot } from "../types";
import { encryptText, decryptText } from "./vaultManager";
import { activeProfileDir } from "../utils/pathUtils";
import { readTextFile, writeTextFile, mkdir, rename, remove } from "./fsAdapter";
import {
  calculateGlobalProgress,
  getDirectBranches,
  getPriorityBreakdown,
  getStatusBreakdown,
} from "../utils/treeUtils";

const PROGRESS_EXTENSION = ".progress.plan";

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
export function computeSnapshot(data: TreeNode): Snapshot {
  const globalProgress = calculateGlobalProgress(data);
  const branchProgress = getDirectBranches(data);
  const statusBreakdown = getStatusBreakdown(data);
  const priorityBreakdown = getPriorityBreakdown(data);

  let totalNodes = 0;
  let doneNodes = 0;
  function walk(node: TreeNode) {
    totalNodes++;
    if (node.status === "done") doneNodes++;
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
    this.writeQueue = result.then(() => {}, () => {});
    return result;
  }

  /**
   * Captura un snapshot del árbol y lo persiste.
   * Fire-and-forget desde la perspectiva del llamante:
   * la serialización interna evita condiciones de carrera.
   */
  async capture(project: string, data: TreeNode): Promise<void> {
    return this.serialized(async () => {
      const snapshot = computeSnapshot(data);

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

      // Escribir
      const encrypted = await encryptText(JSON.stringify(snapshots));
      await mkdir(projectsDir(), { recursive: true });
      await writeTextFile(progressPath(project), encrypted);
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
      return all.filter((s) => {
        const d = new Date(s.timestamp);
        return d.getUTCFullYear() === year && d.getUTCMonth() === month;
      });
    } catch {
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
