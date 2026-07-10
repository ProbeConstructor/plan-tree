<script lang="ts">
  import Modal from "../components/Modal.svelte";
  import { closeModal } from "../stores/modalStore";
  import { tree } from "../stores/treeStore";
  import { setRecurrence, clearRecurrence as clearRecurrenceCommand } from "../commands/treeCommands";
  import type { RecurrenceRule, RecurrenceType } from "../types";

  let { nodeId }: { nodeId: string } = $props();

  // Local state for the form
  let enabled = $state(false);
  let recType: RecurrenceType = $state("daily");
  let interval = $state(1);
  let daysOfWeek = $state<number[]>([]);
  let endDate = $state("");

  // Day labels: 0=Mon..6=Sun
  const DAY_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

  // Initialize form from existing node recurrence
  $effect(() => {
    const t = $tree;
    const node = findNodeInTree(t, nodeId);
    if (node?.recurrence) {
      enabled = true;
      recType = node.recurrence.type;
      interval = node.recurrence.interval;
      daysOfWeek = node.recurrence.daysOfWeek ?? [];
      endDate = node.recurrence.endDate ?? "";
    }
  });

  function findNodeInTree(root: typeof $tree, id: string): typeof $tree | null {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
    return null;
  }

  function toggleDay(day: number) {
    if (daysOfWeek.includes(day)) {
      daysOfWeek = daysOfWeek.filter((d) => d !== day);
    } else {
      daysOfWeek = [...daysOfWeek, day].sort();
    }
  }

  function save() {
    setRecurrence(
      nodeId,
      enabled
        ? ({
            type: recType,
            interval: Math.max(1, interval),
            ...(recType === "weekly" && daysOfWeek.length > 0
              ? { daysOfWeek }
              : {}),
            ...(endDate ? { endDate } : {}),
          } as RecurrenceRule)
        : undefined,
    );
    closeModal();
  }

  function clearRecurrence() {
    clearRecurrenceCommand(nodeId);
    closeModal();
  }
</script>

<Modal title="Configurar repetición">
  <div class="form">
    <label class="toggle-row">
      <input type="checkbox" bind:checked={enabled} />
      <span>Activar repetición</span>
    </label>

    {#if enabled}
      <label class="field">
        <span>Tipo</span>
        <select bind:value={recType}>
          <option value="daily">Diaria</option>
          <option value="weekly">Semanal</option>
        </select>
      </label>

      <label class="field">
        <span>Cada</span>
        <div class="interval-row">
          <input
            type="number"
            min="1"
            max="365"
            bind:value={interval}
          />
          <span>{recType === "daily" ? "día(s)" : "semana(s)"}</span>
        </div>
      </label>

      {#if recType === "weekly"}
        <div class="field">
          <span>Días</span>
          <div class="day-grid">
            {#each DAY_LABELS as label, i}
              <button
                class="day-btn"
                class:selected={daysOfWeek.includes(i)}
                onclick={() => toggleDay(i)}
              >
                {label}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <label class="field">
        <span>Fin (opcional)</span>
        <input type="date" bind:value={endDate} />
      </label>
    {/if}

    <div class="buttons">
      {#if enabled}
        <button class="btn danger" onclick={clearRecurrence}>
          Quitar repetición
        </button>
      {/if}
      <button class="btn primary" onclick={save}>
        Guardar
      </button>
    </div>
  </div>
</Modal>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field > span:first-child {
    font-size: 13px;
    color: #9aa1ab;
  }

  .interval-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .interval-row input {
    width: 70px;
  }

  input[type="number"],
  input[type="date"],
  select {
    background: #0f1115;
    border: 1px solid #2a2f37;
    color: #e7e9ee;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 14px;
  }

  .day-grid {
    display: flex;
    gap: 4px;
  }

  .day-btn {
    width: 36px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #2a2f37;
    background: #0f1115;
    color: #e7e9ee;
    font-size: 12px;
    cursor: pointer;
  }

  .day-btn:hover {
    background: #1f2329;
  }

  .day-btn.selected {
    background: #3b82f6;
    border-color: #3b82f6;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .btn {
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
  }

  .btn.primary {
    background: #1f2329;
    border: 1px solid #30363d;
    color: #e7e9ee;
  }

  .btn.danger {
    background: #b91c1c;
    color: white;
  }
</style>
