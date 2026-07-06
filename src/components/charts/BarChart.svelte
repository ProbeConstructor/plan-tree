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

  Chart.register(
    BarController,
    BarElement,
    LinearScale,
    CategoryScale,
    Title,
    Tooltip,
    Legend,
  );

  let { data = [] as { week: number; completions: number }[], title = "Completados por semana" }: {
    data?: { week: number; completions: number }[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();

    if (data.length === 0) return;

    new Chart(canvas, {
      type: "bar",
      data: {
        labels: data.map((d) => `Semana ${d.week}`),
        datasets: [
          {
            label: "Completados",
            data: data.map((d) => Math.max(0, d.completions)),
            backgroundColor: "#4caf50",
            borderRadius: 4,
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
            ticks: { color: "#6b7280" },
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
    });

    return () => {
      const c = Chart.getChart(canvas!);
      c?.destroy();
    };
  });
</script>

<div class="chart-container" class:empty={data.length === 0}>
  {#if data.length === 0}
    <div class="empty-chart"><p>Sin datos para mostrar</p></div>
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
    color: #6b7280;
    font-size: 14px;
  }
</style>
