// SPDX-License-Identifier: GPL-3.0-only

import { writable, get } from "svelte/store";

type Theme = "light" | "dark";

const STORAGE_KEY = "plan-tree-theme";

function getSystemPreference(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable — SSR or privacy restriction */
  }
  return null;
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function createThemeStore() {
  const initial = getStoredTheme() ?? getSystemPreference();
  const { subscribe, set, update } = writable<Theme>(initial);

  applyTheme(initial);

  // Listen to OS changes only when the user hasn't explicitly chosen
  if (typeof window !== "undefined") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (getStoredTheme() === null) {
          const next = e.matches ? "dark" : "light";
          applyTheme(next);
          set(next);
        }
      });
  }

  return {
    subscribe,
    toggle() {
      const next = get(currentTheme) === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      set(next);
    },
    setTheme(theme: Theme) {
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
      set(theme);
    },
    resetToSystem() {
      localStorage.removeItem(STORAGE_KEY);
      const next = getSystemPreference();
      applyTheme(next);
      set(next);
    },
  };
}

export const currentTheme = createThemeStore();

/** Call once during app bootstrap (App.svelte onMount). */
export function initTheme(): void {
  applyTheme(get(currentTheme));
}
