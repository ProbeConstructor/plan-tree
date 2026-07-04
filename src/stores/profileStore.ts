import { writable } from "svelte/store";

export const profiles = writable<string[]>([]);
export const activeProfile = writable<string | null>(null);
