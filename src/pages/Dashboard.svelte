<script lang="ts">

import { tree } from "../stores/treeStore";
import { completions } from "../stores/completionStore";
import { currentView } from "../stores/viewStore";
import type { VirtualInstance } from "../types";

function isVirtualEntry(entry: unknown): entry is VirtualInstance {
    return typeof entry === "object" && entry !== null && "isVirtual" in entry;
}

import {
    getTodayNodes,
    getPriorityEmoji,
    getStatusEmoji,
    calculateGlobalProgress,
    getDirectBranches,
    getPriorityBreakdown,
    getOverdueAndUpcoming,
    daysOverdue,
    setFocus,
    collectFavorites
} from "../utils/treeUtils";

$: globalProgress = calculateGlobalProgress($tree);
$: branches = getDirectBranches($tree);
$: priorityBreakdown = getPriorityBreakdown($tree);
$: progress = calculateGlobalProgress($tree);
$: today = getTodayNodes($tree, $completions);
$: priorities = getPriorityBreakdown($tree);
$: favorites = collectFavorites($tree).slice(0, 10);

$: ({ overdue, upcoming } =
    getOverdueAndUpcoming($tree, 5, $completions));

function focusAndScroll(id:string){
    const nodeId = id.includes("::") ? id.split("::")[0] : id;

    tree.update(t=>setFocus(t, nodeId));
    currentView.set("tree");

    document
        .getElementById(nodeId)
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

    {#if today.length === 0}
      <p class="empty">
        Nada urgente todavía 🙌
      </p>
    {:else}
      <ul>
        {#each today as entry}
          {@const isV = isVirtualEntry(entry)}
          <li>
            <button
              class="link-item"
              class:virtual={isV}
              on:click={() => focusAndScroll(entry.id)}
            >
              {#if isV}
                ♻️
              {:else}
                {getPriorityEmoji((entry as any).priority)}
              {/if}
              {getStatusEmoji((entry as any).status)}
              {(entry as any).title}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="summary-block">
    <h2>⭐ Favoritos</h2>

    {#if favorites.length === 0}
      <p class="empty">
        Sin favoritos todavía — marcá nodos con la estrella ☆
      </p>
    {:else}
      <ul>
        {#each favorites as fav}
          <li>
            <button
              class="link-item"
              on:click={() => focusAndScroll(fav.id)}
            >
              {getPriorityEmoji(fav.priority)}
              {getStatusEmoji(fav.status)}
              {fav.title}
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
        {#each overdue as entry}
          {@const isV = isVirtualEntry(entry)}
          <li>
            <button
              class="link-item overdue"
              class:virtual={isV}
              on:click={() => focusAndScroll(entry.id)}
            >
              {#if isV}
                ♻️ {(entry as VirtualInstance).title} · {(entry as VirtualInstance).date}
              {:else}
                🔴
                {(entry as any).title}
                ·
                {daysOverdue((entry as any).dueDate)}d atrasado
              {/if}
            </button>
          </li>
        {/each}
        {#each upcoming as entry}
          {@const isV = isVirtualEntry(entry)}
          <li>
            <button
              class="link-item"
              class:virtual={isV}
              on:click={() => focusAndScroll(entry.id)}
            >
              {#if isV}
                ♻️ {(entry as VirtualInstance).title} · {(entry as VirtualInstance).date}
              {:else}
                🟡
                {(entry as any).title}
                · vence {(entry as any).dueDate}
              {/if}
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