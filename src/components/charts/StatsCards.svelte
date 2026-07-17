<script lang="ts">
  import { _ } from "svelte-i18n";

  let { total = 0, done = 0, progress = 0 }: {
    total?: number;
    done?: number;
    progress?: number;
  } = $props();
</script>

<div class="stats-grid">
  <div class="stat-card">
    <span class="stat-label">{$_("chart.totalNodes")}</span>
    <span class="stat-value">{total}</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">{$_("chart.completed")}</span>
    <span class="stat-value done">{done}</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">{$_("chart.pending")}</span>
    <span class="stat-value pending">{total - done}</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">{$_("chart.progress")}</span>
    <span class="stat-value pct">{progress}%</span>
  </div>
</div>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-card {
    background: var(--bg-surface);
    border: 1px solid var(--bg-muted);
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stat-label {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .stat-value.done {
    color: var(--accent-success);
  }
  .stat-value.pending {
    color: var(--accent-warning);
  }
  .stat-value.pct {
    color: #58a6ff;
  }
</style>
