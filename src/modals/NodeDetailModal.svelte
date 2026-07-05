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

  let { nodeId }: { nodeId: string } = $props();

  // ── Reactive node from tree ──────────────────────────────────────────────
  let node = $derived(findNode($tree, nodeId));

  // ── Buffered local state (NOT bound to tree directly) ────────────────────
  let startDate = $state("");
  let dueDate = $state("");
  let status = $state<"todo" | "doing" | "done">("todo");
  let priority = $state<"low" | "medium" | "high" | "critical">("medium");
  let error = $state("");

  // Initialize buffer from node on mount.
  // The modal is fresh-mounted per openModal() call (ModalHost unmounts on close),
  // so this runs exactly once per instance. The formSynced guard prevents re-sync
  // if the tree changes while the modal stays open (defense-in-depth).
  let formSynced = $state(false);

  $effect(() => {
    if (node && !formSynced) {
      startDate = node.startDate || "";
      dueDate = node.dueDate || "";
      status = node.status || "todo";
      priority = node.priority || "medium";
      formSynced = true;
    }
  });

  // ── Save ─────────────────────────────────────────────────────────────────
  function save() {
    if (!node) return;

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
      priority !== node.priority;

    if (hasChanges) {
      snapshot();
      mutateTree((t) =>
        updateNode(t, nodeId, (n) => ({
          ...n,
          startDate,
          dueDate: dueDate || undefined,
          status,
          priority,
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
</style>
