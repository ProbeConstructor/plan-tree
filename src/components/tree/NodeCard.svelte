<script lang="ts">
  import { getContext } from "svelte";
  import { getNodeType } from "../../utils/treeUtils";
  import { getPanelInstance } from "../../stores/panelRegistry";
  import type { PanelId } from "../../types";
  import { tagDefs } from "../../stores/tagStore";
  import TagCapsules from "./TagCapsules.svelte";
  import TagPopover from "./TagPopover.svelte";
  import CommentPopover from "./CommentPopover.svelte";
  import NodeTitleControls from "./NodeTitleControls.svelte";
  import NodeDetailsPanel from "./NodeDetailsPanel.svelte";

  const panelId: PanelId = getContext("panelId") ?? "left";
  const instance = getPanelInstance(panelId);
  const draggedNodeId = instance.draggedNodeId;
  const focusedNodeId = instance.focusedNodeId;

  let {
    node,
    depth,
    path,
    progress,
    progressColor,
    accent,
    hasChildren,
    dragOver,
    isRoot,
    dimmed,
    editing = $bindable(),
    tempTitle = $bindable(),
    detailsOpen = $bindable(),
    onToggle,
    onToggleDetails,
    onAddChild,
    onDelete,
    onFocus,
    onExtract,
    onSaveTitle,
    onStatus,
    onPriority,
    onStartDate,
    onDueDate,
    focusOnMount,
    onStartEditing,
    onHeightChange,
    onPickImage,
    onRemoveIcon,
    onOpenDetailsModal,
    onFavorite,
  } = $props();

  let cardElement: HTMLDivElement;
  let showCommentPopover = $state(false);
  let showTagPopover = $state(false);

  import { tick } from "svelte";

  $effect(() => {
    detailsOpen;

    tick().then(() => {
      if (!cardElement) return;

      onHeightChange?.(cardElement.offsetHeight);
    });
  });
</script>

<div
  class="card"
  role="group"
  style="--accent:{accent}"
  class:done={node.status === "done"}
  class:dragging={$draggedNodeId === node.id}
  class:drag-over={dragOver}
  class:dimmed
  class:focused-card={$focusedNodeId === node.id}
  bind:this={cardElement}
>
  <span class:hidden={isRoot} class="grip"> ⠿ </span>

  <button class="toggle" onclick={onToggle} disabled={!hasChildren}>
    {#if hasChildren}
      {node.expanded ? "▾" : "▸"}
    {:else}
      ·
    {/if}
  </button>

  <div class="main">
    <div
      class="title-row"
      tabindex={editing ? -1 : 0}
      role="button"
      onclick={onToggleDetails}
      onkeydown={(e: KeyboardEvent) => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleDetails();
        }
      }}
    >
      {#if editing}
        <input
          class="title-input"
          bind:value={tempTitle}
          onTempTitleChange={(value: string) => {
            tempTitle = value;
          }}
          use:focusOnMount
          onblur={onSaveTitle}
          onkeydown={(e: KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              onSaveTitle();
            }
          }}
        />
      {:else}
        <NodeTitleControls
          {node}
          {progress}
          {detailsOpen}
          bind:commentOpen={showCommentPopover}
          bind:tagOpen={showTagPopover}
          onFavorite={onFavorite}
        />

        <div
          class="title-text"
          tabindex="0"
          role="button"
          ondblclick={(e) => {
            e.stopPropagation();
            onStartEditing();
          }}
          onkeydown={(e: KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onStartEditing();
            }
          }}
        >
          <small class="node-type">
            {getNodeType(depth)}
          </small>

          <strong class="title">
            {path} · {node.title}
          </strong>
        </div>

        {#if !editing && (node.tags ?? []).length > 0}
          <TagCapsules tags={node.tags} tagDefs={$tagDefs} />
        {/if}
      {/if}
    </div>

    {#if showCommentPopover}
      <div class="popover-anchor">
        <CommentPopover
          comments={node.comments ?? ""}
          onEdit={() => {
            showCommentPopover = false;
            onOpenDetailsModal();
          }}
          onClose={() => (showCommentPopover = false)}
        />
      </div>
    {/if}

    {#if showTagPopover}
      <div class="popover-anchor">
        <TagPopover
          nodeTags={node.tags ?? []}
          nodeId={node.id}
          onClose={() => (showTagPopover = false)}
        />
      </div>
    {/if}

    {#if detailsOpen}
      <NodeDetailsPanel
        {node}
        {progress}
        {progressColor}
        {accent}
        {isRoot}
        {onStatus}
        {onPriority}
        {onStartDate}
        {onDueDate}
        {onExtract}
        {onFocus}
        {onAddChild}
        {onOpenDetailsModal}
        {onDelete}
        {onPickImage}
        {onRemoveIcon}
      />
    {/if}
  </div>
</div>

<style>
  .card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: #1a1d24;
    position: relative;
    border: 1px solid #262b33;
    border-left: 4px solid var(--accent);
    border-radius: 10px;
    padding: 10px 12px;
    min-width: 260px;
    width: 260px;
    max-width: 260px;
  }

  .card.done {
    opacity: 0.55;
  }

  .card.done .title {
    text-decoration: line-through;
  }

  .card.dragging {
    opacity: 0.4;
  }

  .card.drag-over {
    outline: 2px dashed var(--accent);
    outline-offset: 3px;
  }

  .card.focused-card {
    outline: 2px solid #facc15;
    box-shadow: 0 0 14px rgba(250, 204, 21, 0.35);
  }

  .toggle,
  .grip {
    flex-shrink: 0;
  }
  .grip {
    cursor: grab;
  }

  .hidden {
    visibility: hidden;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    width: 100%;
  }

  .title-input {
    flex: 1;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    background: #0f1115;
    border: 1px solid var(--accent);
    color: white;
    border-radius: 4px;
    padding: 2px 6px;
  }

  .title-row {
    display: flex;
    cursor: pointer;
    width: 100%;
  }
  .title-row:not(.editing) {
    flex-direction: column;
    gap: 4px;
  }


  .title-text {
    width: 100%;
  }

  .title {
    display: block;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .popover-anchor {
    position: relative;
  }
</style>
