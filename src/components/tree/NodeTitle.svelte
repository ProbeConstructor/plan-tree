<script lang="ts">
  import type { TreeNode } from "../../types";
  import { getNodeType } from "../../utils/treeUtils";

  export let node: TreeNode;
  export let depth: number;
  export let path: string;

  export let progress: number;

  export let editing: boolean;
  export let tempTitle: string;
  export let detailsOpen: boolean;

  export let toggleDetails: () => void;
  export let handleTitleRowKeydown: (e: KeyboardEvent) => void;
  export let saveTitle: () => void;
  export let focusOnMount: (el: HTMLInputElement) => void;
</script>

<div
  class="title-row"
  role="button"
  tabindex="0"
  on:click={toggleDetails}
  on:keydown={handleTitleRowKeydown}
>
  {#if editing}
    <input
      class="title-input"
      bind:value={tempTitle}
      on:blur={saveTitle}
      on:keydown|stopPropagation={(e) => e.key === "Enter" && saveTitle()}
      on:click|stopPropagation
      use:focusOnMount
    />
  {:else}
    <div
      class="title-block"
      role="button"
      tabindex="0"
      aria-label="Edit title"
      on:dblclick|stopPropagation={() => {
        editing = true;
        tempTitle = node.title;
      }}
      on:keydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          editing = true;
          tempTitle = node.title;
          e.preventDefault();
        }
      }}
    >
      <small class="node-type">{getNodeType(depth)}</small>
      <strong class="title">{path} · {node.title}</strong>
    </div>
  {/if}

  <span class="progress-pct">
    {progress}%
  </span>

  <span class="chevron">
    {detailsOpen ? "▴" : "▾"}
  </span>
</div>

<style>
  .title-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    cursor: pointer;
    border-radius: 6px;
  }
  .title-row:hover {
    background: var(--bg-hover);
  }
  .title-row:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .title-block {
    display: flex;
    flex-direction: column;
    cursor: text;
  }
  .node-type {
    color: var(--text-muted);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .title {
    color: var(--text-primary);
    font-size: 14px;
  }
  .title-input {
    background: var(--bg-deepest);
    border: 1px solid var(--accent);
    color: var(--text-primary);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 14px;
  }
  .progress-pct {
    color: var(--text-muted);
    font-size: 11px;
    margin-left: auto;
  }
  .chevron {
    color: var(--text-muted);
    font-size: 10px;
    margin-left: 4px;
  }
</style>
