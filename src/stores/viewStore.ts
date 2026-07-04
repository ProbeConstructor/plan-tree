import { writable } from "svelte/store";

export type View = "tree" | "dashboard";

export const currentView = writable<View>("tree");
