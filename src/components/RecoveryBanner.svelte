<script lang="ts">
import { hasRecoverySetup, generateRecoveryKey } from "../services/recoveryManager";

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
              ✅ Clave de recuperación generada. Guárdala en un lugar seguro
              <strong>ahora mismo</strong> — no se puede volver a mostrar:
            </p>
            <code class="recovery-key">{showRecoveryKey}</code>
            <button on:click={() => (showRecoveryKey = "")}>Listo, ya la guardé</button>
          </div>
        {:else if recoverySetupNeeded}
          <div class="recovery-banner warning">
            <p>
              ⚠️ Todavía no tienes una clave de recuperación. Si olvidas tu
              contraseña, perderás el acceso a tus proyectos para siempre.
            </p>
            <button on:click={handleGenerateRecoveryKey}>
              🔑 Generar clave de recuperación
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