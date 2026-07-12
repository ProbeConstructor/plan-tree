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
  background: #2a1f0f;
  border: 1px solid #f59e0b;
  color: #f59e0b;
}
.recovery-banner.success {
  background: #16221a;
  border: 1px solid #4caf50;
  color: #4caf50;
}
.recovery-banner button {
  align-self: flex-start;
  background: #1a1d24;
  border: 1px solid #2a2f37;
  color: #e7e9ee;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.recovery-key {
  background: #0f1115;
  border-radius: 6px;
  padding: 10px;
  word-break: break-all;
  user-select: all;
  color: #facc15;
}
</style>
