<script lang="ts">
  import {
    Chart,
    BarController,
    BarElement,
    LinearScale,
    CategoryScale,
    Title,
    Tooltip,
    Legend,
  } from "chart.js";
  import { _ } from "svelte-i18n";

  Chart.register(
    BarController,
    BarElement,
    LinearScale,
    CategoryScale,
    Title,
    Tooltip,
    Legend,
  );

  interface DailyBarData {
    labels: string[];
    data: number[];
    weekIndices: number[];
    weekLabels: string[];
  }

  let { data = [] as number[], labels = [] as string[], weekIndices = [] as number[], weekLabels = [] as string[], title = "" }: {
    data?: number[];
    labels?: string[];
    weekIndices?: number[];
    weekLabels?: string[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  // Plugin para bandas de semana, líneas divisorias y etiquetas
  const weekPlugin = {
    id: "weekBands",
    beforeDraw(chart: Chart) {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      if (!chartArea) return;
      const { top, bottom } = chartArea;

      const xScale = chart.scales.x;
      if (!xScale || labels.length === 0) return;

      // Calcular gap entre categorías para posicionamiento
      const gap = labels.length > 1
        ? Math.abs(xScale.getPixelForValue(1) - xScale.getPixelForValue(0))
        : 30;
      const halfGap = gap / 2;

      for (let w = 0; w < weekIndices.length; w++) {
        const startIdx = weekIndices[w];
        const endIdx = weekIndices[w + 1] ?? labels.length;

        const x1 = xScale.getPixelForValue(startIdx) - halfGap;
        const lastIdx = Math.min(endIdx - 1, labels.length - 1);
        const x2 = xScale.getPixelForValue(lastIdx) + halfGap;

        // Fondo alternado
        if (w % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(x1, top, x2 - x1, bottom - top);
        }

        // Línea vertical separadora antes de cada semana (excepto la primera)
        if (w > 0) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.moveTo(x1, top);
          ctx.lineTo(x1, bottom);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Etiqueta de semana centrada arriba
        ctx.fillStyle = "#8b949e";
        ctx.font = "11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelX = x1 + (x2 - x1) / 2;
        ctx.fillText(weekLabels[w], labelX, top + 4);
      }
    },
  };

  $effect(() => {
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();

    const hasData = data.length > 0 && data.some((v) => v > 0);
    if (!hasData) return;

    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: $_("chart.completedLabel"),
            data,
            backgroundColor: "#4caf50",
            borderRadius: 2,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title, color: "#e7e9ee", font: { size: 14 } },
          legend: { display: false },
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
            beginAtZero: true,
            ticks: {
              color: "#6b7280",
              precision: 0,
            },
            grid: { color: "rgba(255,255,255,0.04)" },
          },
        },
      },
      plugins: [weekPlugin],
    });

    return () => {
      const c = Chart.getChart(canvas!);
      c?.destroy();
    };
  });
</script>

<div class="chart-container" class:empty={data.length === 0 || data.every((v) => v === 0)}>
  {#if data.length === 0}
    <div class="empty-chart"><p>{$_("chart.noData")}</p></div>
  {:else if data.every((v) => v === 0)}
    <div class="empty-chart"><p>{$_("chart.noCompleted")}</p></div>
  {/if}
  <div class="chart-wrapper" class:hidden={data.length === 0 || data.every((v) => v === 0)}>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .chart-container {
    position: relative;
  }
  .chart-wrapper {
    height: 300px;
  }
  .chart-wrapper.hidden {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    width: 100%;
  }
  .empty-chart {
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    font-size: 14px;
  }
</style>
