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
    background: #1a1d24;
    border: 1px solid #30363d;
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
    border-bottom: 1px solid #2a2f37;
  }

  .label {
    font-size: 12px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .close-btn:hover {
    background: #2a2f37;
    color: #e5e7eb;
  }

  .content {
    padding: 12px;
    overflow-y: auto;
    flex: 1;
    color: #d6dae2;
    font-size: 13px;
    line-height: 1.5;
  }

  /* Markdown rendered styles */
  .content :global(h1),
  .content :global(h2),
  .content :global(h3),
  .content :global(h4) {
    color: #e5e7eb;
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
    background: #0f1115;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
    color: #facc15;
  }

  .content :global(pre) {
    background: #0f1115;
    padding: 8px 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
  }

  .content :global(pre code) {
    background: none;
    padding: 0;
    color: #e5e7eb;
  }

  .content :global(blockquote) {
    border-left: 3px solid #3b82f6;
    padding-left: 10px;
    margin: 8px 0;
    color: #9ca3af;
  }

  .content :global(a) {
    color: #60a5fa;
    text-decoration: underline;
  }

  .content :global(strong) {
    color: #e5e7eb;
  }

  .empty {
    color: #6b7280;
    text-align: center;
    padding: 12px;
  }

  .popover-footer {
    padding: 8px 12px;
    border-top: 1px solid #2a2f37;
  }

  .edit-btn {
    width: 100%;
    background: #1f2329;
    color: #e5e7eb;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
  }

  .edit-btn:hover {
    background: #2b3138;
  }
</style>
