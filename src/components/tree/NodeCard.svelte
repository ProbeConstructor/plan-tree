<script lang="ts">
  import { getNodeType, isOverdue } from "../../utils/treeUtils";
  import { draggedNodeId, focusedNodeId } from "../../stores/treeStore";

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
  } = $props();
  let cardElement: HTMLDivElement;

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
        <div
          class="title-block"
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
      {/if}

      {#if node.icon}
        <img src={node.icon} alt="icon" class="node-icon" />
      {/if}

      <span class="progress-pct">
        {progress}%
      </span>

      <span class="chevron">
        {detailsOpen ? "▴" : "▾"}
      </span>
    </div>

    {#if detailsOpen}
      <div class="bar">
        <div
          class="bar-fill"
          style="width:{progress}%;background:{progressColor};"
        ></div>
      </div>

      <div class="controls">
        <select
          class="pill status-{node.status}"
          value={node.status}
          onchange={onStatus}
        >
          <option value="todo">📋 to do</option>
          <option value="doing">🚧 doing</option>
          <option value="done">✅ done</option>
        </select>

        <select
          class="pill"
          style="--accent:{accent}"
          value={node.priority}
          onchange={onPriority}
        >
          <option value="low">💤 low</option>
          <option value="medium">📌 medium</option>
          <option value="high">🔥 high</option>
          <option value="critical">🚨 critical</option>
        </select>

        <input
          type="date"
          class="pill date-input"
          value={node.startDate}
          onchange={onStartDate}
        />

        <input
          type="date"
          class="pill date-input"
          class:overdue={isOverdue(node)}
          value={node.dueDate ?? ""}
          onchange={onDueDate}
        />
        <div class="image-controls">
          {#if node.icon}
            <img src={node.icon} alt="preview" class="icon-preview" />
            <button class="icon-btn danger" onclick={() => onRemoveIcon?.()}>🗑️</button>
          {/if}
          <button class="icon-btn" onclick={() => onPickImage?.()}>🖼️</button>
        </div>
        {#if !isRoot}
          <button
            class="icon-btn"
            onclick={onExtract}
            title="extraer a nuevo proyecto">📤</button
          >
        {/if}
        <button
          class="icon-btn"
          class:active={$focusedNodeId === node.id}
          onclick={onFocus}
        >
          🎯
        </button>
        <button class="icon-btn" onclick={onAddChild}> ＋ </button>
        <button class="icon-btn danger" onclick={onDelete}> 🗑️ </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: #1a1d24;
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

  .node {
    position: absolute;
    z-index: 1;
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
    background: #0f1115;
    border: 1px solid var(--accent);
    color: white;
    border-radius: 4px;
    padding: 2px 6px;
  }

  .bar {
    width: 150px;
    height: 6px;
    background: #0f1115;
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .actions {
    display: flex;
    gap: 6px;
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
    width: 100%;
  }

  .title-block {
    display: flex;
    flex-direction: column;

    flex: 1;
    min-width: 0;
  }

  .title {
    display: block;

    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .node-icon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .progress-pct {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 11px;
  }

  .image-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .icon-preview {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
  }

  .chevron {
    flex-shrink: 0;
  }
</style>
