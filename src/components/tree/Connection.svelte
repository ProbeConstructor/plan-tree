<script lang="ts">
  let { x1, y1, x2, y2 } = $props();

  const path = $derived.by(() => {
    const midY = (y1 + y2) / 2;

    return `
        M ${x1} ${y1}
        C ${x1} ${midY},
          ${x2} ${midY},
          ${x2} ${y2}
    `;
  });
</script>

<path class="connection" d={path} fill="none" stroke-width="2" />

<style>
  .connection {
    stroke: var(--text-muted);
  }
</style>
