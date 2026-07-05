<script lang="ts">
import Modal from "../components/Modal.svelte"
import { closeModal } from "../stores/modalStore";
import { createProject } from "../services/workspaceManager";
import { SAFE_NAME_REGEX, SAFE_NAME_PATTERN } from "../utils/validation";

let name = "";
let error = "";

async function create() {
  error = "";
  const trimmed = name.trim();
  if (!trimmed) {
    error = "El nombre no puede estar vacío.";
    return;
  }
  if (!SAFE_NAME_REGEX.test(trimmed)) {
    error = `Nombre inválido: ${SAFE_NAME_PATTERN}.`;
    return;
  }

  try {
    await createProject(trimmed);
    closeModal();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
}

function focusOnMount(node: HTMLInputElement) {
  node.focus();
}
</script>

<Modal title="Nuevo proyecto">
  <input
    bind:value={name}
    placeholder="Nombre del proyecto"
    maxlength="32"
    use:focusOnMount
    on:keydown={(e) => e.key === "Enter" && create()}
  />

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="buttons">
    <button on:click={closeModal}>
      Cancelar
    </button>

    <button on:click={create}>
      Crear
    </button>
  </div>
</Modal>

<style>
input{
  width:100%;
  padding:10px;
  box-sizing:border-box;
  background:#20242c;
  color:#fff;
  border:1px solid #333;
  border-radius:8px;
}

.error{
  color:#ef4444;
  font-size:13px;
  margin:4px 0;
}

.buttons{
  margin-top:16px;
  display:flex;
  justify-content:flex-end;
  gap:8px;
}

button{
  padding:8px 14px;
}
</style>