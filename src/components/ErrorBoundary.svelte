<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { autoSave } from "../services/workspaceManager";
  import { _ } from "svelte-i18n";

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  let error: Error | null = $state(null);
  let showDetails = $state(false);

  function handleError(err: unknown) {
    if (err instanceof Error) {
      error = err;
    } else {
      error = new Error(String(err));
    }
    showDetails = false;
  }

  onMount(() => {
    // global error handlers — catch render/event errors from children
    const origOnError = window.onerror;
    window.onerror = (_event, _source, _line, _col, err) => {
      handleError(err ?? new Error("Unknown error"));
    };
    const origRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      handleError(event.reason);
    };

    return () => {
      window.onerror = origOnError;
      window.onunhandledrejection = origRejection;
    };
  });

  async function recover() {
    error = null;
    showDetails = false;
  }

  async function hardReset() {
    error = null;
    showDetails = false;
    await autoSave.flush();
    window.location.reload();
  }
</script>

{#if error}
  <div class="error-overlay">
    <div class="error-card">
      <h1>{$_("errorBoundary.title")}</h1>
      <p class="error-message">{error.message}</p>

      <button class="toggle-details" onclick={() => (showDetails = !showDetails)}>
        {showDetails ? $_("errorBoundary.hideDetails") : $_("errorBoundary.showDetails")}
      </button>

      {#if showDetails && error.stack}
        <pre class="error-stack">{error.stack}</pre>
      {/if}

      <div class="error-actions">
        <button class="btn-recover" onclick={recover}>{$_("errorBoundary.retry")}</button>
        <button class="btn-reset" onclick={hardReset}>{$_("errorBoundary.reload")}</button>
      </div>
    </div>
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .error-overlay {
    position: fixed;
    inset: 0;
    background: #0f1115;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  .error-card {
    background: #1a1d23;
    border: 1px solid #f43f5e;
    border-radius: 12px;
    padding: 32px;
    max-width: 520px;
    width: 90%;
  }
  h1 {
    margin: 0 0 12px;
    font-size: 20px;
    color: #f43f5e;
  }
  .error-message {
    color: #d1d5db;
    font-size: 14px;
    margin: 0 0 16px;
    line-height: 1.5;
  }
  .toggle-details {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    margin-bottom: 12px;
  }
  .toggle-details:hover {
    color: #9ca3af;
  }
  .error-stack {
    background: #0d0f12;
    color: #9ca3af;
    padding: 12px;
    border-radius: 6px;
    font-size: 11px;
    overflow-x: auto;
    margin-bottom: 16px;
    max-height: 200px;
    overflow-y: auto;
  }
  .error-actions {
    display: flex;
    gap: 8px;
  }
  .btn-recover {
    background: #2563eb;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }
  .btn-recover:hover {
    background: #1d4ed8;
  }
  .btn-reset {
    background: #374151;
    color: #d1d5db;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }
  .btn-reset:hover {
    background: #4b5563;
  }
</style>
