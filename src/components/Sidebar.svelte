<script lang="ts">
  import { get } from "svelte/store";
  import { tree, undo, canUndo, snapshot, favoritesFilter } from "../stores/treeStore";
  import { projects, activeProject } from "../stores/workspaceStore";
  import { switchProject, deleteProject } from "../services/workspaceManager";
  import { exportTree, importTree } from "../services/projectManager";
  import { importTreeCommand } from "../commands/treeCommands";
  import { session } from "../services/sessionOrchestrator";
  import { panelLayout, isTreeVisible } from "../stores/panelStore";
  import { openModal } from "../stores/modalStore";
  import NewProjectModal from "../modals/NewProjectModal.svelte";
  import RenameProjectModal from "../modals/RenameProjectModal.svelte";
  import ConfirmModal from "../modals/ConfirmModal.svelte";
  import { pendingUpdate, checkingUpdate, upToDate, checkForUpdates } from "../stores/updateStore";
  import { autoSave } from "../services/workspaceManager";
  import { relaunch } from "@tauri-apps/plugin-process";
  import { tagDefs, tagFilter } from "../stores/tagStore";
  import TagManagerModal from "../modals/TagManagerModal.svelte";

  let updateError = $state("");

  function handleKeydown(event: KeyboardEvent) {
    const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z";
    if (isUndo && $canUndo) {
      event.preventDefault();
      undo();
    }
  }

  function handleExport() {
    openModal(ConfirmModal, {
      title: "Exportar proyecto",
      message:
        "⚠️ El archivo exportado contiene los datos SIN ENCRIPTAR.\n" +
        "Cualquiera que lo abra podrá leer su contenido.\n\n" +
        "A continuación elegirá dónde guardarlo.",
      confirmLabel: "Exportar",
      danger: true,
      onConfirm: () => {
        // Deferred: onConfirm resuelve → confirmAction llama closeModal,
        // y recién después se abre el diálogo nativo sin el modal encima.
        setTimeout(() => exportTree(get(tree)), 0);
      },
    });
  }

  async function handleImport() {
    const imported = await importTree();

    if (!imported) return;

    importTreeCommand(imported);
  }

  function changeProject(event: Event) {
    switchProject((event.target as HTMLSelectElement).value);
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
    <button on:click={() => panelLayout.setFocusedView("tree")}> 🌳 Árbol </button>

    {#if $isTreeVisible}
      <button
        class="filter-btn"
        class:active={$favoritesFilter}
        on:click={() => favoritesFilter.update(v => !v)}
      >
        {$favoritesFilter ? "⭐ Ocultar filtro" : "⭐ Solo favoritos"}
      </button>

      {#if $tagDefs.length > 0}
        <div class="tag-filter-section">
          <span class="tag-filter-label">🏷️ Etiquetas</span>
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
        🏷️ Administrar tags
      </button>
    {/if}

    <button on:click={() => panelLayout.setFocusedView("dashboard")}> 📊 Resumen </button>

    <button on:click={() => panelLayout.setFocusedView("calendar")}> 📅 Calendario </button>

    <button on:click={() => panelLayout.setFocusedView("progress")}> 📈 Gráficos </button>

    <hr />
    <select value={$activeProject} on:change={changeProject}>
      {#each $projects as project}
        <option value={project}>
          {project}
        </option>
      {/each}
    </select>

    <button on:click={() => openModal(NewProjectModal)}>
      ➕ Nuevo proyecto
    </button>

    <button on:click={() => openModal(RenameProjectModal)}> ✏️ Renombrar </button>

    <button
      on:click={() =>
        openModal(ConfirmModal, {
          title: "Eliminar proyecto",
          message: `¿Eliminar "${$activeProject}"?`,
          onConfirm: deleteProject,
        })}
    >
      🗑️ Eliminar
    </button>

    <hr />

    <button on:click={handleImport}> ⬆️ Importar </button>

    <button on:click={handleExport}> ⬇️ Exportar </button>

    <button on:click={undo} disabled={!$canUndo}> ⏪ Undo </button>
  </div>

  <div class="bottom-section">
    {#if $pendingUpdate}
      <button
        class="update-btn"
        disabled={updateError !== ""}
        on:click={async () => {
          updateError = "";
          try {
            // 🛡️ Flushear datos pendientes antes de actualizar
            await autoSave.flush();
            await $pendingUpdate!.downloadAndInstall();
            await relaunch();
          } catch (e) {
            console.error("Update failed:", e);
            updateError = "Error al actualizar";
          }
        }}
      >
        {updateError ? "❌ Error al actualizar" : `⬇️ Actualizar a v${$pendingUpdate.version}`}
      </button>
      {#if updateError}
        <button class="update-btn" on:click={() => { updateError = ""; checkForUpdates(); }}>
          🔄 Reintentar
        </button>
      {/if}
    {:else if $checkingUpdate}
      <button class="update-btn" disabled> 🔄 Buscando actualizaciones… </button>
    {:else if $upToDate}
      <button class="update-btn up-to-date" disabled>
        ✨ Última versión — la crème de la crème
      </button>
    {:else}
      <button class="update-btn" on:click={checkForUpdates}>
        🔍 Buscar actualizaciones
      </button>
    {/if}

    <button on:click={() => session.logout()}> 🔒 Bloquear </button>

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
</style>
