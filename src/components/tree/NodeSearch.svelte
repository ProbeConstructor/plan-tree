<script lang="ts">
  import { query, results } from "../../stores/searchStore";
  import { getPanelInstance } from "../../stores/panelRegistry";
  import { getFocusedPanel } from "../../services/panelManager";
  import { setFocus } from "../../utils/treeUtils";
  import { closeModal } from "../../stores/modalStore";
  import Modal from "../Modal.svelte";
  import { onMount, onDestroy } from "svelte";
  import { _ } from "svelte-i18n";

  let inputEl: HTMLInputElement;

  onMount(() => {
    query.set("");
    setTimeout(() => inputEl?.focus(), 50);
  });

  onDestroy(() => {
    const inst = getPanelInstance(getFocusedPanel());
    inst.tree.update((t) => setFocus(t, null));
    query.set("");
  });

  function handleSelect(id: string) {
    const inst = getPanelInstance(getFocusedPanel());
    inst.tree.update((t) => setFocus(t, id));
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    closeModal();
  }
</script>

<Modal title={$_("search.title")}>
  <input
    bind:this={inputEl}
    type="text"
    class="search-input"
    placeholder={$_("search.placeholder")}
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
              {#if result.matchField === "tag"}
                <span class="tag-dot" style="background: {result.matchTagColor}"></span>
              {/if}
              {result.matchField === "title" ? $_("search.field.title") : result.matchField === "tag" ? $_("search.field.tag") : $_("search.field.comment")}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {:else if $query.length > 0}
    <p class="no-results">{$_("search.noResults")}</p>
  {/if}
</Modal>

<style>
  .search-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #262b33;
    border-radius: 8px;
    background: #0f1115;
    color: #e7e9ee;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    margin-bottom: 8px;
  }

  .search-input:focus {
    border-color: #facc15;
  }

  .search-results {
    list-style: none;
    margin: 0;
    padding: 0;
    background: #0f1115;
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
    margin: 0;
    padding: 10px 14px;
    background: #0f1115;
    border: 1px solid #262b33;
    border-radius: 8px;
    color: #6b7280;
    font-size: 13px;
    text-align: center;
  }
</style>
