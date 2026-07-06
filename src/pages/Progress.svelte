<script lang="ts">
  import { activeProject } from "../stores/workspaceStore";
  import { progressSnapshot } from "../services/progressSnapshotService";
  import type { Snapshot } from "../types";
  import {
    snapshotsToDailyLineData,
    snapshotsToWeeklyBarData,
    snapshotToDonutData,
    snapshotToStats,
  } from "../utils/chartDataUtils";
  import LineChart from "../components/charts/LineChart.svelte";
  import BarChart from "../components/charts/BarChart.svelte";
  import DonutChart from "../components/charts/DonutChart.svelte";
  import StatsCards from "../components/charts/StatsCards.svelte";

  const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  let currentYear = $state(new Date().getFullYear());
  let currentMonth = $state(new Date().getMonth()); // 0-indexed
  let snapshots = $state<Snapshot[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  let monthYear = $derived(`${MONTHS[currentMonth]} ${currentYear}`);

  let lineData = $derived(snapshotsToDailyLineData(snapshots));
  let barData = $derived(snapshotsToWeeklyBarData(snapshots));
  let donutData = $derived(snapshotToDonutData(snapshots));
  let stats = $derived(snapshotToStats(snapshots));
  let isEmpty = $derived(snapshots.length === 0 && !loading && !error);

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

  async function fetchSnapshots() {
    const project = $activeProject;
    if (!project) return;

    loading = true;
    error = null;
    try {
      snapshots = await progressSnapshot.loadSnapshots(project, currentYear, currentMonth);
    } catch (err) {
      console.error("Error al cargar snapshots:", err);
      error = "Error al cargar datos de progreso.";
      snapshots = [];
    } finally {
      loading = false;
    }
  }

  // Cargar al montar y al cambiar mes/año
  $effect(() => {
    // Leer las reactivas para que Svelte trackee dependencias
    void currentYear;
    void currentMonth;
    void $activeProject;
    fetchSnapshots();
  });
</script>

<div class="progress-page">
  <!-- Navegación de mes -->
  <div class="month-header">
    <button class="nav-btn" onclick={prevMonth}>◀</button>
    <h2 class="month-title">{monthYear}</h2>
    <button class="nav-btn" onclick={nextMonth}>▶</button>
    <button class="today-btn" onclick={goToToday}>Hoy</button>
  </div>

  {#if loading}
    <div class="state-msg">Cargando...</div>
  {:else if error}
    <div class="state-msg error">{error}</div>
  {:else if isEmpty}
    <div class="state-msg empty">
      <p>No hay datos para este mes</p>
      <p class="sub">Los snapshots se capturan automáticamente al guardar el árbol.</p>
    </div>
  {:else}
    <StatsCards total={stats?.total ?? 0} done={stats?.done ?? 0} progress={stats?.progress ?? 0} />

    <div class="charts-grid">
      <div class="chart-block">
        <LineChart data={lineData} title="Progreso diario" />
      </div>
      <div class="chart-block">
        <BarChart data={barData} title="Completados por semana" />
      </div>
      <div class="chart-block">
        <DonutChart data={donutData} title="Estado actual" />
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
    color: #e7e9ee;
    min-width: 180px;
    text-align: center;
  }

  .nav-btn {
    background: #1f2329;
    color: #e7e9ee;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 14px;
  }

  .nav-btn:hover {
    background: #2b3138;
  }

  .today-btn {
    margin-left: auto;
    background: #1f2329;
    color: #58a6ff;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .today-btn:hover {
    background: #2b3138;
  }

  .charts-grid {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .chart-block {
    background: #1a1d24;
    border: 1px solid #262b33;
    border-radius: 12px;
    padding: 18px;
  }

  .state-msg {
    text-align: center;
    padding: 60px 20px;
    color: #9aa1ab;
    font-size: 15px;
  }

  .state-msg.error {
    color: #ef4444;
  }

  .state-msg .sub {
    color: #6b7280;
    font-size: 13px;
    margin-top: 8px;
  }
</style>
