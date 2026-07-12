<script lang="ts">
  import Modal from "../components/Modal.svelte";
  import { closeModal } from "../stores/modalStore";
  import { get } from "svelte/store";
  import { tagDefs, removeTagDef, updateTagDef } from "../stores/tagStore";
  import { tree } from "../stores/treeStore";
  import { removeTagFromAllNodes } from "../commands/treeCommands";
  import { countNodesWithTag } from "../stores/tagStore";
  import { TAG_PALETTE } from "../stores/tagStore";
  import ConfirmModal from "./ConfirmModal.svelte";
  import { openModal } from "../stores/modalStore";
  import { _ } from "svelte-i18n";

  let defs = $state(get(tagDefs));
  let treeVal = $state(get(tree));

  const unsubDefs = tagDefs.subscribe(v => { defs = v; });
  const unsubTree = tree.subscribe(v => { treeVal = v; });

  let editingId = $state<string | null>(null);
  let editName = $state("");

  function startRename(def: { id: string; name: string }) {
    editingId = def.id;
    editName = def.name;
  }

  async function confirmRename(id: string) {
    const name = editName.trim();
    if (!name) { editingId = null; return; }

    // Case-insensitive unique check (skip self)
    const dup = defs.find(d => d.id !== id && d.name.toLowerCase() === name.toLowerCase());
    if (dup) { editingId = null; return; }

    await updateTagDef(id, { name });
    editingId = null;
  }

  function cancelRename() {
    editingId = null;
    editName = "";
  }

  async function handleColorChange(id: string, color: string) {
    await updateTagDef(id, { color });
  }

  function confirmDelete(def: { id: string; name: string }) {
    const count = countNodesWithTag(treeVal, def.id);
    openModal(ConfirmModal, {
      title: $_("modal.tagManager.deleteTitle"),
      message: count > 0
        ? $_("modal.tagManager.deleteConfirmCount", { values: { name: def.name, count: String(count) } })
        : $_("modal.tagManager.deleteConfirm", { values: { name: def.name } }),
      confirmLabel: $_("modal.confirm.delete"),
      danger: true,
      onConfirm: async () => {
        // Remove from all nodes first
        removeTagFromAllNodes(def.id);

        // Then remove definition
        await removeTagDef(def.id);
      },
    });
  }
</script>

<Modal title={$_("modal.tagManager.title")}>
  <div class="tag-list">
    {#if defs.length === 0}
      <p class="empty">{$_("modal.tagManager.empty")}</p>
    {:else}
      {#each defs as def (def.id)}
        {@const nodeCount = countNodesWithTag(treeVal, def.id)}
        <div class="tag-row">
          <label class="color-label">
            <input
              type="color"
              value={def.color}
              oninput={(e) => handleColorChange(def.id, (e.target as HTMLInputElement).value)}
              class="color-input"
            />
            <span class="color-dot" style="background: {def.color}"></span>
          </label>

          {#if editingId === def.id}
            <input
              type="text"
              bind:value={editName}
              onblur={() => confirmRename(def.id)}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter") confirmRename(def.id);
                if (e.key === "Escape") cancelRename();
              }}
              class="rename-input"
            />
          {:else}
            <button class="name-btn" onclick={() => startRename(def)}>
              {def.name}
            </button>
          {/if}

          <span class="node-count">{nodeCount}</span>

          <button class="delete-btn" onclick={() => confirmDelete(def)} title={$_("modal.tagManager.deleteTitle")}>
            🗑️
          </button>
        </div>
      {/each}
    {/if}
  </div>
</Modal>

<style>
  .tag-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tag-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #262b33;
  }

  .tag-row:last-child {
    border-bottom: none;
  }

  .color-label {
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
  }

  .color-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }

  .color-dot {
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid #30363d;
  }

  .name-btn {
    flex: 1;
    background: none;
    border: none;
    color: #d6dae2;
    text-align: left;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }

  .name-btn:hover {
    background: #262b33;
  }

  .rename-input {
    flex: 1;
    background: #0f1115;
    border: 1px solid #3b82f6;
    color: #e5e7eb;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 13px;
    outline: none;
  }

  .node-count {
    color: #6b7280;
    font-size: 12px;
    min-width: 24px;
    text-align: right;
  }

  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: 4px;
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .delete-btn:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.1);
  }

  .empty {
    color: #6b7280;
    text-align: center;
    padding: 20px;
    font-size: 13px;
  }
</style>
