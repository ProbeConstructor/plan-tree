<script lang="ts">
import Modal from "../components/Modal.svelte";
import { closeModal } from "../stores/modalStore";

export let title = "";
export let message = "";
export let confirmLabel = "Eliminar";
export let danger = true;
export let showCancel = true;
export let onConfirm: () => Promise<void> | void;

async function confirmAction() {
    await onConfirm();
    closeModal();
}
</script>

<Modal {title}>

<p>{message}</p>

<div class="buttons">
    {#if showCancel}
        <button on:click={closeModal}>
            Cancelar
        </button>
    {/if}

    <button
        class:btn={true}
        class:danger
        class:primary={!danger}
        on:click={confirmAction}
    >
        {confirmLabel}
    </button>

</div>

</Modal>

<style>
.buttons{
    display:flex;
    justify-content:flex-end;
    gap:8px;
    margin-top:16px;
}

button, .btn{
    padding:8px 14px;
    border-radius:8px;
}

.danger{
    background:#b91c1c;
}

.primary{
    background:#1f2329;
    border:1px solid #30363d;
}
</style>