import { writable, derived, get } from "svelte/store";
import { profileData } from "../services/profileDataStore";
import { activeProfile } from "./profileStore";

export type View = "tree" | "dashboard" | "calendar" | "progress";

export interface PanelLayout {
  leftView: View;
  rightView: View | null; // null = closed
  focused: "left" | "right";
  splitPosition: number; // 25–75
}

function createPanelStore() {
  const { subscribe, set, update } = writable<PanelLayout>({
    leftView: "tree",
    rightView: null,
    focused: "left",
    splitPosition: 50,
  });

  // ── Self-persisting panel layout ──────────────────────────
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  subscribe((value) => {
    const profile = get(activeProfile);
    if (!profile) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      profileData.savePanelLayout(profile, value.rightView, value.splitPosition);
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

    openSplit() {
      update((p) => ({
        ...p,
        rightView: p.leftView,
      }));
    },

    closeSplit() {
      update((p) => ({
        ...p,
        rightView: null,
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

    /** Restore panel layout from disk for a given profile. Resets to defaults if none saved. */
    async loadFromProfile(profile: string): Promise<void> {
      const saved = await profileData.getPanelLayout(profile);
      if (saved) {
        set({
          leftView: "tree" as View,
          rightView: saved.rightView as View | null,
          focused: "left" as const,
          splitPosition: saved.splitPosition ?? 50,
        });
      } else {
        set({ leftView: "tree" as View, rightView: null, focused: "left" as const, splitPosition: 50 });
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
