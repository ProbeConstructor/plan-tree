import { writable } from "svelte/store";

export type View = "tree" | "dashboard" | "calendar" | "progress";

export const currentView = writable<View>("tree");
