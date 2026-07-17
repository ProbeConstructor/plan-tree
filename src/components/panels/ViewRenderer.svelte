<script lang="ts">
  import { setContext } from "svelte";
  import type { View } from "../../stores/panelStore";
  import type { PanelId } from "../../types";
  import { getView } from "../../stores/viewRegistry";
  import TreeCanvas from "../tree/TreeCanvas.svelte";
  import ErrorBoundary from "../ErrorBoundary.svelte";

  let { view, panelId }: { view: View; panelId: PanelId } = $props();

  // Inject panelId into Svelte context so children can access it
  setContext("panelId", panelId);

  // Resolve view component from registry (built-in or plugin-registered)
  let ViewComponent = $derived(getView(view) ?? TreeCanvas);
</script>

<ErrorBoundary>
  {#snippet children()}
    {#if view === "tree"}
      <div id="tree-anchor"></div>
      <div class="tree-viewport">
        <div class="tree-canvas">
          <svelte:component this={ViewComponent} />
        </div>
      </div>
    {:else}
      <svelte:component this={ViewComponent} />
    {/if}
  {/snippet}
</ErrorBoundary>

<style>
  .tree-viewport {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
</style>
