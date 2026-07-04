<script lang="ts">
  export let onManageUsers: () => void = () => {};
  import { session } from "../services/sessionOrchestrator";
  import {
    createProfile,
    selectProfile,
    refreshProfiles,
  } from "../services/profileManager";
  import { activeProfile, profiles } from "../stores/profileStore";
  import { get } from "svelte/store";
  import { ask } from "@tauri-apps/plugin-dialog";

  type Mode = "login" | "recover";

  let mode: Mode = "login";

  // si ya había un perfil usado antes (restoreLastProfile), lo precargamos
  let username = $activeProfile ?? "";
  let password = "";
  let error = "";
  let loading = false;

  // --- modo recuperación ---
  let recoveryKeyInput = "";
  let newPassword = "";
  let newRecoveryKeyResult = "";

  /**
   * Si el usuario YA existe, solo lo selecciona. Si es nuevo, pide
   * confirmación explícita antes de crear la cuenta (evita que un
   * typo en el nombre cree perfiles fantasma sin querer). Los errores
   * reales (nombre inválido, límite de perfiles alcanzado) SÍ se
   * propagan — antes se tragaban junto con el caso "ya existía".
   */
  async function ensureProfileSelected(name: string): Promise<void> {
    await refreshProfiles();
    const exists = get(profiles).includes(name);

    if (!exists) {
      /*const wantsToCreate = confirm(
        `No existe un usuario "${name}". ¿Crear una cuenta nueva con ese nombre?`,
      );*/
      const confirmed = await ask(
        `No existe un usuario "${name}". ¿Crear una cuenta nueva con ese nombre?`,
        {
          title: "Confirmar acción crítica",
          kind: "warning", // Puede ser 'info', 'warning', 'error'
          okLabel: "Sí, crear",
          cancelLabel: "No, cancelar",
        },
      );
      if (!confirmed) {
        throw new Error("Creación cancelada.");
      }
      await createProfile(name);
    }

    await selectProfile(name);
  }

  async function submit() {
    error = "";

    const name = username.trim();
    if (!name) {
      error = "Ingresa tu usuario";
      return;
    }
    if (!password) {
      error = "Ingresa tu contraseña";
      return;
    }

    loading = true;

    try {
      await ensureProfileSelected(name);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      loading = false;
      return;
    }

    const pwd = password;
    password = ""; // no dejar la contraseña en memoria más de lo necesario

    const ok = await session.login(pwd);

    if (!ok) {
      error = "Usuario o contraseña incorrectos";
    }

    loading = false;
  }

  function goToRecover() {
    mode = "recover";
    error = "";
  }

  function backToLogin() {
    mode = "login";
    error = "";
    newRecoveryKeyResult = "";
    recoveryKeyInput = "";
    newPassword = "";
  }

  async function submitRecovery() {
    error = "";

    const name = username.trim();
    if (!name) {
      error = "Ingresa tu usuario";
      return;
    }
    if (!recoveryKeyInput.trim()) {
      error = "Ingresa tu clave de recuperación";
      return;
    }
    if (newPassword.length < 4) {
      error = "La contraseña nueva es muy corta";
      return;
    }

    loading = true;

    try {
      await ensureProfileSelected(name);
      const newKey = await session.recover(
        recoveryKeyInput.trim(),
        newPassword,
      );
      newRecoveryKeyResult = newKey;
    } catch (e) {
      error =
        e instanceof Error ? e.message : "Clave de recuperación incorrecta";
    }

    loading = false;
  }
</script>

<div class="login-screen">
  <h1>🌳 Plan Tree</h1>

  {#if mode === "login"}
    <input
      type="text"
      placeholder="Usuario"
      bind:value={username}
      disabled={loading}
    />
    <input
      type="password"
      placeholder="Contraseña"
      bind:value={password}
      disabled={loading}
      on:keydown={(e) => e.key === "Enter" && submit()}
    />

    <p class="hint">
      Si es la primera vez con este usuario, la contraseña que ingreses ahora se
      vuelve tu contraseña maestra. Guárdala bien.
    </p>

    <button on:click={submit} disabled={loading}>
      {loading ? "..." : "Entrar"}
    </button>

    <button class="link-btn" on:click={goToRecover} disabled={loading}>
      ¿Olvidaste tu contraseña?
    </button>

    <button class="link-btn" on:click={onManageUsers} disabled={loading}>
      Administrar usuarios
    </button>

    {#if error}
      <p class="error">{error}</p>
    {/if}
  {:else if mode === "recover"}
    {#if newRecoveryKeyResult}
      <div class="recovery-result">
        <p class="hint">
          ✅ Contraseña actualizada. Esta es tu clave de recuperación
          <strong>nueva</strong> — la anterior ya no sirve. Guárdala en un lugar
          seguro, no se puede volver a mostrar:
        </p>
        <code class="recovery-key">{newRecoveryKeyResult}</code>
        <button on:click={backToLogin}>Listo, ya la guardé</button>
      </div>
    {:else}
      <p class="hint">
        Ingresa tu usuario, tu clave de recuperación, y una contraseña nueva.
      </p>

      <input
        type="text"
        placeholder="Usuario"
        bind:value={username}
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Clave de recuperación"
        bind:value={recoveryKeyInput}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Contraseña nueva"
        bind:value={newPassword}
        disabled={loading}
        on:keydown={(e) => e.key === "Enter" && submitRecovery()}
      />

      <button on:click={submitRecovery} disabled={loading}>
        {loading ? "Recifrando proyectos..." : "Restablecer contraseña"}
      </button>

      <button class="link-btn" on:click={backToLogin} disabled={loading}>
        Volver
      </button>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .login-screen {
    max-width: 320px;
    margin: 80px auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  .hint {
    font-size: 13px;
    color: #9aa1ab;
  }
  .error {
    color: #ef4444;
    font-size: 13px;
  }
  input {
    background: #1a1d24;
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
  .recovery-result {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .recovery-key {
    background: #1a1d24;
    border: 1px solid #facc15;
    color: #facc15;
    border-radius: 6px;
    padding: 10px;
    font-size: 13px;
    word-break: break-all;
    user-select: all;
  }
</style>
