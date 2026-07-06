import { writable } from "svelte/store";

export interface UpdateInfo {
  version: string;
  downloadAndInstall: () => Promise<void>;
}

export const pendingUpdate = writable<UpdateInfo | null>(null);
export const checkingUpdate = writable(false);
