<script lang="ts">
import { hasRecoverySetup, generateRecoveryKey } from "../services/recoveryManager";
import { t } from "svelte-i18n";

let recoverySetupNeeded = false;
let showRecoveryKey = "";

import { onMount } from "svelte";

onMount(async()=>{
    recoverySetupNeeded =
        !(await hasRecoverySetup());
});

async function handleGenerateRecoveryKey() {
  showRecoveryKey = await generateRecoveryKey();
  recoverySetupNeeded = false;
}
</script>


{#if showRecoveryKey}
          <div class="recovery-banner success">
            <p>
              {$t('recovery.generated')}
            </p>
            <code class="recovery-key">{showRecoveryKey}</code>
            <button on:click={() => (showRecoveryKey = "")}>{$t('recovery.saved')}</button>
          </div>
        {:else if recoverySetupNeeded}
          <div class="recovery-banner warning">
            <p>
              {$t('recovery.missing')}
            </p>
            <button on:click={handleGenerateRecoveryKey}>
              {$t('recovery.generate')}
            </button>
          </div>
        {/if}

<style>
    .recovery-banner {
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.recovery-banner.warning {
  background: var(--bg-warning-subtle);
  border: 1px solid var(--accent-warning);
  color: var(--accent-warning);
}
.recovery-banner.success {
  background: var(--bg-success-subtle);
  border: 1px solid var(--accent-success);
  color: var(--accent-success);
}
.recovery-banner button {
  align-self: flex-start;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.recovery-key {
  background: var(--bg-deepest);
  border-radius: 6px;
  padding: 10px;
  word-break: break-all;
  user-select: all;
  color: var(--accent-warning);
}
</style>
