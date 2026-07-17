<!-- SPDX-License-Identifier: GPL-3.0-only -->

<script lang="ts">
  import { tick, onMount } from "svelte";
  import { get } from "svelte/store";
  import { _ } from "svelte-i18n";
  import {
    getCommands,
    searchCommands,
    recordRecent,
    getRecentIds,
    clearFuseCache,
  } from "../services/commandRegistry";
  import type { Command } from "../services/commandRegistry";
  import { closeModal } from "../stores/modalStore";
  import { panelLayout } from "../stores/panelStore";
  import { projects } from "../stores/workspaceStore";
  import { tagDefs, tagFilter } from "../stores/tagStore";
  import { switchPanelProject } from "../services/panelManager";
  import type { PanelId } from "../types";

  // ── State ──────────────────────────────────────────────────
  let query = $state("");
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();
  let allCommands: Command[] = $state([]);
  let recentIds: string[] = $state([]);

  // Commands that are currently enabled
  let enabledCommands = $derived(
    allCommands.filter((cmd) => cmd.enabled()),
  );

  // Static commands (excluding recent duplicates)
  let staticCommands = $derived(
    enabledCommands.filter((cmd) => !recentIds.includes(cmd.id)),
  );

  // Recent commands objects (ordered by recentIds, only enabled)
  let recentCommands = $derived(
    recentIds
      .map((id) => enabledCommands.find((cmd) => cmd.id === id))
      .filter(Boolean) as Command[],
  );

  // Derived list of commands to display
  let displayItems = $derived.by(() => {
    // If query is empty, show recent + static commands grouped by category
    if (!query.trim()) {
      return recentIds.length > 0
        ? [...recentCommands, ...staticCommands]
        : staticCommands;
    }
    // Fuzzy search
    const results = searchCommands(query, enabledCommands);
    return results.map((r) => r.item);
  });

  // Grouped items for rendering
  let groupedItems = $derived.by(() => {
    const groups: {
      category: string;
      items: Command[];
    }[] = [];

    // Recent section
    if (recentCommands.length > 0 && !query.trim()) {
      groups.push({
        category: "recent",
        items: recentCommands,
      });
    }

    // Category groups (excluding recent)
    const categories = [
      "project",
      "node",
      "navigation",
      "utilities",
    ];
    for (const cat of categories) {
      const items = displayItems.filter(
        (cmd) => cmd.category === cat && !recentIds.includes(cmd.id),
      );
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    return groups;
  });

  // Flat list for keyboard navigation (only interactive items)
  let flatItems = $derived(groupedItems.flatMap((g) => g.items));

  // ── Lifecycle ──────────────────────────────────────────────
  onMount(() => {
    clearFuseCache();
    allCommands = getCommands();
    injectDynamicCommands();
    recentIds = getRecentIds();
    tick().then(() => inputEl?.focus());
  });

  function injectDynamicCommands() {
    // One command per project: "Switch to: {name}"
    const projectList = get(projects);
    for (const name of projectList) {
      allCommands = [
        ...allCommands,
        {
          id: `switchProject:${name}`,
          label: "commandPalette.cmd.switchToProject",
          labelArgs: { name },
          category: "project",
          icon: "📂",
          enabled: () => true,
          action: () => {
            const panel = (get(panelLayout).focused ?? "left") as PanelId;
            switchPanelProject(panel, name);
          },
        },
      ];
    }

    // One command per tag: "Filter: {name}"
    const tags = get(tagDefs);
    for (const tag of tags) {
      allCommands = [
        ...allCommands,
        {
          id: `filterTag:${tag.id}`,
          label: "commandPalette.cmd.filterTag",
          labelArgs: { name: tag.name },
          category: "utilities",
          icon: "🏷️",
          enabled: () => true,
          action: () => {
            tagFilter.update((current) => {
              const next = new Set(current);
              if (next.has(tag.id)) {
                next.delete(tag.id);
              } else {
                next.add(tag.id);
              }
              return next;
            });
          },
        },
      ];
    }
  }

  // ── Keyboard Handling ──────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveSelection(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveSelection(-1);
        break;
      case "Enter":
        e.preventDefault();
        executeSelected();
        break;
      case "Escape":
        e.preventDefault();
        closeModal();
        break;
      case "Tab":
        e.preventDefault();
        jumpToNextCategory();
        break;
    }
  }

  function moveSelection(delta: number) {
    if (flatItems.length === 0) return;
    const len = flatItems.length;
    selectedIndex = (selectedIndex + delta + len) % len;
    scrollToSelected();
  }

  function jumpToNextCategory() {
    if (flatItems.length === 0) return;

    // Find current category of selected item
    const currentItem = flatItems[selectedIndex];
    const currentCategory = currentItem.category;

    // Find next category group start index
    let nextGroupStart = -1;
    let foundCurrent = false;
    for (const group of groupedItems) {
      if (foundCurrent) {
        nextGroupStart = flatItems.indexOf(group.items[0]);
        break;
      }
      if (group.category === currentCategory) {
        foundCurrent = true;
      }
    }

    // If no next category, wrap to first
    if (nextGroupStart === -1) {
      nextGroupStart = 0;
    }

    selectedIndex = nextGroupStart;
    scrollToSelected();
  }

  function scrollToSelected() {
    tick().then(() => {
      const el = document.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  function executeSelected() {
    if (flatItems.length === 0) return;
    const cmd = flatItems[selectedIndex];
    if (!cmd) return;

    // Record recent
    recordRecent(cmd.id);

    // Close palette first so that modals opened by the action
    // (e.g. ShortcutHelpModal) are not immediately closed by closeModal()
    closeModal();

    // Defer action to next microtask so Svelte processes the palette
    // close before the new modal opens
    setTimeout(() => cmd.action(), 0);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  // Reset selection when query changes
  $effect(() => {
    query; // track
    selectedIndex = 0;
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" on:click={handleBackdropClick}>
  <div
    class="palette"
    role="dialog"
    aria-modal="true"
    on:click|stopPropagation
    on:keydown|stopPropagation
  >
    <input
      bind:this={inputEl}
      bind:value={query}
      type="text"
      class="search-input"
      placeholder={$_("commandPalette.placeholder")}
      on:keydown={handleKeydown}
    />

    {#if flatItems.length === 0}
      <div class="no-results">{$_("commandPalette.noResults")}</div>
    {:else}
      <div class="results-list">
        {#each groupedItems as group}
          {#if group.items.length > 0}
            <div class="category-header">
              {$_(`commandPalette.category.${group.category}`)}
            </div>
            {#each group.items as item, idx}
              {@const globalIdx = flatItems.indexOf(item)}
              <button
                class="result-item"
                class:selected={globalIdx === selectedIndex}
                data-index={globalIdx}
                on:click={() => {
                  selectedIndex = globalIdx;
                  executeSelected();
                }}
                on:mouseenter={() => (selectedIndex = globalIdx)}
              >
                {#if item.icon}
                  <span class="item-icon">{item.icon}</span>
                {/if}
                <span class="item-label">{$_(item.label, item.labelArgs ? { values: item.labelArgs } : undefined)}</span>
              </button>
            {/each}
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 15vh;
    background: var(--backdrop);
    backdrop-filter: blur(5px);
    z-index: 1000;
  }

  .palette {
    width: 640px;
    max-width: 90vw;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .search-input {
    width: 100%;
    padding: 16px 20px;
    border: none;
    border-bottom: 1px solid var(--border-default);
    background: transparent;
    color: var(--text-primary);
    font-size: 16px;
    outline: none;
    box-sizing: border-box;
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .results-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .category-header {
    padding: 8px 20px 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 20px;
    border: none;
    background: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    font-size: 14px;
    transition: background 0.1s;
  }

  .result-item:hover,
  .result-item.selected {
    background: var(--bg-muted);
  }

  .item-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
  }

  .item-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-results {
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
  }
</style>