<script lang="ts">
import Modal from "../components/Modal.svelte";
import { closeModal } from "../stores/modalStore";
import { _ } from "svelte-i18n";

export let title = "";
export let message = "";
export let confirmLabel = $_("modal.confirm.delete");
export let danger = true;
export let showCancel = true;
export let onConfirm: () => Promise<void> | void;
export let onCancel: (() => void) | undefined = undefined;

async function confirmAction() {
    await onConfirm();
    closeModal();
}

function cancelAction() {
    onCancel?.();
    closeModal();
}
</script>

<Modal {title}>

<p>{message}</p>

<div class="buttons">
    {#if showCancel}
        <button on:click={cancelAction}>
            {$_("modal.confirm.cancel")}
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