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
  import { t } from "svelte-i18n";
  import { setLanguage, currentLanguage } from "../stores/languageStore";
  import Logo from "./Logo.svelte";
  import { ask } from "@tauri-apps/plugin-dialog";

  type Mode = "login" | "recover";

  let mode: Mode = "login";

  let username = $activeProfile ?? "";
  let password = "";
  let error = "";
  let loading = false;

  // --- recovery mode ---
  let recoveryKeyInput = "";
  let newPassword = "";
  let newRecoveryKeyResult = "";

  async function ensureProfileSelected(name: string): Promise<void> {
    await refreshProfiles();
    const exists = get(profiles).includes(name);

    if (!exists) {
      const confirmed = await ask(
        get(t)("login.confirmCreateMessage", { values: { name } }),
        {
          title: get(t)("login.confirmCreateTitle"),
          kind: "warning",
          okLabel: get(t)("login.confirmCreateOk"),
          cancelLabel: get(t)("login.confirmCreateCancel"),
        },
      );
      if (!confirmed) {
        throw new Error(get(t)("login.creationCancelled"));
      }
      await createProfile(name);
    }

    await selectProfile(name);
  }

  async function submit() {
    error = "";

    const name = username.trim();
    if (!name) {
      error = get(t)("login.usernameRequired");
      return;
    }
    if (password.length < 4) {
      error = get(t)("login.passwordTooShort");
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
    password = "";

    try {
      const ok = await session.login(pwd);

      if (!ok) {
        error = get(t)("login.invalidCredentials");
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
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
      error = get(t)("login.usernameRequired");
      return;
    }
    if (!recoveryKeyInput.trim()) {
      error = get(t)("login.recoveryKeyIncorrect");
      return;
    }
    if (newPassword.length < 4) {
      error = get(t)("login.passwordTooShort");
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
        e instanceof Error ? e.message : get(t)("login.recoveryKeyIncorrect");
    }

    loading = false;
  }
</script>

<div class="login-screen">
  <div class="login-header">
    <Logo size={200} />
    <h1>Plan Tree</h1>
  </div>

  {#if mode === "login"}
    <input
      type="text"
      placeholder={$t('login.username.placeholder')}
      maxlength="32"
      bind:value={username}
      disabled={loading}
    />
    <input
      type="password"
      placeholder={$t('login.password.placeholder')}
      bind:value={password}
      disabled={loading}
      onkeydown={(e) => e.key === "Enter" && submit()}
    />

    <p class="hint">
      {$t('login.firstTimeHint')}
    </p>

    <button onclick={submit} disabled={loading}>
      {loading ? "..." : $t('login.submit')}
    </button>

    <button class="link-btn" onclick={goToRecover} disabled={loading}>
      {$t('login.forgotPassword')}
    </button>

    <button class="link-btn" onclick={onManageUsers} disabled={loading}>
      {$t('login.manageUsers')}
    </button>

    {#if error}
      <p class="error">{error}</p>
    {/if}
  {:else if mode === "recover"}
    {#if newRecoveryKeyResult}
      <div class="recovery-result">
        <p class="hint">
          {$t('login.passwordUpdated')}
        </p>
        <code class="recovery-key">{newRecoveryKeyResult}</code>
        <button onclick={backToLogin}>{$t('login.recoveryKeySaved')}</button>
      </div>
    {:else}
      <p class="hint">
        {$t('login.recoveryHint')}
      </p>

      <input
        type="text"
        placeholder={$t('login.username.placeholder')}
        maxlength="32"
        bind:value={username}
        disabled={loading}
      />
      <input
        type="text"
        placeholder={$t('login.recovery.placeholder')}
        bind:value={recoveryKeyInput}
        disabled={loading}
      />
      <input
        type="password"
        placeholder={$t('login.newPassword.placeholder')}
        bind:value={newPassword}
        disabled={loading}
        onkeydown={(e) => e.key === "Enter" && submitRecovery()}
      />

      <button onclick={submitRecovery} disabled={loading}>
        {loading ? $t('login.reencrypting') : $t('login.resetPassword')}
      </button>

      <button class="link-btn" onclick={backToLogin} disabled={loading}>
        {$t('login.back')}
      </button>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    {/if}
  {/if}

  <select class="lang-select" value={$currentLanguage} onchange={(e) => setLanguage((e.target as HTMLSelectElement).value)}>
    <option value="es">🇪🇸 Español</option>
    <option value="en">🇺🇸 English</option>
  </select>

  <p class="version-badge">v{__APP_VERSION__}</p>
</div>

<style>
  .login-screen {
    max-width: 400px;
    margin: 60px auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  .login-header {
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: center;
  }
  .login-header h1 {
    font-size: 28px;
    margin: 0;
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
  .version-badge {
    font-size: 11px;
    color: #4b5563;
    margin: 40px 0 0 0;
    text-align: left;
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

  .lang-select {
    background: #1a1d24;
    border: 1px solid #2a2f37;
    color: #e7e9ee;
    border-radius: 6px;
    padding: 8px;
    cursor: pointer;
    font-size: 13px;
    text-align: center;
  }
</style>
