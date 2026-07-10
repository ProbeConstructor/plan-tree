<script lang="ts">
  import type { TreeViewNode } from "../../types";
  import Connection from "./Connection.svelte";
  import { buildConnectionPoints } from "./connectionGeometry";
  import type { NodeMeasurement } from "../../stores/nodeMeasurementsStore";

  let {
    nodes,
    rowOffsets,
    measurements,
  }: {
    nodes: TreeViewNode[];
    rowOffsets: Map<number, number>;
    measurements: Map<string, NodeMeasurement>;
  } = $props();

  const connections = $derived.by(() => {
    const result = [];

    for (const parent of nodes) {
      for (const child of parent.node.children ?? []) {
        const childLayout = nodes.find(
          (n: TreeViewNode) => n.node.id === child.id,
        );

        if (!childLayout) continue;

        result.push(
          buildConnectionPoints(parent, childLayout, rowOffsets, measurements),
        );
      }
    }

    return result;
  });
</script>

<svg class="connections">
  {#each connections as connection}
    <Connection
      x1={connection.x1}
      y1={connection.y1}
      x2={connection.x2}
      y2={connection.y2}
    />
  {/each}
</svg>

<style>
  .connections {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 0;
  }
</style>
