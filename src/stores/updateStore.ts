import { writable } from "svelte/store";

export interface UpdateInfo {
  version: string;
  downloadAndInstall: () => Promise<void>;
}

export const pendingUpdate = writable<UpdateInfo | null>(null);
export const checkingUpdate = writable(false);
export const upToDate = writable(false);
export const updateError = writable("");

function isDevMode(): boolean {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export async function checkForUpdates() {
  if (isDevMode()) {
    // Updater no funciona en dev mode (no hay bundle real)
    return;
  }

  try {
    checkingUpdate.set(true);
    upToDate.set(false);
    updateError.set("");
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
  } catch (e) {
    console.error("Update check failed:", e);
    let msg: string;
    if (e instanceof Error) {
      msg = e.message;
    } else if (typeof e === "string") {
      msg = e;
    } else {
      msg = JSON.stringify(e);
    }
    updateError.set(msg || "Error al buscar actualizaciones");
  } finally {
    checkingUpdate.set(false);
  }
}
