<script lang="ts">
  import {
    Chart,
    DoughnutController,
    ArcElement,
    Title,
    Tooltip,
    Legend,
  } from "chart.js";
  import { _ } from "svelte-i18n";
  import { currentTheme } from "../../stores/themeStore";

  Chart.register(DoughnutController, ArcElement, Title, Tooltip, Legend);

  let { data = [] as { label: string; value: number; color: string }[], title = "" }: {
    data?: { label: string; value: number; color: string }[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  const isEmpty = $derived(data.length === 0 || data.every((d) => d.value === 0));

  $effect(() => {
    const _theme = $currentTheme;
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();

    if (isEmpty) return;

    // Read CSS custom properties for theming
    const styles = getComputedStyle(document.documentElement);
    const bgSidebar = styles.getPropertyValue('--bg-sidebar').trim() || '#17191d';
    const textPrimary = styles.getPropertyValue('--text-primary').trim() || '#e7e9ee';
    const textSecondary = styles.getPropertyValue('--text-secondary').trim() || '#9aa1ab';

    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => d.color),
            borderColor: bgSidebar,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title, color: textPrimary, font: { size: 14 } },
          legend: {
            position: "bottom",
            labels: { color: textSecondary, font: { size: 11 }, boxWidth: 12, padding: 8 },
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
    <div class="empty-chart"><p>{$_("chart.noData")}</p></div>
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
    color: var(--text-muted);
    font-size: 14px;
  }
</style>
