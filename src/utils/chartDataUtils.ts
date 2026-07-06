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

/**
 * Día de la semana (0=lun..6=dom) consistente con calendarUtils.
 */
function jsDayToMonday0(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Primer día del mes en Monday=0, para calcular índices de semana.
 * Días 0=lun, 1=mar, …, 6=dom.
 */
function monthStartWeekday(year: number, month: number): number {
  return jsDayToMonday0(new Date(year, month, 1));
}

/**
 * Calcula completados por día, devolviendo datos planos con metadatos de semana
 * para que el chart pueda renderizar barras diarias agrupadas por semana.
 *
 * Retorna:
 * - labels: array de strings "D" (día del mes)
 * - data: completions por día (diferencia de doneNodes)
 * - weekIndices: índices del array donde EMPIEZA cada semana (para separadores)
 * - weekLabels: etiquetas "Sem 1", "Sem 2"…
 */
export function snapshotsToDailyGroupedByWeek(
  snapshots: Snapshot[],
): {
  labels: string[];
  data: number[];
  weekIndices: number[];
  weekLabels: string[];
} {
  if (snapshots.length === 0) return { labels: [], data: [], weekIndices: [], weekLabels: [] };

  // Agrupar snapshots por día, quedándonos con el último de cada día
  const byDay = new Map<string, Snapshot>();
  for (const s of snapshots) {
    const day = s.timestamp.slice(8, 10); // "DD"
    byDay.set(day, s); // último del día pisa anteriores
  }
  // Construir serie diaria: día 1..último del mes
  const firstDay = new Date(snapshots[0].timestamp);
  const year = firstDay.getFullYear();
  const month = firstDay.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = monthStartWeekday(year, month);

  // Recorrer días secuencialmente acumulando delta de doneNodes
  // lastDone arranca en 0. El primer día con snapshot muestra el total
  // acumulado hasta ese momento. Eso evita que el chart se vea vacío cuando
  // todos los snapshots caen en un solo día (típico al empezar a usar la app).
  const dayMap = new Map<number, number>();
  let lastDone = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const key = String(i).padStart(2, "0");
    const snap = byDay.get(key);
    if (snap) {
      dayMap.set(i, snap.doneNodes - lastDone);
      lastDone = snap.doneNodes;
    } else {
      dayMap.set(i, 0);
    }
  }

  // Construir arrays planos + metadatos de semana
  const labels: string[] = [];
  const data: number[] = [];
  const weekIndices: number[] = [];
  const weekLabels: string[] = [];

  let weekCount = 0;
  weekIndices.push(0); // semana 1 empieza en índice 0

  for (let day = 1; day <= daysInMonth; day++) {
    const wd = (startWeekday + day - 1) % 7;
    labels.push(String(day));
    data.push(Math.max(0, dayMap.get(day) ?? 0));

    // Si es domingo (wd === 6) y no es el último día, marcar fin de semana
    if (wd === 6 && day < daysInMonth) {
      weekCount++;
      weekIndices.push(day); // próximo índice donde empieza la semana
      weekLabels.push(`Sem ${weekCount + 1}`);
    }
  }

  // Etiqueta para la primera semana
  weekLabels.unshift("Sem 1");

  return { labels, data, weekIndices, weekLabels };
}

/**
 * DEPRECATED — Reemplazado por snapshotsToDailyGroupedByWeek.
 * Mantenido temporalmente para compatibilidad.
 */
export function snapshotsToWeeklyBarData(
  snapshots: Snapshot[],
): { week: number; completions: number }[] {
  if (snapshots.length === 0) return [];

  const byDay = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    const day = s.timestamp.slice(8, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }

  const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  const firstDay = new Date(snapshots[0].timestamp);
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const startWeekday = monthStartWeekday(firstDay.getFullYear(), firstDay.getMonth());

  let lastDone = 0;
  const byWeek = new Map<number, number>();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = String(d).padStart(2, "0");
    const snaps = byDay.get(key);
    if (snaps && snaps.length > 0) {
      snaps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const dayDone = snaps[snaps.length - 1].doneNodes;
      const week = Math.ceil(d / 7);
      byWeek.set(week, (byWeek.get(week) ?? 0) + (dayDone - lastDone));
      lastDone = dayDone;
    }
  }

  return Array.from(byWeek.entries())
    .map(([week, completions]) => ({ week, completions: Math.max(0, completions) }))
    .sort((a, b) => a.week - b.week);
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
