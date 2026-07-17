<script lang="ts">
  import { get } from "svelte/store";
  import { projects, activeProject } from "../stores/workspaceStore";
  import { activeProfile } from "../stores/profileStore";
  import { progressSnapshot, snapshotEvent } from "../services/progressSnapshotService";
  import {
    getProjectColors,
    saveProjectColor,
    getGraphSelection,
    saveGraphSelection,
  } from "../services/profileManager";
  import type { Snapshot } from "../types";
  import {
    snapshotsToDailyGroupedByWeek,
    snapshotsToMultiProjectLineData,
    snapshotToDonutData,
    snapshotToStats,
  } from "../utils/chartDataUtils";
  import MultiProjectLineChart from "../components/charts/MultiProjectLineChart.svelte";
  import DonutChart from "../components/charts/DonutChart.svelte";
  import StatsCards from "../components/charts/StatsCards.svelte";
  import ProjectSelector from "../components/charts/ProjectSelector.svelte";
  import { _ } from "svelte-i18n";

  const MONTH_KEYS = [
    "calendar.months.january", "calendar.months.february", "calendar.months.march",
    "calendar.months.april", "calendar.months.may", "calendar.months.june",
    "calendar.months.july", "calendar.months.august", "calendar.months.september",
    "calendar.months.october", "calendar.months.november", "calendar.months.december",
  ];

  const DEFAULT_PALETTE = [
    "#4caf50", "#2196f3", "#ff9800", "#f44336",
    "#9c27b0", "#e91e63", "#00bcd4", "#cddc39",
  ];

  let currentYear = $state(new Date().getFullYear());
  let currentMonth = $state(new Date().getMonth()); // 0-indexed
  let snapshots = $state<Snapshot[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Multi-project state
  let selectedProjects = $state<string[]>([]);
  let projectColors = $state<Record<string, string>>({});
  let multiSnapshots = $state<Record<string, Snapshot[]>>({});
  let loadingMulti = $state(true);
  let initialized = $state(false);

  let monthYear = $derived(`${$_(MONTH_KEYS[currentMonth])} ${currentYear}`);

  let dailyBarData = $derived(snapshotsToDailyGroupedByWeek(snapshots));
  let donutData = $derived(snapshotToDonutData(snapshots));
  let stats = $derived(snapshotToStats(snapshots));
  let isEmpty = $derived(snapshots.length === 0 && !loading && !error);

  // Datos del gráfico multi-proyecto
  let multiProjectData = $derived(snapshotsToMultiProjectLineData(multiSnapshots));

  // Opciones para el ProjectSelector (puro derivado, sin mutaciones)
  let selectorProjects = $derived(
    $projects.map((name) => ({
      name,
      color: projectColors[name] ?? DEFAULT_PALETTE[$projects.indexOf(name) % DEFAULT_PALETTE.length],
      selected: selectedProjects.includes(name),
    })),
  );

  // Inicializar: restaurar selección guardada o auto-seleccionar proyecto activo
  async function initSelection() {
    const profile = get(activeProfile);
    if (!profile) return;

    try {
      const saved = await getGraphSelection(profile);
      const colors = await getProjectColors(profile);
      projectColors = colors;

      // Asignar color por defecto a proyectos que no tengan uno
      const used = new Set(Object.values(colors));
      const toAssign: Record<string, string> = {};
      for (const p of $projects) {
        if (!(p in colors)) {
          const free = DEFAULT_PALETTE.find((c) => !used.has(c));
          toAssign[p] = free ?? DEFAULT_PALETTE[$projects.indexOf(p) % DEFAULT_PALETTE.length];
          used.add(toAssign[p]);
        }
      }
      if (Object.keys(toAssign).length > 0) {
        projectColors = { ...projectColors, ...toAssign };
        for (const [p, c] of Object.entries(toAssign)) {
          saveProjectColor(profile, p, c);
        }
      }

      if (saved) {
        selectedProjects = saved.filter((p) => $projects.includes(p));
      }

      // Si no hay selección (primera vez o todos los proyectos guardados fueron borrados)
      if (selectedProjects.length === 0) {
        const current = $activeProject;
        if (current) selectedProjects = [current];
        // Persistir esta selección inicial
        await saveGraphSelection(profile, selectedProjects);
      }
    } catch (err) {
      console.error("Error al cargar selección de proyectos:", err);
    }

    initialized = true;
  }

  // Manejar cambio de selección desde el ProjectSelector
  async function onSelectionChange(selected: string[]) {
    selectedProjects = selected;

    const profile = get(activeProfile);
    if (profile) {
      saveGraphSelection(profile, selected); // fire-and-forget
    }

    // reloadKey++ triggers the effect to reload snapshots
    reloadKey++;
  }

  // Manejar cambio de color desde el ProjectSelector
  async function onColorChange(project: string, color: string) {
    projectColors = { ...projectColors, [project]: color };

    const profile = get(activeProfile);
    if (profile) {
      saveProjectColor(profile, project, color); // fire-and-forget
    }
  }

  // Reload key para forzar recarga de snapshots multi-proyecto
  let reloadKey = $state(0);

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }

  function goToToday() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
  }

  // Cargar snapshots del proyecto activo (para BarChart / DonutChart / StatsCards)
  async function fetchSnapshots() {
    const project = $activeProject;
    if (!project) return;

    loading = true;
    error = null;
    try {
      snapshots = await progressSnapshot.loadSnapshots(project, currentYear, currentMonth);
      console.log(`[SNAPSHOT-DEBUG] fetchSnapshots: got ${snapshots.length} snapshots for "${project}", stats:`, snapshots.length > 0 ? snapshots[snapshots.length - 1] : "empty");
    } catch (err) {
      console.error("Error al cargar snapshots:", err);
      error = $_("progress.loadError");
      snapshots = [];
    } finally {
      loading = false;
    }
  }

  // Cargar snapshots para los proyectos seleccionados (gráfico multi-proyecto)
  async function loadMultiProjectSnapshots() {
    const toLoad = selectedProjects;
    if (toLoad.length === 0) {
      multiSnapshots = {};
      loadingMulti = false;
      return;
    }

    loadingMulti = true;
    try {
      const entries = await Promise.all(
        toLoad.map(async (project) => {
          const shots = await progressSnapshot.loadSnapshots(project, currentYear, currentMonth);
          return [project, shots] as const;
        }),
      );
      multiSnapshots = Object.fromEntries(entries);
    } catch (err) {
      console.error("Error al cargar snapshots multi-proyecto:", err);
      multiSnapshots = {};
    } finally {
      loadingMulti = false;
    }
  }

  // Efecto para init (solo una vez)
  $effect(() => {
    void $activeProfile;
    void $projects;

    if ($activeProfile && $projects.length > 0 && !initialized) {
      initSelection();
    }
  });

  // Efecto para recargar snapshots cuando cambia mes o proyecto activo
  $effect(() => {
    void currentYear;
    void currentMonth;
    void $activeProject;
    fetchSnapshots();
  });

  // Efecto para recargar snapshots multi-proyecto cuando cambia selección o mes
  $effect(() => {
    void currentYear;
    void currentMonth;
    void reloadKey;
    if (initialized) {
      loadMultiProjectSnapshots();
    }
  });

  // Re-fetch cuando se crea un nuevo snapshot (auto-save)
  $effect(() => {
    void $snapshotEvent;
    if (initialized) {
      fetchSnapshots();
      loadMultiProjectSnapshots();
    }
  });
</script>

<div class="progress-page">
  <!-- Navegación de mes -->
  <div class="month-header">
    <button class="nav-btn" onclick={prevMonth}>◀</button>
    <h2 class="month-title">{monthYear}</h2>
    <button class="nav-btn" onclick={nextMonth}>▶</button>
    <button class="today-btn" onclick={goToToday}>{$_("calendar.today")}</button>
  </div>

  {#if loading}
    <div class="state-msg">{$_("progress.loading")}</div>
  {:else if error}
    <div class="state-msg error">{error}</div>
  {:else if isEmpty}
    <div class="state-msg empty">
      <p>{$_("progress.noData")}</p>
      <p class="sub">{$_("progress.noDataSub")}</p>
    </div>
  {:else}
    <StatsCards total={stats?.total ?? 0} done={stats?.done ?? 0} progress={stats?.progress ?? 0} />

    <div class="charts-grid">
      <div class="chart-block">
        <div class="chart-header">
          <span class="chart-title">{$_("progress.dailyProgress")}</span>
          <ProjectSelector
            projects={selectorProjects}
            onSelectionChange={onSelectionChange}
            onColorChange={onColorChange}
          />
        </div>

        {#if selectedProjects.length === 0}
          <div class="empty-chart">
            <p>{$_("progress.selectProjects")}</p>
          </div>
        {:else if loadingMulti}
          <div class="empty-chart">
            <p>{$_("progress.loadingData")}</p>
          </div>
        {:else}
          <MultiProjectLineChart
            datasets={multiProjectData.datasets}
            labels={multiProjectData.labels}
            title={$_("progress.dailyProgress")}
          />
        {/if}
      </div>
      <div class="chart-block">
        <DonutChart data={donutData} title={$_("progress.currentStatus")} />
      </div>
    </div>
  {/if}
</div>

<style>
  .progress-page {
    max-width: 100%;
  }

  .month-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .month-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 180px;
    text-align: center;
  }

  .nav-btn {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 14px;
  }

  .nav-btn:hover {
    background: var(--bg-hover);
  }

  .today-btn {
    margin-left: auto;
    background: var(--bg-elevated);
    color: #58a6ff;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .today-btn:hover {
    background: var(--bg-hover);
  }

  .charts-grid {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .chart-block {
    background: var(--bg-surface);
    border: 1px solid var(--bg-muted);
    border-radius: 12px;
    padding: 18px;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .empty-chart {
    height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 14px;
  }

  .state-msg {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
    font-size: 15px;
  }

  .state-msg.error {
    color: var(--accent-danger);
  }

  .state-msg .sub {
    color: var(--text-muted);
    font-size: 13px;
    margin-top: 8px;
  }
</style>
