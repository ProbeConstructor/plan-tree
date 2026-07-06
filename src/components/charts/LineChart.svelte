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

  let { data = [] as LineData[], title = "Progreso diario" }: {
    data?: LineData[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    if (!canvas) return;

    // Destruir SIEMPRE cualquier chart existente en este canvas
    // Chart.getChart evita el error "Canvas is already in use"
    const existing = Chart.getChart(canvas);
    existing?.destroy();

    if (data.length === 0) return;

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
          title: { display: true, text: title, color: "#e7e9ee", font: { size: 14 } },
          legend: {
            labels: { color: "#9aa1ab", font: { size: 11 }, boxWidth: 12, padding: 8 },
          },
        },
        scales: {
          x: {
            ticks: { color: "#6b7280" },
            grid: { color: "rgba(255,255,255,0.04)" },
          },
          y: {
            min: 0,
            max: 100,
            ticks: { color: "#6b7280", callback: (v) => `${v}%` },
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
