<script lang="ts">
  import { pluginStore, updatePlugin } from "../stores/pluginStore";
  import { pluginManager } from "../services/pluginManager";

  let plugins = $state($pluginStore);
  let selectedId = $state<string | null>(null);
  let settingsCache = $state<Record<string, Record<string, unknown>>>({});

  // Sync when store updates
  $effect(() => {
    plugins = $pluginStore;
  });

  function selectedPlugin() {
    return plugins.find((p) => p.id === selectedId) ?? null;
  }

  async function togglePlugin(id: string, enabled: boolean) {
    if (enabled) {
      await pluginManager.enablePlugin(id);
    } else {
      await pluginManager.disablePlugin(id);
    }
  }
</script>

<div class="plugin-settings">
  <h2>Plugin Settings</h2>

  <div class="plugin-list">
    {#if plugins.length === 0}
      <p class="empty-state">No plugins installed.</p>
      <p class="empty-hint">Place plugin directories in ~/.config/plan-tree/plugins/</p>
    {:else}
      {#each plugins as plugin (plugin.id)}
        <button
          class="plugin-item"
          class:selected={selectedId === plugin.id}
          onclick={() => (selectedId = selectedId === plugin.id ? null : plugin.id)}
        >
          <div class="plugin-info">
            <span class="plugin-name">{plugin.name}</span>
            <span class="plugin-version">v{plugin.version}</span>
            <span class="plugin-status" class:active={plugin.status === "active"} class:error={plugin.status === "errored"}>
              {plugin.status}
            </span>
          </div>
          <label class="toggle" onclick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={plugin.enabled}
              onchange={(e) => togglePlugin(plugin.id, e.currentTarget.checked)}
            />
            <span class="toggle-slider"></span>
          </label>
        </button>

        {#if selectedId === plugin.id}
          <div class="plugin-detail">
            {#if plugin.error}
              <div class="error-banner">
                <span>Error: {plugin.error}</span>
              </div>
            {/if}
            <div class="detail-row">
              <span class="detail-label">Permissions:</span>
              <span class="detail-value">
                {plugin.permissions.length > 0 ? plugin.permissions.join(", ") : "None"}
              </span>
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .plugin-settings {
    padding: 16px;
  }
  h2 {
    margin: 0 0 16px;
    font-size: 16px;
    color: var(--text-primary);
  }
  .plugin-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .plugin-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    font: inherit;
    color: inherit;
  }
  .plugin-item:hover {
    border-color: var(--accent-primary);
  }
  .plugin-item.selected {
    border-color: var(--accent-primary);
    background: var(--bg-hover);
  }
  .plugin-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .plugin-name {
    font-weight: 600;
    font-size: 13px;
  }
  .plugin-version {
    font-size: 11px;
    color: var(--text-muted);
  }
  .plugin-status {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--bg-inset);
    color: var(--text-muted);
  }
  .plugin-status.active {
    background: var(--accent-success, #22c55e);
    color: white;
  }
  .plugin-status.error {
    background: var(--accent-danger);
    color: white;
  }
  .plugin-detail {
    padding: 10px 12px;
    background: var(--bg-inset);
    border-radius: 0 0 6px 6px;
    margin-top: -4px;
    border: 1px solid var(--border-default);
    border-top: none;
  }
  .detail-row {
    display: flex;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 4px;
  }
  .detail-label {
    color: var(--text-muted);
    min-width: 90px;
  }
  .detail-value {
    color: var(--text-primary);
  }
  .error-banner {
    padding: 6px 10px;
    background: var(--accent-danger);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 8px;
  }
  .empty-state {
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
    margin: 24px 0 8px;
  }
  .empty-hint {
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
    opacity: 0.7;
    margin: 0;
  }
  /* Toggle switch */
  .toggle {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }
  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: var(--bg-muted);
    border-radius: 20px;
    transition: 0.2s;
  }
  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
  }
  .toggle input:checked + .toggle-slider {
    background: var(--accent-primary);
  }
  .toggle input:checked + .toggle-slider::before {
    transform: translateX(16px);
  }
</style>
