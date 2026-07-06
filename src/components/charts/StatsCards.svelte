<script lang="ts">
  let { total = 0, done = 0, progress = 0 }: {
    total?: number;
    done?: number;
    progress?: number;
  } = $props();
</script>

<div class="stats-grid">
  <div class="stat-card">
    <span class="stat-label">Total nodos</span>
    <span class="stat-value">{total}</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">Completados</span>
    <span class="stat-value done">{done}</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">Pendientes</span>
    <span class="stat-value pending">{total - done}</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">Progreso</span>
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
    background: #1a1d24;
    border: 1px solid #262b33;
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stat-label {
    font-size: 12px;
    color: #9aa1ab;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #e7e9ee;
  }
  .stat-value.done {
    color: #4caf50;
  }
  .stat-value.pending {
    color: #f59e0b;
  }
  .stat-value.pct {
    color: #58a6ff;
  }
</style>
