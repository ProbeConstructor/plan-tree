<script module lang="ts">
  import { get } from "svelte/store";
  import { t } from "svelte-i18n";

  /**
   * Validates that startDate is not after dueDate.
   * Returns an error message if invalid, null if valid.
   */
  export function validateDates(
    startDate: string,
    dueDate: string,
  ): string | null {
    if (startDate && dueDate && startDate > dueDate) {
      return get(t)("modal.nodeDetail.dateError");
    }
    return null;
  }
</script>

<script lang="ts">
  import { closeModal } from "../stores/modalStore";
  import { tree } from "../stores/treeStore";
  import { findNode } from "../utils/treeUtils";
  import { updateNodeDetails } from "../commands/treeCommands";
  import Modal from "../components/Modal.svelte";
  import EasyMDE from "easymde";
  import "easymde/dist/easymde.min.css";
  import { _ } from "svelte-i18n";

  let { nodeId }: { nodeId: string } = $props();

  // ── Reactive node from tree ──────────────────────────────────────────────
  let node = $derived(findNode($tree, nodeId));

  // ── Buffered local state ─────────────────────────────────────────────────
  let startDate = $state("");
  let dueDate = $state("");
  let status = $state<"todo" | "doing" | "done">("todo");
  let priority = $state<"low" | "medium" | "high" | "critical">("medium");
  let comments = $state("");
  let error = $state("");

  // ── EasyMDE refs ─────────────────────────────────────────────────────────
  let textarea: HTMLTextAreaElement | undefined = $state();
  let mde: EasyMDE | null = null;

  let formSynced = $state(false);

  $effect(() => {
    if (node && !formSynced) {
      startDate = node.startDate || "";
      dueDate = node.dueDate || "";
      status = node.status || "todo";
      priority = node.priority || "medium";
      comments = node.comments || "";
      formSynced = true;

      // Sync EasyMDE if already initialized
      if (mde) {
        mde.value(comments);
      }
    }
  });

  // Initialize / teardown EasyMDE
  $effect(() => {
    if (!textarea || formSynced === false) return;

    mde = new EasyMDE({
      element: textarea,
      initialValue: comments,
      spellChecker: false,
      forceSync: true,
      status: false,
      toolbar: [
        "bold",
        "italic",
        "strikethrough",
        "|",
        "heading",
        "|",
        "unordered-list",
        "ordered-list",
        "|",
        "link",
        "horizontal-rule",
        "|",
        "preview",
        "guide",
      ],
      renderingConfig: {
        singleLineBreaks: true,
        codeSyntaxHighlighting: false,
      },
    });

    return () => {
      mde?.toTextArea();
      mde = null;
    };
  });

  // ── Save ─────────────────────────────────────────────────────────────────
  function save() {
    if (!node) return;

    // Sync comments from EasyMDE
    if (mde) {
      comments = mde.value();
    }

    // Validate dates
    const validationError = validateDates(startDate, dueDate);
    if (validationError) {
      error = validationError;
      return;
    }

    // Skip snapshot if nothing actually changed
    const hasChanges =
      startDate !== (node.startDate ?? "") ||
      dueDate !== (node.dueDate ?? "") ||
      status !== node.status ||
      priority !== node.priority ||
      comments !== (node.comments ?? "");

    if (hasChanges) {
      updateNodeDetails(nodeId, { startDate, dueDate: dueDate || undefined, status, priority, comments: comments || undefined });
    }

    closeModal();
  }
</script>

<Modal title={node?.title ?? $_("modal.nodeDetail.title")}>
  {#if !node}
    <p class="text-muted">{$_("modal.nodeDetail.noNode")}</p>
    <div class="buttons">
      <button class="btn" onclick={closeModal}>{$_("modal.nodeDetail.close")}</button>
    </div>
  {:else}
    <div class="modal-content">
      <!-- Title (read only) -->
      <div class="field">
        <span class="field-label">{$_("modal.nodeDetail.title")}</span>
        <span class="readonly-title">{node.title}</span>
      </div>

      <!-- startDate -->
      <div class="field">
        <label for="nd-start">{$_("modal.nodeDetail.startDate")}</label>
        <input id="nd-start" type="date" bind:value={startDate} />
      </div>

      <!-- dueDate -->
      <div class="field">
        <label for="nd-due">{$_("modal.nodeDetail.dueDate")}</label>
        <input id="nd-due" type="date" bind:value={dueDate} />
      </div>

      <!-- Status -->
      <div class="field">
        <label for="nd-status">{$_("modal.nodeDetail.status")}</label>
        <select id="nd-status" bind:value={status}>
          <option value="todo">{$_("modal.nodeDetail.status.todo")}</option>
          <option value="doing">{$_("modal.nodeDetail.status.doing")}</option>
          <option value="done">{$_("modal.nodeDetail.status.done")}</option>
        </select>
      </div>

      <!-- Priority -->
      <div class="field">
        <label for="nd-priority">{$_("modal.nodeDetail.priority")}</label>
        <select id="nd-priority" bind:value={priority}>
          <option value="low">{$_("modal.nodeDetail.priority.low")}</option>
          <option value="medium">{$_("modal.nodeDetail.priority.medium")}</option>
          <option value="high">{$_("modal.nodeDetail.priority.high")}</option>
          <option value="critical">{$_("modal.nodeDetail.priority.critical")}</option>
        </select>
      </div>

      <!-- Comments (Markdown) — flex-grows -->
      <div class="field comments-field">
        <label for="nd-comments">{$_("modal.nodeDetail.comments")}</label>
        <textarea id="nd-comments" bind:this={textarea} class="mde-textarea"></textarea>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <div class="buttons">
        <button class="btn" onclick={closeModal}>{$_("modal.nodeDetail.cancel")}</button>
        <button class="btn primary" onclick={save}>{$_("modal.nodeDetail.save")}</button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .field {
    margin-bottom: 12px;
  }

  .field label,
  .field-label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  input,
  select {
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    color: var(--text-primary);
    padding: 8px;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .error {
    color: var(--accent-danger);
    font-size: 13px;
  }

  .buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .readonly-title {
    color: var(--text-primary);
    font-weight: 500;
  }

  .text-muted {
    color: var(--text-muted);
    text-align: center;
    padding: 24px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
  }

  .btn.primary {
    background: var(--accent-primary);
    color: var(--text-inverse);
    border: none;
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .comments-field {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :global(.EasyMDEContainer) {
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :global(.editor-toolbar) {
    flex-shrink: 0;
    background: var(--bg-deepest);
    border: 1px solid var(--border-default);
    border-bottom: none;
    border-radius: 4px 4px 0 0;
  }

  :global(.editor-toolbar button) {
    color: var(--text-muted);
  }

  :global(.editor-toolbar button:hover) {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  :global(.editor-toolbar button.active) {
    background: var(--bg-muted);
    color: var(--text-primary);
  }

  :global(.CodeMirror) {
    flex: 1;
    min-height: 0;
    height: auto;
    background: var(--bg-deepest);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 0 0 4px 4px;
  }

  :global(.CodeMirror-scroll) {
    min-height: auto !important;
  }

  :global(.CodeMirror-cursor) {
    border-color: var(--text-primary);
  }

  :global(.CodeMirror-gutters) {
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
  }

  .mde-textarea {
    display: none;
  }
</style>
