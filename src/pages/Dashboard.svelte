<script lang="ts">

import { tree } from "../stores/treeStore";

import {
    getTodayNodes,
    getPriorityEmoji,
    getStatusEmoji,
    calculateGlobalProgress,
    getDirectBranches,
    getPriorityBreakdown,
    getOverdueAndUpcoming,
    daysOverdue,
    setFocus
} from "../utils/treeUtils";

$: globalProgress = calculateGlobalProgress($tree);
$: branches = getDirectBranches($tree);
$: priorityBreakdown = getPriorityBreakdown($tree);
$: progress = calculateGlobalProgress($tree);
$: today = getTodayNodes($tree);
$: priorities = getPriorityBreakdown($tree);

$: ({ overdue, upcoming } =
    getOverdueAndUpcoming($tree));

function focusAndScroll(id:string){

    tree.update(t=>setFocus(t,id));

    document
        .getElementById(id)
        ?.scrollIntoView({
            behavior:"smooth",
            block:"center"
        });

}
</script>

<section class="summary">

  <div class="summary-block">
    <h2>📊 Progreso global · {globalProgress}%</h2>

    <div class="global-bar">
      <div
        class="global-bar-fill"
        style="width:{globalProgress}%"
      ></div>
    </div>

    {#if branches.length > 0}
      <ul class="branch-list">
        {#each branches as branch}
          <li>
            <button
              class="link-item"
              on:click={() => focusAndScroll(branch.id)}
            >
              {branch.title}
            </button>
            <span class="branch-pct">
              {branch.progress}%
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="summary-block">
    <h2>🎯 Para hoy</h2>

    {#if getTodayNodes($tree).length === 0}
      <p class="empty">
        Nada urgente todavía 🙌
      </p>
    {:else}
      <ul>
        {#each getTodayNodes($tree) as node}
          <li>
            <button
              class="link-item"
              on:click={() => focusAndScroll(node.id)}
            >
              {getPriorityEmoji(node.priority)}
              {getStatusEmoji(node.status)}
              {node.title}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div class="summary-block">
    <h2>🔥 Por prioridad</h2>
    <ul class="priority-list">
      {#each Object.entries(priorityBreakdown) as [key, val]}
        <li>
          {getPriorityEmoji(key)}
          {key}
          ·
          {val.done}/{val.total}
          completados
        </li>
      {/each}
    </ul>
  </div>
  <div class="summary-block">
    <h2>⏰ Atrasados / por vencer</h2>
    {#if overdue.length===0 && upcoming.length===0}
      <p class="empty">
        Todo al día 🙌
      </p>
    {:else}
      <ul>
        {#each overdue as node}
          <li>
            <button
              class="link-item overdue"
              on:click={() => focusAndScroll(node.id)}
            >
              🔴
              {node.title}
              ·
              {daysOverdue(node.dueDate!)}d atrasado
            </button>
          </li>
        {/each}
        {#each upcoming as node}
          <li>
            <button
              class="link-item"
              on:click={() => focusAndScroll(node.id)}
            >
              🟡
              {node.title}
              · vence {node.dueDate}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
.summary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    max-width: 1300px;
}

.summary-block {
    background: #1a1d24;
    border: 1px solid #262b33;
    border-radius: 12px;
    padding: 18px;
    box-sizing: border-box;
}

.summary-block h2 {
    margin: 0 0 14px 0;
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: #9aa1ab;
}

.summary-block ul{
    margin:0;
    padding-left:18px;
}

.summary-block li{
    margin-bottom:6px;
}

.empty{
    color:#6b7280;
}

.global-bar{
    height:10px;
    border-radius:999px;
    overflow:hidden;
    background:#0f1115;
    margin-bottom:14px;
}

.global-bar-fill{
    height:100%;
    background:#4caf50;
    transition:.2s;
}

.branch-list{
    list-style:none;
    padding:0;
    margin:0;
}

.branch-list li{
    display:flex;
    justify-content:space-between;
    align-items:center;
}

.priority-list{
    list-style:none;
    padding:0;
    margin:0;
}

.branch-pct{
    color:#6b7280;
}

.link-item{
    background:none;
    border:none;
    color:#d6dae2;
    cursor:pointer;
    text-align:left;
    padding:0;
    font-size:14px;
}

.link-item:hover{
    color:#facc15;
    text-decoration:underline;
}

.link-item.overdue{
    color:#ef4444;
}
</style>