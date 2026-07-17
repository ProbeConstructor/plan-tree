import { writable, derived, get } from "svelte/store";
import type { PanelId } from "../types";
import { profileData } from "../services/profileDataStore";
import { activeProfile } from "./profileStore";

export type View = "tree" | "dashboard" | "calendar" | "progress" | (string & {});

export interface PanelLayout {
  leftView: View;
  rightView: View | null; // null = closed
  focused: "left" | "right";
  splitPosition: number; // 25–75

  // Panel-scoped project bindings
  leftProject: string | null;
  rightProject: string | null;
}

function createPanelStore() {
  const { subscribe, set, update } = writable<PanelLayout>({
    leftView: "tree",
    rightView: null,
    focused: "left",
    splitPosition: 50,
    leftProject: null,
    rightProject: null,
  });

  // ── Self-persisting panel layout ──────────────────────────
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  subscribe((value) => {
    const profile = get(activeProfile);
    if (!profile) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      profileData.savePanelLayout(
        profile,
        value.rightView,
        value.splitPosition,
        value.leftProject,
        value.rightProject,
      );
    }, 500);
  });

  return {
    subscribe,
    set,
    update,

    setFocusedView(view: View) {
      update((p) => {
        if (p.rightView === null || p.focused === "left") {
          return { ...p, leftView: view };
        }
        return { ...p, rightView: view };
      });
    },

    /** Set the project for a specific panel. */
    setPanelProject(panelId: PanelId, projectName: string | null) {
      update((p) => {
        if (panelId === "left") return { ...p, leftProject: projectName };
        return { ...p, rightProject: projectName };
      });
    },

    openSplit() {
      update((p) => ({
        ...p,
        rightView: p.leftView,
        // Right panel starts with no project — user selects it
        rightProject: null,
      }));
    },

    closeSplit() {
      update((p) => ({
        ...p,
        rightView: null,
        rightProject: null,
        focused: "left",
      }));
    },

    focusPanel(panel: "left" | "right") {
      update((p) => ({ ...p, focused: panel }));
    },

    setSplitPosition(pos: number) {
      update((p) => ({
        ...p,
        splitPosition: Math.max(25, Math.min(75, pos)),
      }));
    },

    /** Restore panel layout from disk for a given profile. */
    async loadFromProfile(profile: string): Promise<void> {
      const saved = await profileData.getPanelLayout(profile);
      if (saved) {
        set({
          leftView: "tree" as View,
          rightView: saved.rightView as View | null,
          focused: "left" as const,
          splitPosition: saved.splitPosition ?? 50,
          leftProject: saved.leftProject ?? null,
          rightProject: saved.rightProject ?? null,
        });
      } else {
        set({
          leftView: "tree" as View,
          rightView: null,
          focused: "left" as const,
          splitPosition: 50,
          leftProject: null,
          rightProject: null,
        });
      }
    },
  };
}

export const panelLayout = createPanelStore();

export const visibleViews = derived(panelLayout, ($p) => {
  const views = new Set<View>([$p.leftView]);
  if ($p.rightView) views.add($p.rightView);
  return views;
});

export const isTreeVisible = derived(visibleViews, ($v) => $v.has("tree"));
