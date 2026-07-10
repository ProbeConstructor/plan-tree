<script lang="ts">
  import { isOverdue } from "../../utils/treeUtils";
  import { isValidIconDataUri } from "../../utils/validation";
  import { focusedNodeId } from "../../stores/treeStore";
  import type { TreeNode } from "../../types";

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
    {#if isValidIconDataUri(node.icon)}
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
  <button class="icon-btn" onclick={onOpenDetailsModal}> 📝 </button>
  <button class="icon-btn danger" onclick={onDelete}> 🗑️ </button>
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
    gap: 8px;
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
</style>
