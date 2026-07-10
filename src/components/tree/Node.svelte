<script lang="ts">
  import NodeCard from "./NodeCard.svelte";
  import { focusedNodeId, progressMap } from "../../stores/treeStore";
  import type { TreeNode } from "../../types";
  import { extractNodeToNewProject } from "../../services/projectSplitter";
  import * as commands from "../../commands/treeCommands";
  import { pickAndResizeImage } from "../../lib/resizeImage";
  import { getNodeView } from "./nodeView";
  import { useDrag } from "./useDrag";
  import type { TreeViewNode } from "../../types";
  import { COLUMN_WIDTH } from "../../constants/layout";
  import { openModal } from "../../stores/modalStore";
  import NodeDetailModal from "../../modals/NodeDetailModal.svelte";
  import ConfirmModal from "../../modals/ConfirmModal.svelte";
  import { onMount, tick } from "svelte";
  import { onDestroy } from "svelte";

  export let node: TreeNode;
  export let layout: TreeViewNode;
  export let top = 0;
  export let registerMeasurement:
    | ((nodeId: string, depth: number, width: number, height: number) => void)
    | undefined = undefined;
  export let unregisterMeasurement:
    | ((nodeId: string) => void)
    | undefined = undefined;

  let nodeElement: HTMLDivElement;
  let resizeObserver: ResizeObserver;
  let dragOver = false;
  let editing = false;
  let tempTitle = "";
  let detailsOpen = false;

  $: view = getNodeView(node, $progressMap.get(node.id) ?? 0, $focusedNodeId);

  // Guard: only re-create drag handlers when the node actually changes identity.
  // Immutable tree updates create new references for ALL ancestors on every mutation.
  let lastNodeId: string | undefined;
  let drag: ReturnType<typeof useDrag>;
  $: if (lastNodeId !== node.id) {
    lastNodeId = node.id;
    drag = useDrag(node, {
      setDragOver: (v) => (dragOver = v),
    });
  }

  function toggleDetails() {
    detailsOpen = !detailsOpen;
  }

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      if (!nodeElement) return;
      registerMeasurement?.(
        node.id,
        layout.depth,
        nodeElement.offsetWidth,
        nodeElement.offsetHeight,
      );
    });
    resizeObserver.observe(nodeElement);
    registerMeasurement?.(
      node.id,
      layout.depth,
      nodeElement.offsetWidth,
      nodeElement.offsetHeight,
    );
  });

  onDestroy(() => {
    resizeObserver.disconnect();
    unregisterMeasurement?.(node.id);
  });

  function countDescendants(n: TreeNode): number {
    return n.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
  }

  function confirmDelete() {
    if (layout.isRoot) return;
    const descendants = countDescendants(node);
    const parts = [`¿Eliminar "${node.title}"`];
    if (descendants > 0) {
      parts.push(` y ${descendants} ${descendants === 1 ? "subnodo" : "subnodos"}`);
    }
    parts.push("? Esta acción no se puede deshacer.");
    openModal(ConfirmModal, {
      title: "Eliminar nodo",
      message: parts.join(""),
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: () => commands.removeNode(node.id),
    });
  }

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
    if (dataUri) commands.setIcon(node.id, dataUri);
  }

  function openDetailsModal() {
    openModal(NodeDetailModal, { nodeId: node.id });
  }

  function handleHeightChange(_height: number) {
    registerMeasurement?.(
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
    onStartEditing={() => { tempTitle = node.title; editing = true; }}
    onSaveTitle={() => { editing = false; if (tempTitle === node.title) return; commands.saveTitle(node.id, tempTitle); }}
    focusOnMount={(el: HTMLInputElement) => el.focus()}
    onToggleDetails={toggleDetails}
    onToggle={() => commands.toggleExpand(node.id)}
    onExtract={extractToProject}
    onAddChild={async () => {
      const newId = commands.addChild(node.id, layout.depth);
      await tick();
      document.getElementById(newId)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }}
    onDelete={confirmDelete}
    onFocus={() => commands.toggleFocus(node.id)}
    onFavorite={() => commands.toggleFavorite(node.id)}
    onStatus={(e: Event) => commands.setStatus(node.id, (e.target as HTMLSelectElement).value as "todo" | "doing" | "done")}
    onPriority={(e: Event) => commands.setPriority(node.id, (e.target as HTMLSelectElement).value as "low" | "medium" | "high")}
    onStartDate={(e: Event) => commands.setStartDate(node.id, (e.target as HTMLInputElement).value)}
    onDueDate={(e: Event) => commands.setDueDate(node.id, (e.target as HTMLInputElement).value || undefined)}
    onHeightChange={handleHeightChange}
    onPickImage={() => handlePickImage(node)}
    onRemoveIcon={() => commands.removeIcon(node.id)}
    onOpenDetailsModal={openDetailsModal}
  />
</div>

<style>
  .node:not(.root-node) {
    align-items: flex-start;
  }
</style>
