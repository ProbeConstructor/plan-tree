<script lang="ts">
  import ColorPicker from "./ColorPicker.svelte";
  import { _ } from "svelte-i18n";

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

  function onTriggerMouseDown(e: MouseEvent) {
    e.preventDefault(); // Prevents focus shift → avoids onblur closing the dropdown
    open = !open;
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && closeDropdown()} onmousedown={(e) => {
  if (open && !(e.target as Element)?.closest('.selector')) closeDropdown();
}} />

<div class="selector">
  <button class="trigger" onmousedown={onTriggerMouseDown}>
    <span>{$_("projectSelector.projects", { values: { count: String(selectedCount) } })}</span>
    <span class="arrow">{open ? "▲" : "▼"}</span>
  </button>

  {#if open}
    <div class="dropdown" role="listbox" aria-multiselectable="true" onmousedown={(e) => e.stopPropagation()}>
      <div class="actions">
        <button class="action-btn" onclick={selectAll}>{$_("projectSelector.all")}</button>
        <button class="action-btn" onclick={deselectAll}>{$_("projectSelector.none")}</button>
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
              aria-label={$_("projectSelector.changeColor", { values: { name: project.name } })}
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
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .trigger:hover {
    background: var(--bg-hover);
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
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
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
    border-bottom: 1px solid var(--bg-muted);
    margin-bottom: 4px;
  }

  .action-btn {
    background: var(--bg-sidebar);
    color: #58a6ff;
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    cursor: pointer;
  }

  .action-btn:hover {
    background: var(--bg-hover);
  }

  .item {
    padding: 4px 6px;
    border-radius: 4px;
  }

  .item:hover {
    background: var(--bg-elevated);
  }

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
  }

  .label input[type="checkbox"] {
    accent-color: var(--accent-success);
  }

  .color-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
    border: 1px solid var(--border-strong);
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
