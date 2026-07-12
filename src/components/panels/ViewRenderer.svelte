<script lang="ts">
  import { setContext } from "svelte";
  import type { View } from "../../stores/panelStore";
  import type { PanelId } from "../../types";
  import TreeCanvas from "../tree/TreeCanvas.svelte";
  import Calendar from "../../pages/Calendar.svelte";
  import Progress from "../../pages/Progress.svelte";
  import Dashboard from "../../pages/Dashboard.svelte";

  let { view, panelId }: { view: View; panelId: PanelId } = $props();

  // Inject panelId into Svelte context so children can access it
  setContext("panelId", panelId);
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
