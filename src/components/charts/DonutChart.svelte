<script lang="ts">
  import {
    Chart,
    DoughnutController,
    ArcElement,
    Title,
    Tooltip,
    Legend,
  } from "chart.js";

  Chart.register(DoughnutController, ArcElement, Title, Tooltip, Legend);

  let { data = [] as { label: string; value: number; color: string }[], title = "Estado actual" }: {
    data?: { label: string; value: number; color: string }[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  const isEmpty = $derived(data.length === 0 || data.every((d) => d.value === 0));

  $effect(() => {
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();

    if (isEmpty) return;

    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => d.color),
            borderColor: "#17191d",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title, color: "#e7e9ee", font: { size: 14 } },
          legend: {
            position: "bottom",
            labels: { color: "#9aa1ab", font: { size: 11 }, boxWidth: 12, padding: 8 },
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

<div class="chart-container" class:empty={isEmpty}>
  {#if isEmpty}
    <div class="empty-chart"><p>Sin datos para mostrar</p></div>
  {/if}
  <div class="chart-wrapper" class:hidden={isEmpty}>
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
