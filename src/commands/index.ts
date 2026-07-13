// SPDX-License-Identifier: GPL-3.0-only
/**
 * Command Palette — Command Registration
 *
 * Registers all commands available in Ctrl+K. The palette
 * (CommandPalette.svelte) reads these via getCommands() and displays
 * them with fuzzy search.
 *
 * Node search (Ctrl+F) is handled separately by NodeSearch.svelte.
 */

import { get } from "svelte/store";
import { registerCommand } from "../services/commandRegistry";
import { panelLayout } from "../stores/panelStore";
import { favoritesFilter } from "../stores/treeStore";
import { tagDefs } from "../stores/tagStore";
import { session } from "../services/sessionOrchestrator";
import { openModal } from "../stores/modalStore";
import { exportTree, importTree } from "../services/projectManager";
import { deleteProject } from "../services/workspaceManager";
import { importTreeCommand } from "./treeCommands";
import { getPanelInstance } from "../stores/panelRegistry";
import type { PanelId } from "../types";
import { _ } from "svelte-i18n";

import NewProjectModal from "../modals/NewProjectModal.svelte";
import RenameProjectModal from "../modals/RenameProjectModal.svelte";
import TagManagerModal from "../modals/TagManagerModal.svelte";
import ConfirmModal from "../modals/ConfirmModal.svelte";
import ShortcutHelpModal from "../components/ShortcutHelpModal.svelte";

// ── Helpers ─────────────────────────────────────────────────

/** Read the currently focused panel id (defaults to "left"). */
function focusedPanel(): PanelId {
  return (get(panelLayout).focused ?? "left") as PanelId;
}

/** Check if any project is loaded (left or right panel). */
function hasProject(): boolean {
  const layout = get(panelLayout);
  return layout.leftProject !== null || layout.rightProject !== null;
}

// ── Project ─────────────────────────────────────────────────

registerCommand({
  id: "newProject",
  label: "commandPalette.cmd.newProject",
  category: "project",
  icon: "📁",
  enabled: () => true,
  action: () => openModal(NewProjectModal),
});

registerCommand({
  id: "renameProject",
  label: "commandPalette.cmd.renameProject",
  category: "project",
  icon: "✏️",
  enabled: hasProject,
  action: () => openModal(RenameProjectModal),
});

registerCommand({
  id: "exportProject",
  label: "commandPalette.cmd.exportProject",
  category: "project",
  icon: "📤",
  enabled: hasProject,
  action: () => {
    const t = get(_);
    const inst = getPanelInstance(focusedPanel());
    openModal(ConfirmModal, {
      title: t("sidebar.exportTitle"),
      message: t("sidebar.exportWarning"),
      confirmLabel: t("sidebar.exportConfirm"),
      danger: true,
      onConfirm: () => {
        // setTimeout lets the palette modal close before the confirm modal opens
        setTimeout(() => exportTree(get(inst.tree)), 0);
      },
    });
  },
});

registerCommand({
  id: "importProject",
  label: "commandPalette.cmd.importProject",
  category: "project",
  icon: "📥",
  enabled: () => true,
  action: async () => {
    const imported = await importTree();
    if (!imported) return;
    importTreeCommand(imported);
  },
});

registerCommand({
  id: "deleteProject",
  label: "commandPalette.cmd.deleteProject",
  category: "project",
  icon: "🗑️",
  enabled: hasProject,
  action: () => {
    const t = get(_);
    const name =
      focusedPanel() === "left"
        ? get(panelLayout).leftProject
        : get(panelLayout).rightProject;
    openModal(ConfirmModal, {
      title: t("sidebar.project.deleteTitle"),
      message: t("sidebar.project.deleteConfirm", {
        values: { name: name ?? "" },
      }),
      danger: true,
      onConfirm: deleteProject,
    });
  },
});

// ── Node ────────────────────────────────────────────────────

registerCommand({
  id: "undo",
  label: "commandPalette.cmd.undo",
  category: "node",
  icon: "↩️",
  enabled: () => {
    const inst = getPanelInstance(focusedPanel());
    let val = false;
    const unsub = inst.canUndo.subscribe((v) => (val = v));
    unsub();
    return val;
  },
  action: () => {
    const inst = getPanelInstance(focusedPanel());
    // Dynamic import avoids circular dependency with treeStore
    import("../stores/treeInstance").then(({ undoInstance }) => {
      undoInstance(inst);
    });
  },
});

// ── Navigation ──────────────────────────────────────────────

registerCommand({
  id: "viewTree",
  label: "commandPalette.cmd.tree",
  category: "navigation",
  icon: "🌳",
  enabled: () => true,
  action: () => panelLayout.setFocusedView("tree"),
});

registerCommand({
  id: "viewDashboard",
  label: "commandPalette.cmd.dashboard",
  category: "navigation",
  icon: "📊",
  enabled: () => true,
  action: () => panelLayout.setFocusedView("dashboard"),
});

registerCommand({
  id: "viewCalendar",
  label: "commandPalette.cmd.calendar",
  category: "navigation",
  icon: "📅",
  enabled: () => true,
  action: () => panelLayout.setFocusedView("calendar"),
});

registerCommand({
  id: "viewProgress",
  label: "commandPalette.cmd.progress",
  category: "navigation",
  icon: "📈",
  enabled: () => true,
  action: () => panelLayout.setFocusedView("progress"),
});

// ── Utilities ───────────────────────────────────────────────

registerCommand({
  id: "lock",
  label: "commandPalette.cmd.lock",
  category: "utilities",
  icon: "🔒",
  enabled: () => true,
  action: () => session.logout(),
});

registerCommand({
  id: "favoritesOnly",
  label: "commandPalette.cmd.favorites",
  category: "utilities",
  icon: "⭐",
  enabled: () => true,
  action: () => favoritesFilter.update((v) => !v),
});

registerCommand({
  id: "manageTags",
  label: "commandPalette.cmd.manageTags",
  category: "utilities",
  icon: "🏷️",
  enabled: () => get(tagDefs).length > 0,
  action: () => openModal(TagManagerModal),
});

registerCommand({
  id: "openSplit",
  label: "commandPalette.cmd.openSplit",
  category: "utilities",
  icon: "◧",
  enabled: () => get(panelLayout).rightView === null,
  action: () => panelLayout.openSplit(),
});

registerCommand({
  id: "closeSplit",
  label: "commandPalette.cmd.closeSplit",
  category: "utilities",
  icon: "☐",
  enabled: () => get(panelLayout).rightView !== null,
  action: () => panelLayout.closeSplit(),
});

registerCommand({
  id: "showShortcuts",
  label: "commandPalette.cmd.showShortcuts",
  category: "utilities",
  icon: "⌨️",
  enabled: () => true,
  action: () => openModal(ShortcutHelpModal),
});
