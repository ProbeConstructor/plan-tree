<script lang="ts">
  import { panelLayout } from "../../stores/panelStore";
  import ViewRenderer from "./ViewRenderer.svelte";
  import PanelDivider from "./PanelDivider.svelte";

  let leftPanel: HTMLDivElement;
  let rightPanel: HTMLDivElement;
  let focusHighlight = $state<"left" | "right" | null>(null);
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;

  function triggerHighlight(which: "left" | "right") {
    if (fadeTimer) clearTimeout(fadeTimer);
    focusHighlight = which;
    fadeTimer = setTimeout(() => { focusHighlight = null; }, 2000);
  }

  function focusLeft() {
    panelLayout.focusPanel("left");
    leftPanel?.focus();
    triggerHighlight("left");
  }

  function focusRight() {
    panelLayout.focusPanel("right");
    rightPanel?.focus();
    triggerHighlight("right");
  }
</script>

<div class="panel-container">
  <div
    class="panel"
    class:focused={$panelLayout.rightView === null || $panelLayout.focused === "left"}
    class:highlight={focusHighlight === "left"}
    style:flex={$panelLayout.rightView !== null ? `0 0 ${$panelLayout.splitPosition}%` : '1'}
    bind:this={leftPanel}
    tabindex="-1"
    on:click={focusLeft}
    on:keydown={(e) => { if (e.key === "Enter" || e.key === " ") focusLeft(); }}
    role="region"
    aria-label="Left panel"
  >
    <ViewRenderer view={$panelLayout.leftView} panelId="left" />
  </div>

  {#if $panelLayout.rightView !== null}
    <PanelDivider />
    <div
      class="panel panel-right"
      style:flex="1 1 0"
      class:focused={$panelLayout.focused === "right"}
      class:highlight={focusHighlight === "right"}
      bind:this={rightPanel}
      tabindex="-1"
      on:click={focusRight}
      on:keydown={(e) => { if (e.key === "Enter" || e.key === " ") focusRight(); }}
      role="region"
      aria-label="Right panel"
    >
      <ViewRenderer view={$panelLayout.rightView} panelId="right" />
    </div>
  {:else}
    <button class="open-btn" on:click={() => panelLayout.openSplit()}>↤</button>
  {/if}
</div>

<style>
  .panel-container {
    display: flex;
    flex-direction: row;
    height: 100%;
    overflow: hidden;
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .panel {
    display: flex;
    flex-direction: column;
    overflow: auto;
    position: relative;
    min-width: 0;
    border: 1px solid transparent;
    transition: border-color 0.3s ease;
  }

  .panel-right {
    border-left: 1px solid #2a2f37;
  }

  .panel.focused {
    /* no persistent visual — handled by .highlight */
  }

  .panel.highlight {
    border-color: #22c55e;
  }

  .open-btn {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    background: #1f2329;
    border: 1px solid #2a2f37;
    border-right: none;
    border-radius: 6px 0 0 6px;
    padding: 10px 6px;
    cursor: pointer;
    font-size: 18px;
    color: #9aa1ab;
    z-index: 5;
    line-height: 1;
  }

  .open-btn:hover {
    background: #2b3138;
    color: white;
  }
</style>
