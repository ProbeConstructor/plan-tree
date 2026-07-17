<script lang="ts">
  import { renderMarkdown } from "../../utils/renderMarkdown";
  import { onMount } from "svelte";

  let {
    comments,
    onEdit,
    onClose,
  }: {
    comments: string;
    onEdit: () => void;
    onClose?: () => void;
  } = $props();

  let popoverEl: HTMLDivElement;

  function close() {
    onClose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  onMount(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverEl && !popoverEl.contains(e.target as Node)) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div class="popover" bind:this={popoverEl} role="dialog" tabindex="-1">
  <div class="popover-header">
    <span class="label">Comentarios</span>
    <button class="close-btn" onclick={close}>✕</button>
  </div>

  <div class="content">
    {#if comments}
      {@html renderMarkdown(comments)}
    {:else}
      <p class="empty">Sin comentarios</p>
    {/if}
  </div>

  <div class="popover-footer">
    <button class="edit-btn" onclick={onEdit}>
      ✏️ Editar en modal
    </button>
  </div>
</div>

<style>
  .popover {
    position: absolute;
    z-index: 1000;
    top: calc(100% + 6px);
    left: 0;
    width: 320px;
    max-height: 360px;
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-default);
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .close-btn:hover {
    background: var(--bg-muted);
    color: var(--text-primary);
  }

  .content {
    padding: 12px;
    overflow-y: auto;
    flex: 1;
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.5;
  }

  /* Markdown rendered styles */
  .content :global(h1),
  .content :global(h2),
  .content :global(h3),
  .content :global(h4) {
    color: var(--text-primary);
    margin: 8px 0 4px;
    font-size: 14px;
  }

  .content :global(h1) { font-size: 16px; }
  .content :global(h2) { font-size: 15px; }
  .content :global(h3) { font-size: 14px; }

  .content :global(p) {
    margin: 4px 0;
  }

  .content :global(ul),
  .content :global(ol) {
    padding-left: 20px;
    margin: 4px 0;
  }

  .content :global(li) {
    margin: 2px 0;
  }

  .content :global(code) {
    background: var(--bg-deepest);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--accent-warning);
  }

  .content :global(pre) {
    background: var(--bg-deepest);
    padding: 8px 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
  }

  .content :global(pre code) {
    background: none;
    padding: 0;
    color: var(--text-primary);
  }

  .content :global(blockquote) {
    border-left: 3px solid var(--accent-primary);
    padding-left: 10px;
    margin: 8px 0;
    color: var(--text-muted);
  }

  .content :global(a) {
    color: #60a5fa;
    text-decoration: underline;
  }

  .content :global(strong) {
    color: var(--text-primary);
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 12px;
  }

  .popover-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--border-default);
  }

  .edit-btn {
    width: 100%;
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
  }

  .edit-btn:hover {
    background: var(--bg-hover);
  }
</style>
