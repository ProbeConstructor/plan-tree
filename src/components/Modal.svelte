<script lang="ts">
  import { closeModal } from "../stores/modalStore";

  export let title = "";

  function close(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
</script>

<svelte:window
  on:keydown={(e) => e.key === "Escape" && closeModal()}
/>

<div
  class="backdrop"
  role="button"
  tabindex="0"
  aria-label="Close dialog"
  on:click={close}
  on:keydown={(e) => (e.key === 'Enter') && closeModal()}
>

<div
  class="modal"
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  on:click|stopPropagation
  on:keydown|stopPropagation
>

<header>
      <h2>{title}</h2>
      <button
        class="close"
        on:click={closeModal}>
        ✕
      </button>
    </header>
<section>
    <slot/>
</section>

</div>
</div>

<style>
.backdrop{
  position:fixed;
  inset:0;
  display:flex;
  justify-content:center;
  align-items:center;
  background:var(--backdrop);
  backdrop-filter:blur(5px);
  z-index:1000;
}

.modal{
  display:flex;
  flex-direction:column;
  width:420px;
  min-width:420px;
  min-height:300px;
  max-width:90vw;
  max-height:85vh;
  resize:both;
  overflow:hidden;
  background:var(--bg-surface);
  border:1px solid var(--border-default);
  border-radius:12px;
}

header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:16px 18px;
  border-bottom:1px solid var(--border-default);
}

section{
  flex:1;
  min-height:0;
  display:flex;
  flex-direction:column;
  padding:18px;
}

h2{
  margin:0;
  font-size:18px;
  color:var(--text-primary);
}

.close{
  background:none;
  border:none;
  color:var(--text-muted);
  font-size:18px;
  cursor:pointer;
}
</style>