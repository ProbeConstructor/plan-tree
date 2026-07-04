<script lang="ts">
  import { profiles } from "../stores/profileStore";
  import { refreshProfiles } from "../services/profileManager";
  import { deleteProfileWithAuth } from "../services/userManager";
  import { onMount } from "svelte";

  export let onBack: () => void;

  let openFor: string | null = null;
  let password = "";
  let error = "";
  let loading = false;

  onMount(() => {
    refreshProfiles();
  });

  function openDeleteForm(name: string) {
    openFor = name;
    password = "";
    error = "";
  }

  function cancel() {
    openFor = null;
    password = "";
    error = "";
  }

  async function confirmDelete() {
    if (!openFor) return;
    error = "";

    if (!password) {
      error = "Ingresa la contraseña de este perfil";
      return;
    }

    loading = true;
    const ok = await deleteProfileWithAuth(openFor, password);
    loading = false;

    if (!ok) {
      error = "Contraseña incorrecta";
      return;
    }

    openFor = null;
    password = "";
    await refreshProfiles();
  }
</script>

<div class="user-manager">
  <h1>🌳 Plan Tree</h1>
  <p class="hint">Administrar usuarios</p>

  {#if $profiles.length === 0}
    <p class="hint">No hay perfiles creados todavía.</p>
  {:else}
    <ul class="profile-list">
      {#each $profiles as name}
        <li>
          {#if openFor === name}
            <div class="delete-form">
              <span class="profile-name">👤 {name}</span>
              <input
                type="password"
                placeholder="Contraseña de {name}"
                bind:value={password}
                disabled={loading}
                on:keydown={(e) => e.key === "Enter" && confirmDelete()}
              />
              <div class="delete-actions">
                <button class="danger" on:click={confirmDelete} disabled={loading}>
                  {loading ? "..." : "Confirmar borrado"}
                </button>
                <button on:click={cancel} disabled={loading}>Cancelar</button>
              </div>
              {#if error}<p class="error">{error}</p>{/if}
            </div>
          {:else}
            <div class="profile-row">
              <span class="profile-name">👤 {name}</span>
              <button class="danger" on:click={() => openDeleteForm(name)}>
                🗑️ Eliminar
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <button class="link-btn" on:click={onBack}>Volver al login</button>
</div>

<style>
  .user-manager {
    max-width: 360px;
    margin: 80px auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: center;
  }
  .hint {
    font-size: 13px;
    color: #9aa1ab;
  }
  .profile-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .profile-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #1a1d24;
    border: 1px solid #2a2f37;
    border-radius: 8px;
    padding: 10px;
  }
  .profile-name {
    font-size: 14px;
  }
  .delete-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #1a1d24;
    border: 1px solid #ef4444;
    border-radius: 8px;
    padding: 10px;
  }
  .delete-actions {
    display: flex;
    gap: 8px;
  }
  input {
    background: #0f1115;
    border: 1px solid #2a2f37;
    color: #e7e9ee;
    border-radius: 6px;
    padding: 8px;
  }
  button {
    background: #1a1d24;
    border: 1px solid #2a2f37;
    color: #e7e9ee;
    border-radius: 6px;
    padding: 8px;
    cursor: pointer;
    flex: 1;
  }
  button.danger {
    border-color: #ef4444;
    color: #ef4444;
  }
  .link-btn {
    background: none;
    border: none;
    color: #6b7280;
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }
  .error {
    color: #ef4444;
    font-size: 13px;
    margin: 0;
  }
</style>