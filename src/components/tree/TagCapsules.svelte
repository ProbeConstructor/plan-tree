<script lang="ts">
  import type { TagDefinition } from "../../types";

  let {
    tags,
    tagDefs,
  }: {
    tags?: string[];
    tagDefs: TagDefinition[];
  } = $props();

  const MAX_VISIBLE = 3;

  let visibleTags = $derived(
    (tags ?? [])
      .map(id => tagDefs.find(d => d.id === id))
      .filter(Boolean) as TagDefinition[]
  );

  let overflow = $derived(Math.max(0, visibleTags.length - MAX_VISIBLE));
</script>

{#if visibleTags.length > 0}
  <div class="tag-capsules">
    {#each visibleTags.slice(0, MAX_VISIBLE) as tag (tag.id)}
      <span class="capsule" style="--tag-color: {tag.color}">
        <span class="dot" style="background: {tag.color}"></span>
        {tag.name}
      </span>
    {/each}
    {#if overflow > 0}
      <span class="overflow-badge">+{overflow}</span>
    {/if}
  </div>
{/if}

<style>
  .tag-capsules {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
  }

  .capsule {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    color: #d6dae2;
    background: color-mix(in srgb, var(--tag-color) 15%, #1a1d24);
    border: 1px solid color-mix(in srgb, var(--tag-color) 30%, #262b33);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .overflow-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 10px;
    color: #9ca3af;
    background: #262b33;
  }
</style>
