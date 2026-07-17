<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { setLanguage } from "../stores/languageStore";

  const dispatch = createEventDispatcher<{ select: void }>();

  async function choose(lang: string) {
    await setLanguage(lang);
    dispatch("select");
  }
</script>

<div class="selector-screen">
  <div class="selector-header">
    <h1>Plan Tree</h1>
    <p class="subtitle">Choose your language</p>
  </div>

  <div class="cards">
    <button class="lang-card" onclick={() => choose("en")}>
      <span class="flag">🇺🇸</span>
      <span class="lang-name">English</span>
    </button>

    <button class="lang-card" onclick={() => choose("es")}>
      <span class="flag">🇪🇸</span>
      <span class="lang-name">Español</span>
    </button>
  </div>

  <p class="hint">You can change this later from the sidebar.</p>
</div>

<style>
  .selector-screen {
    max-width: 400px;
    margin: 80px auto;
    display: flex;
    flex-direction: column;
    gap: 32px;
    text-align: center;
  }
  .selector-header h1 {
    font-size: 28px;
    margin: 0 0 8px 0;
  }
  .subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }
  .cards {
    display: flex;
    gap: 16px;
    justify-content: center;
  }
  .lang-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 32px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 10px;
    color: var(--text-primary);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    min-width: 140px;
  }
  .lang-card:hover {
    border-color: var(--text-disabled);
    background: var(--bg-hover);
  }
  .flag {
    font-size: 36px;
  }
  .lang-name {
    font-size: 16px;
    font-weight: 500;
  }
  .hint {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }
</style>
