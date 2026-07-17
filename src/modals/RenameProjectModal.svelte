<script lang="ts">
import Modal from "../components/Modal.svelte";
import { closeModal } from "../stores/modalStore";
import { activeProject } from "../stores/workspaceStore";
import { renameProject } from "../services/workspaceManager";
import { SAFE_NAME_REGEX, getSafeNamePattern } from "../utils/validation";
import { get } from "svelte/store";
import { _ } from "svelte-i18n";

let name = get(activeProject);
let error = "";

async function rename() {
    error = "";
    const trimmed = name.trim();
    if (!trimmed) {
        error = $_("validation.nameEmpty", { values: { label: $_("modal.rename.title") } });
        return;
    }
    if (!SAFE_NAME_REGEX.test(trimmed)) {
        error = $_("validation.nameInvalid", { values: { label: $_("modal.rename.title"), pattern: getSafeNamePattern() } });
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

<Modal title={$_("modal.rename.title")}>

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
        {$_("modal.confirm.cancel")}
    </button>

    <button on:click={rename}>
        {$_("modal.rename.save")}
    </button>
</div>

</Modal>

<style>
.error{
    color:var(--accent-danger);
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