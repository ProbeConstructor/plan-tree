<script lang="ts">
import Modal from "../components/Modal.svelte";
import { closeModal } from "../stores/modalStore";
import { activeProject } from "../stores/workspaceStore";
import { renameProject } from "../services/workspaceManager";
import { SAFE_NAME_REGEX, SAFE_NAME_PATTERN } from "../utils/validation";
import { get } from "svelte/store";

let name = get(activeProject);
let error = "";

async function rename() {
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
        await renameProject(trimmed);
        closeModal();
    } catch (e) {
        error = e instanceof Error ? e.message : String(e);
    }
}

function focus(node: HTMLInputElement) {
    node.focus();
}
</script>

<Modal title="Renombrar proyecto">

<input
    bind:value={name}
    maxlength="32"
    use:focus
    on:keydown={(e)=>e.key==="Enter" && rename()}
/>

{#if error}
    <p class="error">{error}</p>
{/if}

<div class="buttons">
    <button on:click={closeModal}>
        Cancelar
    </button>

    <button on:click={rename}>
        Guardar
    </button>
</div>

</Modal>

<style>
.error{
    color:#ef4444;
    font-size:13px;
    margin:4px 0;
}

.buttons{
    display:flex;
    justify-content:flex-end;
    gap:8px;
    margin-top:16px;
}
</style>