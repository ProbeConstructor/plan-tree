<script lang="ts">
  import Modal from "../components/Modal.svelte";
  import { closeModal } from "../stores/modalStore";
  import { tree } from "../stores/treeStore";
  import { setRecurrence, clearRecurrence as clearRecurrenceCommand } from "../commands/treeCommands";
  import type { RecurrenceRule, RecurrenceType } from "../types";
  import { _ } from "svelte-i18n";

  let { nodeId }: { nodeId: string } = $props();

  // Local state for the form
  let enabled = $state(false);
  let recType: RecurrenceType = $state("daily");
  let interval = $state(1);
  let daysOfWeek = $state<number[]>([]);
  let endDate = $state("");

  // Day labels via i18n: 0=Mon..6=Sun
  const DAY_KEYS = [
    "calendar.days.monday",
    "calendar.days.tuesday",
    "calendar.days.wednesday",
    "calendar.days.thursday",
    "calendar.days.friday",
    "calendar.days.saturday",
    "calendar.days.sunday",
  ];
  let dayLabels = $derived(DAY_KEYS.map(k => $_(k)));

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

<Modal title={$_("modal.recurrence.title")}>
  <div class="form">
    <label class="toggle-row">
      <input type="checkbox" bind:checked={enabled} />
      <span>{$_("modal.recurrence.enable")}</span>
    </label>

    {#if enabled}
      <label class="field">
        <span>{$_("modal.recurrence.type")}</span>
        <select bind:value={recType}>
          <option value="daily">{$_("modal.recurrence.daily")}</option>
          <option value="weekly">{$_("modal.recurrence.weekly")}</option>
        </select>
      </label>

      <label class="field">
        <span>{$_("modal.recurrence.every")}</span>
        <div class="interval-row">
          <input
            type="number"
            min="1"
            max="365"
            bind:value={interval}
          />
          <span>{recType === "daily" ? $_("modal.recurrence.days") : $_("modal.recurrence.weeks")}</span>
        </div>
      </label>

      {#if recType === "weekly"}
        <div class="field">
          <span>{$_("modal.recurrence.daysOfWeek")}</span>
          <div class="day-grid">
            {#each dayLabels as label, i}
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
        <span>{$_("modal.recurrence.endDate")}</span>
        <input type="date" bind:value={endDate} />
      </label>
    {/if}

    <div class="buttons">
      {#if enabled}
        <button class="btn danger" onclick={clearRecurrence}>
          {$_("modal.recurrence.remove")}
        </button>
      {/if}
      <button class="btn primary" onclick={save}>
        {$_("modal.recurrence.save")}
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
    color: var(--text-secondary);
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
    background: var(--bg-deepest);
    border: 1px solid var(--border-default);
    color: var(--text-primary);
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
    border: 1px solid var(--border-default);
    background: var(--bg-deepest);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
  }

  .day-btn:hover {
    background: var(--bg-elevated);
  }

  .day-btn.selected {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
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
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
  }

  .btn.danger {
    background: var(--accent-danger);
    color: var(--text-inverse);
  }
</style>
