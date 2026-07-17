<script lang="ts">
  import { getContext } from "svelte";
  import type { PanelId } from "../types";
  import { getPanelInstance } from "../stores/panelRegistry";
  import { toggle as toggleCompletionBase } from "../stores/completionStore";
  import { openModal } from "../stores/modalStore";
  import {
    getMonthGrid,
    groupNodesByDate,
    formatMonthYear,
    getWeekDays,
    isToday,
    getStatusDotColor,
    getCellDisplayInfo,
  } from "../utils/calendarUtils";
  import { getRecurrenceInstances } from "../utils/recurrence";
  import type { TreeNode, VirtualInstance } from "../types";
  import { isValidIconDataUri } from "../utils/validation";
  import NodeDetailModal from "../modals/NodeDetailModal.svelte";
  import { _ } from "svelte-i18n";

  const panelId: PanelId = getContext("panelId") ?? "left";
  const instance = getPanelInstance(panelId);
  const tree = instance.tree;
  const completions = instance.completions;

  function toggleCompletion(nodeId: string, date: string) {
    toggleCompletionBase(nodeId, date, panelId);
  }

  const MAX_VISIBLE = 3;

  let currentYear = $state(new Date().getFullYear());
  let currentMonth = $state(new Date().getMonth()); // 0-indexed
  let expandedCells = $state(new Set<string>());
  // NOTE: always reassign expandedCells = new Set(...) or expandedCells = next.
  // Svelte 5 proxies do NOT track .add()/.delete() — mutating the Set in place
  // will silently break reactivity.

  let grid = $derived(getMonthGrid(currentYear, currentMonth));
  let virtualInstances = $derived(getRecurrenceInstances($tree, $completions, currentYear, currentMonth));
  let nodesByDate = $derived(groupNodesByDate($tree, currentYear, currentMonth, virtualInstances));
  let weekDays = $derived(getWeekDays());
  let monthYear = $derived(formatMonthYear(currentYear, currentMonth));

  function makeDateKey(day: number): string {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    expandedCells = new Set();
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    expandedCells = new Set();
  }

  function goToToday() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    expandedCells = new Set();
  }

  function toggleExpand(dateKey: string) {
    const next = new Set(expandedCells);
    if (next.has(dateKey)) {
      next.delete(dateKey);
    } else {
      next.add(dateKey);
    }
    expandedCells = next;
  }

  function isVirtualEntry(entry: unknown): entry is VirtualInstance {
    return typeof entry === "object" && entry !== null && "isVirtual" in entry;
  }

  function getEntryStatus(entry: unknown): string {
    if (isVirtualEntry(entry)) return entry.status;
    return (entry as TreeNode).status;
  }

  function onEntryClick(entry: unknown) {
    if (isVirtualEntry(entry)) {
      if (entry.status !== "missed") {
        toggleCompletion(entry.nodeId, entry.date);
      }
    } else {
      const node = entry as TreeNode;
      openModal(NodeDetailModal, { nodeId: node.id });
    }
  }
</script>

<div class="calendar">
  <!-- Month header -->
  <div class="month-header">
    <button class="nav-btn" onclick={prevMonth}>◀</button>
    <h2 class="month-title">{monthYear}</h2>
    <button class="nav-btn" onclick={nextMonth}>▶</button>
    <button class="today-btn" onclick={goToToday}>{$_("calendar.today")}</button>
  </div>

  <!-- Week day headers -->
  <div class="week-header">
    {#each weekDays as day}
      <span class="week-day">{day}</span>
    {/each}
  </div>

  <!-- Calendar grid -->
  <div class="calendar-grid">
    {#each grid as week, wi}
      {#each week as day, di (day !== null ? day : `empty-${wi}-${di}`)}
        {#if day !== null}
          {@const dateKey = makeDateKey(day)}
          {@const cells = nodesByDate.get(dateKey) ?? []}
          {@const { visible: displayNodes, overflow } = getCellDisplayInfo(cells, MAX_VISIBLE, expandedCells.has(dateKey))}
          <div
            class="day-cell"
            class:today={isToday(currentYear, currentMonth, day)}
          >
            <span class="day-number">{day}</span>
            <div class="node-entries">
              {#each displayNodes as entry (entry.id)}
                {@const eStatus = getEntryStatus(entry)}
                {@const isVirtual = isVirtualEntry(entry)}
                <button
                  class="node-entry"
                  class:done={eStatus === "done"}
                  class:missed={eStatus === "missed"}
                  onclick={() => onEntryClick(entry)}
                  disabled={eStatus === "missed"}
                >
                  {#if isVirtual}
                    <span class="virtual-badge">♻️</span>
                  {:else if "icon" in (entry as any) && isValidIconDataUri((entry as any).icon)}
                    <img src={(entry as any).icon} alt="" class="node-icon" />
                  {/if}
                  <span
                    class="status-dot"
                    style="background: {getStatusDotColor(eStatus)}"
                  ></span>
                  <span class="node-title">{(entry as any).title}</span>
                  {#if eStatus === "missed"}
                    <span class="missed-label">{$_("calendar.missed")}</span>
                  {/if}
                </button>
              {/each}
              {#if overflow > 0 && !expandedCells.has(dateKey)}
                <button
                  class="overflow-btn"
                  onclick={() => toggleExpand(dateKey)}
                >
                  +{$_("calendar.more", { values: { count: String(overflow) } })}
                </button>
              {/if}
              {#if expandedCells.has(dateKey)}
                <button
                  class="overflow-btn"
                  onclick={() => toggleExpand(dateKey)}
                >
                  {$_("calendar.showLess")}
                </button>
              {/if}
            </div>
          </div>
        {:else}
          <div class="day-cell empty"></div>
        {/if}
      {/each}
    {/each}
  </div>
</div>

<style>
  .calendar {
    max-width: 100%;
    user-select: none;
  }

  /* -- Month header -- */
  .month-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .month-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 180px;
    text-align: center;
  }

  .nav-btn {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 14px;
  }

  .nav-btn:hover {
    background: var(--bg-hover);
  }

  .today-btn {
    margin-left: auto;
    background: var(--bg-elevated);
    color: #58a6ff;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .today-btn:hover {
    background: var(--bg-hover);
  }

  /* -- Week day headers -- */
  .week-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 4px;
  }

  .week-day {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    padding: 6px 0;
    letter-spacing: 0.5px;
  }

  /* -- Calendar grid -- */
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--border-default);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    overflow: hidden;
  }

  .day-cell {
    background: var(--bg-sidebar);
    min-height: 100px;
    padding: 4px;
    display: flex;
    flex-direction: column;
  }

  .day-cell.today {
    outline: 2px solid var(--accent-warning);
    outline-offset: -2px;
    z-index: 1;
  }

  .day-cell.empty {
    background: var(--bg-inset);
    min-height: 100px;
  }

  .day-number {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    padding: 2px 4px;
    margin-bottom: 2px;
  }

  /* -- Node entries -- */
  .node-entries {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
  }

  .node-entry {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    text-align: left;
    width: 100%;
    font-size: 12px;
    line-height: 1.3;
    overflow: hidden;
  }

  .node-entry:hover {
    background: var(--bg-elevated);
  }

  .node-entry.done {
    opacity: 0.5;
  }

  .node-entry.missed {
    opacity: 0.4;
    text-decoration: line-through;
  }

  .node-entry:disabled {
    cursor: default;
  }

  .missed-label {
    font-size: 10px;
    color: var(--accent-danger);
    margin-left: auto;
    flex-shrink: 0;
  }

  .virtual-badge {
    font-size: 12px;
    flex-shrink: 0;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .node-icon {
    font-size: 14px;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .node-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .overflow-btn {
    background: transparent;
    border: none;
    color: #58a6ff;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    text-align: left;
  }

  .overflow-btn:hover {
    text-decoration: underline;
  }
</style>
