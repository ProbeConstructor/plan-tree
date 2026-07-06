<script module lang="ts">
  /**
   * Validates that startDate is not after dueDate.
   * Returns an error message if invalid, null if valid.
   */
  export function validateDates(
    startDate: string,
    dueDate: string,
  ): string | null {
    if (startDate && dueDate && startDate > dueDate) {
      return "La fecha de inicio debe ser anterior o igual a la fecha de vencimiento.";
    }
    return null;
  }
</script>

<script lang="ts">
  import { closeModal } from "../stores/modalStore";
  import { tree, snapshot, mutateTree } from "../stores/treeStore";
  import { findNode, updateNode } from "../utils/treeUtils";
  import Modal from "../components/Modal.svelte";
  import EasyMDE from "easymde";
  import "easymde/dist/easymde.min.css";

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
      snapshot();
      mutateTree((t) =>
        updateNode(t, nodeId, (n) => ({
          ...n,
          startDate,
          dueDate: dueDate || undefined,
          status,
          priority,
          comments: comments || undefined,
        })),
      );
    }

    closeModal();
  }
</script>

<Modal title={node?.title ?? "Editar nodo"}>
  {#if !node}
    <p class="text-muted">El nodo ya no existe.</p>
    <div class="buttons">
      <button class="btn" onclick={closeModal}>Cerrar</button>
    </div>
  {:else}
    <!-- Title (read only) -->
    <div class="field">
      <span class="field-label">Título</span>
      <span class="readonly-title">{node.title}</span>
    </div>

    <!-- startDate -->
    <div class="field">
      <label for="nd-start">Fecha de inicio</label>
      <input id="nd-start" type="date" bind:value={startDate} />
    </div>

    <!-- dueDate -->
    <div class="field">
      <label for="nd-due">Fecha de vencimiento</label>
      <input id="nd-due" type="date" bind:value={dueDate} />
    </div>

    <!-- Status -->
    <div class="field">
      <label for="nd-status">Estado</label>
      <select id="nd-status" bind:value={status}>
        <option value="todo">Por hacer</option>
        <option value="doing">En progreso</option>
        <option value="done">Completado</option>
      </select>
    </div>

    <!-- Priority -->
    <div class="field">
      <label for="nd-priority">Prioridad</label>
      <select id="nd-priority" bind:value={priority}>
        <option value="low">Baja</option>
        <option value="medium">Media</option>
        <option value="high">Alta</option>
        <option value="critical">Crítica</option>
      </select>
    </div>

    <!-- Comments (Markdown) -->
    <div class="field">
      <label for="nd-comments">Comentarios</label>
      <textarea id="nd-comments" bind:this={textarea} class="mde-textarea"></textarea>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <div class="buttons">
      <button class="btn" onclick={closeModal}>Cancelar</button>
      <button class="btn primary" onclick={save}>Guardar</button>
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
    color: #9ca3af;
    margin-bottom: 4px;
  }

  input,
  select {
    width: 100%;
    background: #1a1d24;
    border: 1px solid #2a2f37;
    color: #e5e7eb;
    padding: 8px;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .error {
    color: #ef4444;
    font-size: 13px;
  }

  .buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .readonly-title {
    color: #e5e7eb;
    font-weight: 500;
  }

  .text-muted {
    color: #9ca3af;
    text-align: center;
    padding: 24px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    background: #1f2329;
    border: 1px solid #30363d;
    color: #e5e7eb;
  }

  .btn.primary {
    background: #3b82f6;
    color: white;
    border: none;
  }

  :global(.EasyMDEContainer) {
    width: 100%;
  }

  :global(.editor-toolbar) {
    background: #0f1115;
    border: 1px solid #2a2f37;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
  }

  :global(.editor-toolbar button) {
    color: #9ca3af;
  }

  :global(.editor-toolbar button:hover) {
    background: #1a1d24;
    color: #e5e7eb;
  }

  :global(.editor-toolbar button.active) {
    background: #2a2f37;
    color: #e5e7eb;
  }

  :global(.CodeMirror) {
    background: #0f1115;
    color: #e5e7eb;
    border: 1px solid #2a2f37;
    border-radius: 0 0 4px 4px;
    min-height: 120px;
  }

  :global(.CodeMirror-cursor) {
    border-color: #e5e7eb;
  }

  :global(.CodeMirror-gutters) {
    background: #1a1d24;
    border-right: 1px solid #2a2f37;
  }

  .mde-textarea {
    display: none;
  }
</style>
