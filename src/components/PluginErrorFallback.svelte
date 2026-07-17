<script lang="ts">
  let { pluginId, error }: { pluginId: string; error?: string } = $props();
</script>

<div class="plugin-error-fallback">
  <p class="error-title">Plugin view unavailable</p>
  <p class="error-plugin">Plugin: {pluginId}</p>
  {#if error}
    <p class="error-detail">{error}</p>
  {/if}
</div>

<style>
  .plugin-error-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    color: var(--text-muted);
    text-align: center;
    min-height: 120px;
  }
  .error-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--text-secondary);
  }
  .error-plugin {
    font-size: 12px;
    margin: 0 0 8px;
    opacity: 0.7;
  }
  .error-detail {
    font-size: 11px;
    margin: 0;
    padding: 8px 12px;
    background: var(--bg-inset);
    border-radius: 4px;
    max-width: 300px;
    word-break: break-word;
  }
</style>
