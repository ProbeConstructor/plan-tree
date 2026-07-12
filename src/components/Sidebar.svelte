<script lang="ts">
  import { get } from "svelte/store";
  import { favoritesFilter } from "../stores/treeStore";
  import { projects } from "../stores/workspaceStore";
  import { switchProject, deleteProject } from "../services/workspaceManager";
  import { exportTree, importTree } from "../services/projectManager";
  import { importTreeCommand } from "../commands/treeCommands";
  import { session } from "../services/sessionOrchestrator";
  import { panelLayout, isTreeVisible } from "../stores/panelStore";
  import { openModal } from "../stores/modalStore";
  import NewProjectModal from "../modals/NewProjectModal.svelte";
  import RenameProjectModal from "../modals/RenameProjectModal.svelte";
  import ConfirmModal from "../modals/ConfirmModal.svelte";
  import { pendingUpdate, checkingUpdate, upToDate, updateError, checkForUpdates } from "../stores/updateStore";
  import { autoSave } from "../services/workspaceManager";
  import { relaunch } from "@tauri-apps/plugin-process";
  import { tagDefs, tagFilter } from "../stores/tagStore";
  import TagManagerModal from "../modals/TagManagerModal.svelte";
  import { getFocusedPanel, getProjectForPanel, switchPanelProject } from "../services/panelManager";
  import { getPanelInstance } from "../stores/panelRegistry";
  import type { PanelId } from "../types";
  import { _ } from "svelte-i18n";
  import { setLanguage, currentLanguage } from "../stores/languageStore";

  let installError = $state("");

  /** Get the current focused panel's project reactively. */
  let focusedPanel = $derived($panelLayout.focused as PanelId);
  let focusedProject = $derived(focusedPanel === "left" ? $panelLayout.leftProject : $panelLayout.rightProject);

  /** Undo operates on the focused panel's instance. */
  function handleUndo() {
    const inst = getPanelInstance(focusedPanel);
    import("../stores/treeInstance").then(({ undoInstance }) => {
      undoInstance(inst);
    });
  }

  /** Check if undo is available for the focused panel. */
  let focusedCanUndo = $derived.by(() => {
    const inst = getPanelInstance(focusedPanel);
    let val = false;
    const unsub = inst.canUndo.subscribe(v => val = v);
    unsub();
    return val;
  });

  function handleKeydown(event: KeyboardEvent) {
    const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z";
    if (isUndo && focusedCanUndo) {
      event.preventDefault();
      handleUndo();
    }
  }

  function handleExport() {
    const inst = getPanelInstance(focusedPanel);
    openModal(ConfirmModal, {
      title: $_("sidebar.exportTitle"),
      message: $_("sidebar.exportWarning"),
      confirmLabel: $_("sidebar.exportConfirm"),
      danger: true,
      onConfirm: () => {
        setTimeout(() => exportTree(get(inst.tree)), 0);
      },
    });
  }

  async function handleImport() {
    const imported = await importTree();
    if (!imported) return;
    importTreeCommand(imported);
  }

  function changeProject(event: Event) {
    const name = (event.target as HTMLSelectElement).value;
    switchPanelProject(focusedPanel, name);
  }

  function toggleTagFilter(tagId: string) {
    tagFilter.update(current => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="sidebar">
  <div class="scrollable-content">
    <button on:click={() => panelLayout.setFocusedView("tree")}> {$_("sidebar.view.tree")} </button>

    {#if $isTreeVisible}
      <button
        class="filter-btn"
        class:active={$favoritesFilter}
        on:click={() => favoritesFilter.update(v => !v)}
      >
        {$favoritesFilter ? $_("sidebar.filter.hideFavorites") : $_("sidebar.filter.favoritesOnly")}
      </button>

      {#if $tagDefs.length > 0}
        <div class="tag-filter-section">
          <span class="tag-filter-label">{$_("sidebar.tags")}</span>
          {#each $tagDefs as tag (tag.id)}
            <button
              class="filter-btn tag-toggle"
              class:active={$tagFilter.has(tag.id)}
              on:click={() => toggleTagFilter(tag.id)}
            >
              <span class="tag-dot" style="background: {tag.color}"></span>
              {tag.name}
            </button>
          {/each}
        </div>
      {/if}

      <button class="filter-btn tag-admin-btn" on:click={() => openModal(TagManagerModal)}>
        {$_("sidebar.tags.manage")}
      </button>
    {/if}

    <button on:click={() => panelLayout.setFocusedView("dashboard")}> {$_("sidebar.view.dashboard")} </button>

    <button on:click={() => panelLayout.setFocusedView("calendar")}> {$_("sidebar.view.calendar")} </button>

    <button on:click={() => panelLayout.setFocusedView("progress")}> {$_("sidebar.view.progress")} </button>

    <hr />
    <select value={focusedProject ?? ''} on:change={changeProject}>
      {#each $projects as project}
        <option value={project}>
          {project}
        </option>
      {/each}
    </select>

    <button on:click={() => openModal(NewProjectModal)}>
      {$_("sidebar.project.new")}
    </button>

    <button on:click={() => openModal(RenameProjectModal)}> {$_("sidebar.project.rename")} </button>

    <button
      on:click={() =>
        openModal(ConfirmModal, {
          title: $_("sidebar.project.deleteTitle"),
          message: $_("sidebar.project.deleteConfirm", { values: { name: focusedProject ?? "" } }),
          onConfirm: deleteProject,
        })}
    >
      {$_("sidebar.project.delete")}
    </button>

    <hr />

    <button on:click={handleImport}> {$_("sidebar.import")} </button>

    <button on:click={handleExport}> {$_("sidebar.export")} </button>

    <button on:click={handleUndo} disabled={!focusedCanUndo}> {$_("sidebar.undo")} </button>
  </div>

  <div class="bottom-section">
    {#if $pendingUpdate}
      <button
        class="update-btn"
        disabled={installError !== ""}
        on:click={async () => {
          installError = "";
          try {
            // 🛡️ Flushear datos pendientes antes de actualizar
            await autoSave.flush();
            await $pendingUpdate!.downloadAndInstall();
            await relaunch();
          } catch (e) {
            console.error("Update failed:", e);
            installError = $_("sidebar.update.error");
          }
        }}
      >
        {installError ? $_("sidebar.update.installError") : $_("sidebar.update.install", { values: { version: $pendingUpdate.version } })}
      </button>
      {#if installError}
        <button class="update-btn" on:click={() => { installError = ""; checkForUpdates(); }}>
          {$_("sidebar.update.retry")}
        </button>
      {/if}
    {:else if $checkingUpdate}
      <button class="update-btn" disabled> {$_("sidebar.update.checking")} </button>
    {:else if $upToDate}
      <button class="update-btn up-to-date" disabled>
        {$_("sidebar.update.upToDate")}
      </button>
    {:else if $updateError}
      <button class="update-btn update-error" disabled>
        ❌ {$updateError}
      </button>
      <button class="update-btn" on:click={checkForUpdates}>
        {$_("sidebar.update.retry")}
      </button>
    {:else}
      <button class="update-btn" on:click={checkForUpdates}>
        {$_("sidebar.update.search")}
      </button>
    {/if}

    <select class="lang-select" value={$currentLanguage} on:change={(e) => setLanguage((e.target as HTMLSelectElement).value)}>
      <option value="es">🇪🇸 ES</option>
      <option value="en">🇺🇸 EN</option>
    </select>

    <button on:click={() => session.logout()}> {$_("sidebar.lock")} </button>

    <span class="sidebar-version">v{__APP_VERSION__}</span>
  </div>
</div>

<style>
  .sidebar {
    width: 260px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100vh;
    overflow: hidden;
    box-sizing: border-box;

    background: #17191d;
    border-right: 1px solid #2a2f37;
  }

  .scrollable-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  button {
    width: 100%;
    box-sizing: border-box;
    background: #1f2329;
    color: white;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #2b3138;
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .filter-btn {
    margin-left: 12px;
    width: calc(100% - 12px);
    padding: 6px 10px !important;
    font-size: 12px !important;
    background: #1a1d24 !important;
    border-color: #2a2f37 !important;
  }

  .filter-btn.active {
    background: rgba(250, 204, 21, 0.1) !important;
    border-color: #facc15 !important;
  }

  .tag-filter-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 12px;
  }

  .tag-filter-label {
    font-size: 11px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 0;
  }

  .tag-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tag-toggle.active {
    background: rgba(168, 85, 247, 0.1) !important;
    border-color: #a855f7 !important;
  }

  .tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tag-admin-btn {
    margin-top: 4px;
  }

  select {
    width: 100%;
    box-sizing: border-box;
    background: #1f2329;
    color: black;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
  }

  hr {
    width: 100%;
    border: none;
    border-top: 1px solid #30363d;
  }

  .bottom-section {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sidebar-version {
    text-align: center;
    font-size: 11px;
    color: #4b5563;
  }

  .update-btn.up-to-date {
    background: rgba(34, 197, 94, 0.1) !important;
    border-color: #22c55e !important;
    color: #22c55e !important;
    cursor: default !important;
    font-size: 12px;
  }

  .update-btn.update-error {
    background: rgba(239, 68, 68, 0.1) !important;
    border-color: #ef4444 !important;
    color: #ef4444 !important;
    cursor: default !important;
    font-size: 12px;
  }

  .lang-select {
    width: 100%;
    box-sizing: border-box;
    background: #1f2329;
    color: #e5e7eb;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    font-size: 13px;
  }
</style>
