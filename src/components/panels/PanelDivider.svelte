<script lang="ts">
  import { panelLayout } from "../../stores/panelStore";

  let dragging = $state(false);
  let container: HTMLDivElement;

  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
    dragging = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging) return;
      const rect = container.parentElement!.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      panelLayout.setSplitPosition(pct);
    };

    const onMouseUp = () => {
      dragging = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }
</script>

<div
  class="panel-divider"
  class:dragging
  bind:this={container}
  onmousedown={onMouseDown}
  role="separator"
  aria-orientation="vertical"
  aria-valuenow={$panelLayout.splitPosition}
  tabindex="-1"
>
  <div class="handle">
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
</div>

<style>
  .panel-divider {
    width: 8px;
    flex-shrink: 0;
    background: var(--border-default);
    cursor: col-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 2;
    transition: background 0.15s;
  }

  .panel-divider:hover,
  .panel-divider.dragging {
    background: var(--bg-hover);
  }

  .handle {
    display: flex;
    flex-direction: column;
    gap: 3px;
    pointer-events: none;
  }

  .dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .panel-divider:hover .dot,
  .panel-divider.dragging .dot {
    background: var(--text-secondary);
  }
</style>
