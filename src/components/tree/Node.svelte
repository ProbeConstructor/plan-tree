<script lang="ts">
  import NodeCard from "./NodeCard.svelte";
  import { focusedNodeId, progressMap } from "../../stores/treeStore";
  import type { TreeNode } from "../../types";
  import { extractNodeToNewProject } from "../../services/projectSplitter";
  import * as actions from "./useNodeActions";
  import { pickAndResizeImage } from "../../lib/resizeImage";
  import { getNodeView } from "./nodeView";
  import { useDrag } from "./useDrag";
  import { useNodeEditing } from "./useNodeEditing";
  import { useNodeExpansion } from "./useNodeExpansion";
  import { useNodeDetails } from "./useNodeDetails";
  import type { TreeViewNode } from "../../types";
  import { COLUMN_WIDTH } from "../../constants/layout";
  import { openModal } from "../../stores/modalStore";
  import NodeDetailModal from "../../modals/NodeDetailModal.svelte";
  import ConfirmModal from "../../modals/ConfirmModal.svelte";
  import {
    registerNodeMeasurement,
    unregisterNodeMeasurement,
  } from "../../stores/nodeMeasurementsStore";
  import { onMount, tick } from "svelte";
  import { onDestroy } from "svelte";

  export let node: TreeNode;
  export let layout: TreeViewNode;
  export let top = 0;

  let nodeElement: HTMLDivElement;
  let resizeObserver: ResizeObserver;
  let dragOver = false;
  let editing = false;
  let tempTitle = "";
  let detailsOpen = false;

  $: view = getNodeView(node, $progressMap.get(node.id) ?? 0, $focusedNodeId);
  $: editingApi = useNodeEditing(node, {
    getEditing: () => editing,
    setEditing: (v) => (editing = v),
    getTempTitle: () => tempTitle,
    setTempTitle: (v) => (tempTitle = v),
  });
  $: details = useNodeDetails({
    getDetailsOpen: () => detailsOpen,
    setDetailsOpen: (v) => (detailsOpen = v),
  });
  $: drag = useDrag(node, {
    setDragOver: (v) => (dragOver = v),
  });
  $: expansion = useNodeExpansion(node);

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      if (!nodeElement) return;
      registerNodeMeasurement(
        node.id,
        layout.depth,
        nodeElement.offsetWidth,
        nodeElement.offsetHeight,
      );
    });
    resizeObserver.observe(nodeElement);
    registerNodeMeasurement(
      node.id,
      layout.depth,
      nodeElement.offsetWidth,
      nodeElement.offsetHeight,
    );
  });

  onDestroy(() => {
    resizeObserver.disconnect();
    unregisterNodeMeasurement(node.id);
  });

  function extractToProject() {
    if (layout.isRoot) return;
    openModal(ConfirmModal, {
      title: "Extraer a nuevo proyecto",
      message: `Esto moverá "${node.title}" y todo su contenido a un proyecto nuevo. Esta acción no se puede deshacer. ¿Querés continuar?`,
      confirmLabel: "Extraer",
      danger: false,
      onConfirm: () => extractNodeToNewProject(node.id),
    });
  }

  async function handlePickImage(node: TreeNode) {
    const dataUri = await pickAndResizeImage();
    if (dataUri) actions.setIcon(node, dataUri);
  }

  function openDetailsModal() {
    openModal(NodeDetailModal, { nodeId: node.id });
  }

  function handleHeightChange(height: number) {
    registerNodeMeasurement(
      node.id,
      layout.depth,
      nodeElement.offsetWidth,
      nodeElement.offsetHeight,
    );
  }
</script>

<div
  class="node"
  id={node.id}
  class:root-node={layout.isRoot}
  role="treeitem"
  tabindex="0"
  aria-expanded={node.expanded}
  aria-selected={$focusedNodeId === node.id}
  draggable={!layout.isRoot}
  ondragstart={drag.handleDragStart}
  ondragover={drag.handleDragOver}
  ondragleave={drag.handleDragLeave}
  ondrop={drag.handleDrop}
  ondragend={drag.handleDragEnd}
  style:position="absolute"
  style:left={`${layout.x * COLUMN_WIDTH}px`}
  style:top={`${top}px`}
  bind:this={nodeElement}
>
  <NodeCard
    {node}
    depth={layout.depth}
    path={layout.path}
    progress={view.progress}
    progressColor={view.progressColor}
    accent={view.accent}
    hasChildren={view.hasChildren}
    dimmed={view.dimmed}
    bind:editing
    bind:tempTitle
    bind:detailsOpen
    {dragOver}
    isRoot={layout.isRoot}
    onStartEditing={editingApi.startEditing}
    onSaveTitle={editingApi.saveTitle}
    focusOnMount={editingApi.focusOnMount}
    onToggleDetails={details.toggleDetails}
    onToggle={expansion.toggle}
    onExtract={extractToProject}
    onAddChild={async () => {
      const newId = actions.addChild(node, layout.depth);
      await tick();
      document.getElementById(newId)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }}
    onDelete={() => actions.removeNode(node)}
    onFocus={() => actions.toggleFocus(node)}
    onFavorite={() => actions.toggleFavorite(node)}
    onStatus={(e: Event) => actions.setStatus(node, e)}
    onPriority={(e: Event) => actions.setPriority(node, e)}
    onStartDate={(e: Event) => actions.setStartDate(node, e)}
    onDueDate={(e: Event) => actions.setDueDate(node, e)}
    onHeightChange={handleHeightChange}
    onPickImage={() => handlePickImage(node)}
    onRemoveIcon={() => actions.removeIcon(node)}
    onOpenDetailsModal={openDetailsModal}
  />
</div>

<style>
  .node:not(.root-node) {
    align-items: flex-start;
  }
</style>
