<script lang="ts">
  import { getContext } from "svelte";
  import { isOverdue } from "../../utils/treeUtils";
  import { isValidIconDataUri } from "../../utils/validation";
  import { getPanelInstance } from "../../stores/panelRegistry";
  import type { PanelId, TreeNode } from "../../types";

  const panelId: PanelId = getContext("panelId") ?? "left";
  const instance = getPanelInstance(panelId);
  const focusedNodeId = instance.focusedNodeId;

  let {
    node,
    progress,
    progressColor,
    accent,
    isRoot,
    onStatus,
    onPriority,
    onStartDate,
    onDueDate,
    onExtract,
    onFocus,
    onAddChild,
    onOpenDetailsModal,
    onDelete,
    onPickImage,
    onRemoveIcon,
  }: {
    node: TreeNode;
    progress: number;
    progressColor: string;
    accent: string;
    isRoot: boolean;
    onStatus: (e: Event) => void;
    onPriority: (e: Event) => void;
    onStartDate: (e: Event) => void;
    onDueDate: (e: Event) => void;
    onExtract?: () => void;
    onFocus: () => void;
    onAddChild: () => void;
    onOpenDetailsModal: () => void;
    onDelete: () => void;
    onPickImage?: () => void;
    onRemoveIcon?: () => void;
  } = $props();
</script>

<div class="bar">
  <div
    class="bar-fill"
    style="width:{progress}%;background:{progressColor};"
  ></div>
</div>

<div class="controls">
  <div class="select-row">
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
  </div>

  <div class="date-row">
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
  </div>

  <div class="image-controls">
    {#if isValidIconDataUri(node.icon)}
      <img src={node.icon} alt="preview" class="icon-preview" />
      <button class="icon-btn danger" onclick={() => onRemoveIcon?.()}>🗑️</button>
    {/if}
    <button class="icon-btn" onclick={() => onPickImage?.()}>🖼️</button>
  </div>

  <div class="action-grid">
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
    <button class="icon-btn" onclick={onOpenDetailsModal}> 📝 </button>
    <button class="icon-btn danger" onclick={onDelete}> 🗑️ </button>
  </div>
</div>

<style>
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
    gap: 6px;
  }

  .select-row {
    display: flex;
    gap: 6px;
  }

  .select-row select {
    flex: 1;
    min-width: 0;
  }

  .date-row {
    display: flex;
    gap: 6px;
  }

  .date-row input {
    flex: 1;
    min-width: 0;
  }

  .image-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .icon-preview {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #1f2329;
    color: #e7e9ee;
    border: 1px solid #30363d;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    flex-shrink: 0;
  }

  .icon-btn:hover {
    background: #2b3138;
  }

  .icon-btn.active {
    background: rgba(250, 204, 21, 0.15);
    border-color: #facc15;
  }

  .icon-btn.danger {
    color: #ef4444;
  }

  .icon-btn.danger:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
  }

  .action-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>
