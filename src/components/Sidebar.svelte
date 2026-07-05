<script lang="ts">
  import { get } from "svelte/store";
  import { tree, undo, canUndo, snapshot } from "../stores/treeStore";
  import { projects, activeProject } from "../stores/workspaceStore";
  import { switchProject, deleteProject } from "../services/workspaceManager";
  import { exportTree, importTree } from "../services/projectManager";
  import { session } from "../services/sessionOrchestrator";
  import { currentView } from "../stores/viewStore";
  import { openModal } from "../stores/modalStore";
  import NewProjectModal from "../modals/NewProjectModal.svelte";
  import RenameProjectModal from "../modals/RenameProjectModal.svelte";
  import ConfirmModal from "../modals/ConfirmModal.svelte";

  function handleKeydown(event: KeyboardEvent) {
    const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z";
    if (isUndo && $canUndo) {
      event.preventDefault();
      undo();
    }
  }

  async function handleExport() {
    await exportTree(get(tree));
  }

  async function handleImport() {
    const imported = await importTree();

    if (!imported) return;

    snapshot();
    tree.set(imported);
  }

  function changeProject(event: Event) {
    switchProject((event.target as HTMLSelectElement).value);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="sidebar">
  <button on:click={() => currentView.set("tree")}> 🌳 Árbol </button>

  <button on:click={() => currentView.set("dashboard")}> 📊 Dashboard </button>

  <button on:click={() => currentView.set("calendar")}> 📅 Calendario </button>

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

  <hr />

  <button on:click={() => session.logout()}> 🔒 Bloquear </button>
</div>

<style>
  .sidebar {
    width: 260px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    background: #17191d;
    border-right: 1px solid #2a2f37;
  }

  button {
    width: 100%;
    background: #1f2329;
    color: white;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
  }

  button:hover {
    background: #2b3138;
  }

  select {
    width: 100%;
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
</style>
