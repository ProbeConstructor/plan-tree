<script lang="ts">
  import Node from "./Node.svelte";
  import { tree, favoritesFilter } from "../../stores/treeStore";
  import { buildVisibleTree } from "../../utils/buildVisibleTree";
  import { getFavoriteIds } from "../../utils/treeUtils";
  import { COLUMN_WIDTH, ROW_HEIGHT } from "../../constants/layout";
  import TreeConnections from "./TreeConnections.svelte";
  import { tagFilter } from "../../stores/tagStore";
  import { writable } from "svelte/store";
  import type { NodeMeasurement } from "../../stores/nodeMeasurementsStore";

  const nodeMeasurements = writable(new Map<string, NodeMeasurement>());

  function registerMeasurement(
    nodeId: string,
    depth: number,
    width: number,
    height: number,
  ) {
    nodeMeasurements.update((map) => {
      const current = map.get(nodeId);
      if (
        current &&
        current.depth === depth &&
        current.width === width &&
        current.height === height
      ) {
        return map;
      }
      const next = new Map(map);
      next.set(nodeId, { depth, width, height });
      return next;
    });
  }

  function unregisterMeasurement(nodeId: string) {
    nodeMeasurements.update((map) => {
      if (!map.has(nodeId)) return map;
      const next = new Map(map);
      next.delete(nodeId);
      return next;
    });
  }

  $: rowHeights = calculateRowHeights($nodeMeasurements);
  $: rowOffsets = calculateRowOffsets(rowHeights);
  $: favoriteIds = $favoritesFilter ? getFavoriteIds($tree) : undefined;
  $: tagFilterIds = $tagFilter.size > 0 ? $tagFilter : undefined;
  $: viewNodes = buildVisibleTree($tree, rowOffsets, favoriteIds, tagFilterIds);
  $: maxX = Math.max(...viewNodes.map((n) => n.x), 0);
  $: canvasHeight =
    Math.max(...rowOffsets.values(), 0) +
    Math.max(...rowHeights.values(), 61) +
    40;

  function calculateRowHeights(
    heights: Map<string, { depth: number; height: number }>,
  ) {
    const rows = new Map<number, number>();
    for (const { depth, height } of heights.values()) {
      const current = rows.get(depth);
      if (current === undefined) {
        rows.set(depth, height);
      } else {
        rows.set(depth, Math.max(current, height));
      }
    }
    return rows;
  }

  function calculateRowOffsets(rowHeights: Map<number, number>) {
    const offsets = new Map<number, number>();
    const maxDepth = Math.max(...rowHeights.keys(), 0);
    let offset = 0;
    for (let depth = 0; depth <= maxDepth; depth++) {
      offsets.set(depth, offset);
      offset += (rowHeights.get(depth) ?? 61) + 20;
    }
    return offsets;
  }
</script>

<div
  class="tree-canvas"
  style:width={`${(maxX + 2) * COLUMN_WIDTH}px`}
  style:height={`${canvasHeight}px`}
>
  <TreeConnections nodes={viewNodes} {rowOffsets} measurements={$nodeMeasurements} />
  {#each viewNodes as item (item.node.id)}
    <Node
      node={item.node}
      layout={item}
      top={rowOffsets.get(item.depth) ?? item.depth * ROW_HEIGHT}
      {registerMeasurement}
      {unregisterMeasurement}
    />
  {/each}
</div>

<style>
  .tree-canvas {
    position: relative;
  }
</style>
