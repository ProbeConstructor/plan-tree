<script lang="ts">
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Title,
    Tooltip,
    Legend,
    Filler,
  } from "chart.js";
  import { _ } from "svelte-i18n";
  import { currentTheme } from "../../stores/themeStore";

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Title,
    Tooltip,
    Legend,
    Filler,
  );

  interface LineData {
    date: string;
    global: number;
    branches: Record<string, number>;
  }

  let { data = [] as LineData[], title = "" }: {
    data?: LineData[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    const _theme = $currentTheme;
    if (!canvas) return;

    // Destruir SIEMPRE cualquier chart existente en este canvas
    // Chart.getChart evita el error "Canvas is already in use"
    const existing = Chart.getChart(canvas);
    existing?.destroy();

    if (data.length === 0) return;

    // Read CSS custom properties for theming
    const styles = getComputedStyle(document.documentElement);
    const textPrimary = styles.getPropertyValue('--text-primary').trim() || '#e7e9ee';
    const textSecondary = styles.getPropertyValue('--text-secondary').trim() || '#9aa1ab';
    const textMuted = styles.getPropertyValue('--text-muted').trim() || '#6b7280';
    const chartGrid = styles.getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.04)';

    const labels = data.map((d) => {
      return String(parseInt(d.date.slice(8, 10), 10));
    });

    const branchNames = new Set<string>();
    for (const d of data) {
      for (const name of Object.keys(d.branches)) {
        branchNames.add(name);
      }
    }

    const branchColors = [
      "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6",
      "#ec4899", "#14b8a6", "#f97316", "#84cc16",
    ];

    const datasets: import("chart.js").ChartDataset<"line">[] = [
      {
        label: "Global",
        data: data.map((d) => d.global),
        borderColor: "#4caf50",
        backgroundColor: "rgba(76, 175, 80, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      ...Array.from(branchNames).map((name, i) => ({
        label: name,
        data: data.map((d) => d.branches[name] ?? null),
        borderColor: branchColors[i % branchColors.length],
        backgroundColor: "transparent",
        borderDash: [4, 3],
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 1.5,
      })),
    ];

    new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title, color: textPrimary, font: { size: 14 } },
          legend: {
            labels: { color: textSecondary, font: { size: 11 }, boxWidth: 12, padding: 8 },
          },
        },
        scales: {
          x: {
            ticks: { color: textMuted },
            grid: { color: chartGrid },
          },
          y: {
            min: 0,
            max: 100,
            ticks: { color: textMuted, callback: (v) => `${v}%` },
            grid: { color: chartGrid },
          },
        },
      },
    });

    return () => {
      const c = Chart.getChart(canvas!);
      c?.destroy();
    };
  });
</script>

<div class="chart-container" class:empty={data.length === 0}>
  {#if data.length === 0}
    <div class="empty-chart"><p>{$_("chart.noData")}</p></div>
  {/if}
  <div class="chart-wrapper" class:hidden={data.length === 0}>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .chart-container {
    position: relative;
  }
  .chart-wrapper {
    height: 260px;
  }
  .chart-wrapper.hidden {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    width: 100%;
  }
  .empty-chart {
    height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 14px;
  }
</style>
