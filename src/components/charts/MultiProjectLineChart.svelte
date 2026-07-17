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

  interface Dataset {
    project: string;
    data: number[];
    color?: string;
  }

  let {
    datasets = [] as Dataset[],
    labels = [] as number[],
    title = "",
  }: {
    datasets?: Dataset[];
    labels?: number[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  // Default palette for datasets without explicit color
  const defaultColors = [
    "#4caf50", "#2196f3", "#ff9800", "#f44336",
    "#9c27b0", "#e91e63", "#00bcd4", "#cddc39",
  ];

  $effect(() => {
    const _theme = $currentTheme;
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();

    if (datasets.length === 0 || labels.length === 0) return;

    // Read CSS custom properties for theming
    const styles = getComputedStyle(document.documentElement);
    const textPrimary = styles.getPropertyValue('--text-primary').trim() || '#e7e9ee';
    const textSecondary = styles.getPropertyValue('--text-secondary').trim() || '#9aa1ab';
    const textMuted = styles.getPropertyValue('--text-muted').trim() || '#6b7280';
    const chartGrid = styles.getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.04)';

    const chartDatasets = datasets.map((ds, i) => ({
      label: ds.project,
      data: ds.data,
      borderColor: ds.color ?? defaultColors[i % defaultColors.length],
      backgroundColor: ds.color
        ? ds.color + "1a"
        : defaultColors[i % defaultColors.length] + "1a",
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      borderWidth: 2,
    }));

    new Chart(canvas, {
      type: "line",
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          title: {
            display: true,
            text: title,
            color: textPrimary,
            font: { size: 14 },
          },
          legend: {
            labels: {
              color: textSecondary,
              font: { size: 11 },
              boxWidth: 12,
              padding: 8,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                return `${ctx.dataset.label}: ${ctx.parsed.y}%`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textMuted,
              maxTicksLimit: 31,
              autoSkip: true,
              maxRotation: 0,
            },
            grid: { color: chartGrid },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: textMuted,
              callback: (v) => `${v}%`,
            },
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

<div class="chart-container" class:empty={datasets.length === 0}>
  {#if datasets.length === 0}
    <div class="empty-chart">
      <p>{$_("progress.selectProjects")}</p>
    </div>
  {/if}
  <div class="chart-wrapper" class:hidden={datasets.length === 0}>
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
