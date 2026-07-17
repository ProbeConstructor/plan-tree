<script lang="ts">
  import { isValidIconDataUri } from "../../utils/validation";
  import { openModal } from "../../stores/modalStore";
  import RecurrenceConfigModal from "../RecurrenceConfigModal.svelte";
  import type { TreeNode } from "../../types";

  let {
    node,
    progress,
    detailsOpen,
    onFavorite,
    commentOpen = $bindable(false),
    tagOpen = $bindable(false),
  }: {
    node: TreeNode;
    progress: number;
    detailsOpen: boolean;
    onFavorite?: () => void;
    commentOpen?: boolean;
    tagOpen?: boolean;
  } = $props();
</script>

<div class="title-controls">
  <button
    class="star-btn"
    class:fav={node.favorite}
    onclick={(e: MouseEvent) => {
      e.stopPropagation();
      onFavorite?.();
    }}
    title={node.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
  >
    {node.favorite ? '⭐' : '☆'}
  </button>

  <button
    class="recurrence-badge"
    class:active={!!node.recurrence}
    onclick={(e: MouseEvent) => {
      e.stopPropagation();
      openModal(RecurrenceConfigModal, { nodeId: node.id });
    }}
    title={node.recurrence ? 'Repetición configurada' : 'Configurar repetición'}
  >
    ♻️
  </button>

  <button
    class="comment-btn"
    class:has-comments={node.comments}
    onclick={(e: MouseEvent) => {
      e.stopPropagation();
      commentOpen = !commentOpen;
    }}
    title="Comentarios"
  >
    💬
  </button>

  <button
    class="tag-btn"
    class:has-tags={(node.tags ?? []).length > 0}
    onclick={(e: MouseEvent) => {
      e.stopPropagation();
      tagOpen = !tagOpen;
    }}
    title="Etiquetas"
  >
    🏷️
  </button>

  {#if isValidIconDataUri(node.icon)}
    <img src={node.icon} alt="icon" class="node-icon" />
  {/if}

  <span class="progress-pct">
    {progress}%
  </span>

  <span class="chevron">
    {detailsOpen ? "▴" : "▾"}
  </span>
</div>

<style>
  .title-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
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

  .chevron {
    flex-shrink: 0;
  }

  .comment-btn {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 12px;
    padding: 1px 4px;
    border-radius: 4px;
    line-height: 1;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .comment-btn:hover {
    opacity: 1;
    background: var(--bg-muted);
  }

  .star-btn {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 16px;
    padding: 1px 4px;
    border-radius: 4px;
    line-height: 1;
    flex-shrink: 0;
    opacity: 1;
    color: var(--text-secondary);
    transition: opacity 0.15s, border-color 0.15s, background 0.15s;
    border-color: var(--border-default);
  }

  .star-btn:hover {
    opacity: 1;
    background: var(--bg-muted);
    border-color: var(--border-strong);
  }

  .star-btn.fav {
    opacity: 1;
    border-color: transparent;
  }

  .recurrence-badge {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 14px;
    padding: 1px 4px;
    border-radius: 4px;
    line-height: 1;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.15s, border-color 0.15s, background 0.15s;
  }

  .recurrence-badge:hover {
    opacity: 1;
    background: var(--bg-muted);
    border-color: var(--border-default);
  }

  .recurrence-badge.active {
    opacity: 1;
    border-color: var(--accent-warning);
    background: rgba(250, 204, 21, 0.1);
  }

  .comment-btn.has-comments {
    opacity: 1;
    border-color: var(--accent-primary);
    background: rgba(59, 130, 246, 0.1);
  }

  .tag-btn {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 12px;
    padding: 1px 4px;
    border-radius: 4px;
    line-height: 1;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .tag-btn:hover {
    opacity: 1;
    background: var(--bg-muted);
  }

  .tag-btn.has-tags {
    opacity: 1;
    border-color: var(--accent-purple);
    background: rgba(168, 85, 247, 0.1);
  }
</style>
