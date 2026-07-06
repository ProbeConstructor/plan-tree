import type { Snapshot } from "../types";

/** Agrupa snapshots por día, tomando el último de cada día. */
export function snapshotsToDailyLineData(
  snapshots: Snapshot[],
): { date: string; global: number; branches: Record<string, number> }[] {
  if (snapshots.length === 0) return [];

  const byDay = new Map<string, Snapshot>();
  for (const s of snapshots) {
    const day = s.timestamp.slice(0, 10); // "2026-07-05"
    byDay.set(day, s); // último del día pisa anteriores
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, s]) => {
      const branches: Record<string, number> = {};
      for (const b of s.branchProgress) {
        branches[b.title] = b.progress;
      }
      return { date, global: s.globalProgress, branches };
    });
}

/** Semana del mes (1-5) a partir de un día. */
function getWeekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

/**
 * Calcula completados por semana.
 * Diferencia de doneNodes entre el primer y último snapshot de cada semana.
 */
export function snapshotsToWeeklyBarData(
  snapshots: Snapshot[],
): { week: number; completions: number }[] {
  if (snapshots.length === 0) return [];

  const byWeek = new Map<number, Snapshot[]>();
  for (const s of snapshots) {
    const d = new Date(s.timestamp);
    const week = getWeekOfMonth(d);
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week)!.push(s);
  }

  const result: { week: number; completions: number }[] = [];
  for (const [week, weekSnaps] of byWeek) {
    weekSnaps.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const first = weekSnaps[0];
    const last = weekSnaps[weekSnaps.length - 1];
    result.push({ week, completions: last.doneNodes - first.doneNodes });
  }

  return result.sort((a, b) => a.week - b.week);
}

/** Prepara datos para donut: último snapshot → status breakdown. */
export function snapshotToDonutData(
  snapshots: Snapshot[],
): { label: string; value: number; color: string }[] {
  if (snapshots.length === 0) return [];

  const latest = snapshots[snapshots.length - 1];
  const { statusBreakdown } = latest;

  return [
    { label: "Por hacer", value: statusBreakdown.todo, color: "#6b7280" },
    { label: "En curso", value: statusBreakdown.doing, color: "#3b82f6" },
    { label: "Completado", value: statusBreakdown.done, color: "#4caf50" },
  ];
}

/** Stats básicos del último snapshot. */
export function snapshotToStats(
  snapshots: Snapshot[],
): { total: number; done: number; progress: number } | null {
  if (snapshots.length === 0) return null;

  const latest = snapshots[snapshots.length - 1];
  return {
    total: latest.totalNodes,
    done: latest.doneNodes,
    progress: latest.globalProgress,
  };
}
