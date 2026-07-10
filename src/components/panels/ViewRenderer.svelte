<script lang="ts">
  import type { View } from "../../stores/panelStore";
  import TreeCanvas from "../tree/TreeCanvas.svelte";
  import Calendar from "../../pages/Calendar.svelte";
  import Progress from "../../pages/Progress.svelte";
  import Dashboard from "../../pages/Dashboard.svelte";

  let { view }: { view: View } = $props();
</script>

{#if view === "tree"}
  <div id="tree-anchor"></div>
  <div class="tree-viewport">
    <div class="tree-canvas">
      <TreeCanvas />
    </div>
  </div>
{:else if view === "calendar"}
  <Calendar />
{:else if view === "progress"}
  <Progress />
{:else if view === "dashboard"}
  <Dashboard />
{/if}

<style>
  .tree-viewport {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
</style>
