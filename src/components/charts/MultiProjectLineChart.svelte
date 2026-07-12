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
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();

    if (datasets.length === 0 || labels.length === 0) return;

    const chartDatasets = datasets.map((ds, i) => ({
      label: ds.project,
      data: ds.data,
      borderColor: ds.color ?? defaultColors[i % defaultColors.length],
      backgroundColor: ds.color
        ? ds.color + "1a"  // ~10% opacity hex
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
            color: "#e7e9ee",
            font: { size: 14 },
          },
          legend: {
            labels: {
              color: "#9aa1ab",
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
              color: "#6b7280",
              maxTicksLimit: 31,
              autoSkip: true,
              maxRotation: 0,
            },
            grid: { color: "rgba(255,255,255,0.04)" },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: "#6b7280",
              callback: (v) => `${v}%`,
            },
            grid: { color: "rgba(255,255,255,0.04)" },
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
    color: #6b7280;
    font-size: 14px;
  }
</style>
