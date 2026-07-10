import { writable } from "svelte/store";

export interface UpdateInfo {
  version: string;
  downloadAndInstall: () => Promise<void>;
}

export const pendingUpdate = writable<UpdateInfo | null>(null);
export const checkingUpdate = writable(false);
export const upToDate = writable(false);

export async function checkForUpdates() {
  try {
    checkingUpdate.set(true);
    upToDate.set(false);
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update) {
      pendingUpdate.set({
        version: update.version,
        downloadAndInstall: () => update.downloadAndInstall(),
      });
    } else {
      upToDate.set(true);
    }
  } catch {
    // Silencio — fallo en check de updates no bloquea la app
  } finally {
    checkingUpdate.set(false);
  }
}
