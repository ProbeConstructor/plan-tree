<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import type { TagDefinition } from "../../types";
  import { tagDefs, addTagDef, getNextColor, checkAutoCleanup } from "../../stores/tagStore";
  import { tree } from "../../stores/treeStore";
  import { assignTag, removeTag } from "../../commands/treeCommands";

  let {
    nodeTags,
    nodeId,
    onClose,
  }: {
    nodeTags: string[];
    nodeId: string;
    onClose: () => void;
  } = $props();

  let popoverEl: HTMLDivElement;
  let inputEl: HTMLInputElement;
  let query = $state("");
  let defs = $state<TagDefinition[]>([]);

  // Subscribe to tagDefs
  const unsub = tagDefs.subscribe(v => { defs = v; });

  let filtered = $derived(
    query.trim()
      ? defs.filter(d => d.name.toLowerCase().includes(query.toLowerCase()))
      : defs
  );

  let assignedSet = $derived(new Set(nodeTags));

  function isAssigned(tagId: string): boolean {
    return assignedSet.has(tagId);
  }

  async function toggleTag(tag: TagDefinition) {
    if (isAssigned(tag.id)) {
      removeTag(nodeId, tag.id);
      const currentTree = get(tree);
      await checkAutoCleanup(tag.id, currentTree);
    } else {
      assignTag(nodeId, tag.id);
    }
  }

  async function createAndAssign() {
    const name = query.trim();
    if (!name) return;

    const existing = defs.find(d => d.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!isAssigned(existing.id)) {
        await toggleTag(existing);
      }
      query = "";
      return;
    }

    const newDef = await addTagDef(name);
    if (newDef) {
      assignTag(nodeId, newDef.id);
    }
    query = "";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      createAndAssign();
    }
  }

  onMount(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverEl && !popoverEl.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    inputEl?.focus();
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      unsub();
    };
  });
</script>

<div class="popover" bind:this={popoverEl} role="dialog" tabindex="-1">
  <div class="popover-header">
    <span class="label">Etiquetas</span>
    <button class="close-btn" onclick={onClose}>✕</button>
  </div>

  <div class="input-row">
    <input
      bind:this={inputEl}
      bind:value={query}
      onkeydown={handleKeydown}
      placeholder="Buscar o crear tag..."
      class="tag-input"
    />
  </div>

  <div class="suggestions">
    {#if filtered.length > 0}
      {#each filtered as tag (tag.id)}
        <button
          class="suggestion-item"
          class:assigned={isAssigned(tag.id)}
          onclick={() => toggleTag(tag)}
        >
          <span class="suggestion-dot" style="background: {tag.color}"></span>
          <span class="suggestion-name">{tag.name}</span>
          {#if isAssigned(tag.id)}
            <span class="check">✓</span>
          {/if}
        </button>
      {/each}
    {:else if query.trim()}
      <button class="suggestion-item create" onclick={createAndAssign}>
        <span class="suggestion-dot" style="background: {getNextColor()}"></span>
        <span class="suggestion-name">Crear "{query.trim()}"</span>
      </button>
    {:else}
      <p class="empty">Sin etiquetas</p>
    {/if}
  </div>
</div>

<style>
  .popover {
    position: absolute;
    z-index: 1000;
    top: calc(100% + 6px);
    left: 0;
    width: 260px;
    max-height: 320px;
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
    padding: 8px 12px;
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

  .input-row {
    padding: 8px 12px;
    border-bottom: 1px solid #2a2f37;
  }

  .tag-input {
    width: 100%;
    background: #0f1115;
    border: 1px solid #30363d;
    color: #e5e7eb;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
  }

  .tag-input:focus {
    border-color: #3b82f6;
  }

  .suggestions {
    overflow-y: auto;
    flex: 1;
    max-height: 220px;
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    background: none;
    border: none;
    color: #d6dae2;
    cursor: pointer;
    padding: 6px 12px;
    font-size: 12px;
    text-align: left;
  }

  .suggestion-item:hover {
    background: #262b33;
  }

  .suggestion-item.assigned {
    background: rgba(59, 130, 246, 0.1);
  }

  .suggestion-item.create {
    color: #9ca3af;
    font-style: italic;
  }

  .suggestion-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .suggestion-name {
    flex: 1;
  }

  .check {
    color: #3b82f6;
    font-weight: bold;
  }

  .empty {
    color: #6b7280;
    text-align: center;
    padding: 12px;
    font-size: 12px;
    margin: 0;
  }
</style>
