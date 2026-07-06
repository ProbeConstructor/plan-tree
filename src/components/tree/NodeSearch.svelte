<script lang="ts">
  import { query, results, isOpen, closeSearch } from "../../stores/searchStore";
  import { tree } from "../../stores/treeStore";
  import { setFocus } from "../../utils/treeUtils";
  import { onMount } from "svelte";

  let inputEl: HTMLInputElement;
  let searchEl: HTMLDivElement;

  onMount(() => {
    // small delay to let the DOM settle before focusing
    setTimeout(() => inputEl?.focus(), 50);
  });

  function handleSelect(id: string) {
    tree.update((t) => setFocus(t, id));
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    closeSearch();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      tree.update((t) => setFocus(t, null));
      closeSearch();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (searchEl && !searchEl.contains(e.target as Node)) {
      closeSearch();
    }
  }
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:click={handleClickOutside}
/>

<div class="search-container" bind:this={searchEl}>
  <input
    bind:this={inputEl}
    type="text"
    class="search-input"
    placeholder="Buscar nodos..."
    bind:value={$query}
  />

  {#if $results.length > 0}
    <ul class="search-results">
      {#each $results as result}
        <li>
          <button class="result-item" on:click={() => handleSelect(result.id)}>
            <span class="result-title">{result.title}</span>
            {#if result.matchSnippet}
              <span class="result-snippet">{result.matchSnippet}</span>
            {/if}
            <span class="result-field">
              {result.matchField === "title" ? "Título" : "Comentario"}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {:else if $query.length > 0}
    <p class="no-results">Sin resultados</p>
  {/if}
</div>

<style>
  .search-container {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    z-index: 1000;
    max-width: 400px;
  }

  .search-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #262b33;
    border-radius: 8px;
    background: #1a1d24;
    color: #e7e9ee;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  }

  .search-input:focus {
    border-color: #facc15;
  }

  .search-results {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    background: #1a1d24;
    border: 1px solid #262b33;
    border-radius: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    color: #e7e9ee;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }

  .result-item:hover {
    background: #262b33;
  }

  .result-item:first-child {
    border-radius: 8px 8px 0 0;
  }

  .result-item:last-child {
    border-radius: 0 0 8px 8px;
  }

  .result-title {
    font-weight: 600;
  }

  .result-snippet {
    font-size: 11px;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-field {
    font-size: 10px;
    color: #facc15;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .no-results {
    margin: 4px 0 0;
    padding: 10px 14px;
    background: #1a1d24;
    border: 1px solid #262b33;
    border-radius: 8px;
    color: #6b7280;
    font-size: 13px;
    text-align: center;
  }
</style>
