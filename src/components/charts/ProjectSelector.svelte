<script lang="ts">
  import ColorPicker from "./ColorPicker.svelte";

  interface ProjectOption {
    name: string;
    color: string;
    selected: boolean;
  }

  let {
    projects = [] as ProjectOption[],
    onSelectionChange = (_selected: string[]) => {},
    onColorChange = (_project: string, _color: string) => {},
  }: {
    projects?: ProjectOption[];
    onSelectionChange?: (selected: string[]) => void;
    onColorChange?: (project: string, color: string) => void;
  } = $props();

  let open = $state(false);
  let colorPickerFor: string | null = $state(null);

  const selectedCount = $derived(projects.filter((p) => p.selected).length);

  function toggleProject(name: string) {
    const updated = projects.map((p) =>
      p.name === name ? { ...p, selected: !p.selected } : p,
    );
    onSelectionChange(updated.filter((p) => p.selected).map((p) => p.name));
  }

  function selectAll() {
    onSelectionChange(projects.map((p) => p.name));
  }

  function deselectAll() {
    onSelectionChange([]);
  }

  function onColorSelect(color: string) {
    if (colorPickerFor) {
      onColorChange(colorPickerFor, color);
      colorPickerFor = null;
    }
  }

  function closeDropdown() {
    open = false;
    colorPickerFor = null;
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && closeDropdown()} />

<div class="selector">
  <button class="trigger" onclick={() => (open = !open)} onblur={() => setTimeout(() => (open = false), 200)}>
    <span>Proyectos ({selectedCount})</span>
    <span class="arrow">{open ? "▲" : "▼"}</span>
  </button>

  {#if open}
    <div class="dropdown" role="listbox" aria-multiselectable="true">
      <div class="actions">
        <button class="action-btn" onclick={selectAll}>Todo</button>
        <button class="action-btn" onclick={deselectAll}>Ninguno</button>
      </div>

      {#each projects as project (project.name)}
        {@const isColorOpen = colorPickerFor === project.name}
        <div class="item" role="option" aria-selected={project.selected}>
          <label class="label">
            <input
              type="checkbox"
              checked={project.selected}
              onchange={() => toggleProject(project.name)}
            />
            <span
              class="color-dot"
              style="background: {project.color}"
              role="button"
              tabindex="0"
              onclick={(e) => {
                e.stopPropagation();
                colorPickerFor = isColorOpen ? null : project.name;
              }}
              onkeydown={(e) => e.key === 'Enter' && (colorPickerFor = isColorOpen ? null : project.name)}
              aria-label="Cambiar color de {project.name}"
            ></span>
            <span class="name">{project.name}</span>
          </label>

          {#if isColorOpen}
            <div class="color-picker-wrap" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
              <ColorPicker currentColor={project.color} onSelect={onColorSelect} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .selector {
    position: relative;
    display: inline-block;
    min-width: 220px;
  }

  .trigger {
    width: 100%;
    background: #1f2329;
    color: #e7e9ee;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .trigger:hover {
    background: #2b3138;
  }

  .arrow {
    font-size: 10px;
    margin-left: 8px;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #1a1d24;
    border: 1px solid #30363d;
    border-radius: 8px;
    z-index: 100;
    padding: 6px;
    max-height: 320px;
    overflow-y: auto;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .actions {
    display: flex;
    gap: 6px;
    padding: 4px 6px 8px;
    border-bottom: 1px solid #262b33;
    margin-bottom: 4px;
  }

  .action-btn {
    background: #17191d;
    color: #58a6ff;
    border: 1px solid #30363d;
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    cursor: pointer;
  }

  .action-btn:hover {
    background: #2b3138;
  }

  .item {
    padding: 4px 6px;
    border-radius: 4px;
  }

  .item:hover {
    background: #1f2329;
  }

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #e7e9ee;
  }

  .label input[type="checkbox"] {
    accent-color: #4caf50;
  }

  .color-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .color-dot:hover {
    transform: scale(1.2);
  }

  .name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .color-picker-wrap {
    padding: 6px 0 2px 24px;
  }
</style>
