<script lang="ts">
  const PALETTE = [
    "#4caf50",
    "#2196f3",
    "#ff9800",
    "#f44336",
    "#9c27b0",
    "#e91e63",
    "#00bcd4",
    "#cddc39",
  ];

  let {
    currentColor = "#4caf50",
    onSelect = (_color: string) => {},
  }: {
    currentColor?: string;
    onSelect?: (color: string) => void;
  } = $props();

  let customInput: HTMLInputElement | undefined = $state();

  function openCustom() {
    customInput?.click();
  }

  function onCustomPick() {
    if (customInput?.value) {
      onSelect(customInput.value);
    }
  }
</script>

<div class="picker">
  {#each PALETTE as color}
    <button
      class="swatch"
      class:active={currentColor === color}
      style="background: {color}"
      onclick={() => onSelect(color)}
      aria-label="Color {color}"
    ></button>
  {/each}

  <button class="custom-btn" onclick={openCustom} title="Personalizar color">
    🎨
  </button>
  <input
    bind:this={customInput}
    type="color"
    value={currentColor}
    onchange={onCustomPick}
    class="hidden-input"
  />
</div>

<style>
  .picker {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }

  .swatch {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: border-color 0.15s, transform 0.1s;
  }

  .swatch:hover {
    transform: scale(1.15);
  }

  .swatch.active {
    border-color: #e7e9ee;
  }

  .custom-btn {
    background: #1f2329;
    border: 1px solid #30363d;
    border-radius: 50%;
    width: 26px;
    height: 26px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .custom-btn:hover {
    background: #2b3138;
  }

  .hidden-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
  }
</style>
