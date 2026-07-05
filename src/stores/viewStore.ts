import { writable } from "svelte/store";

export type View = "tree" | "dashboard" | "calendar";

export const currentView = writable<View>("tree");
