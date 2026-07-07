<script lang="ts">
  import Node from "./Node.svelte";
  import { tree, favoritesFilter } from "../../stores/treeStore";
  import { buildVisibleTree } from "../../utils/buildVisibleTree";
  import { getFavoriteIds } from "../../utils/treeUtils";
  import { COLUMN_WIDTH, ROW_HEIGHT } from "../../constants/layout";
  import { nodeMeasurements } from "../../stores/nodeMeasurementsStore";
  import TreeConnections from "./TreeConnections.svelte";

  $: rowHeights = calculateRowHeights($nodeMeasurements);
  $: rowOffsets = calculateRowOffsets(rowHeights);
  $: favoriteIds = $favoritesFilter ? getFavoriteIds($tree) : undefined;
  $: viewNodes = buildVisibleTree($tree, rowOffsets, favoriteIds);
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
  <TreeConnections nodes={viewNodes} {rowOffsets} />
  {#each viewNodes as item (item.node.id)}
    <Node
      node={item.node}
      layout={item}
      top={rowOffsets.get(item.depth) ?? item.depth * ROW_HEIGHT}
    />
  {/each}
</div>

<style>
  .tree-canvas {
    position: relative;
  }
</style>
