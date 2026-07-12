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
  // In production Tauri builds, __TAURI_INTERNALS__ is injected by the runtime.
  // In Vite dev server (npm run dev), it does not exist.
  // Previous check used hostname === "localhost" which broke on Linux because
  // WebKitGTK serves production builds from tauri://localhost (hostname = "localhost").
  return !(window as any).__TAURI_INTERNALS__;
}

export async function checkForUpdates() {
  // Reset previous state before checking
  upToDate.set(false);
  updateError.set("");
  pendingUpdate.set(null);

  if (isDevMode()) {
    // Simulate a quick check in dev mode so the UI still works
    checkingUpdate.set(true);
    await new Promise(r => setTimeout(r, 800));
    checkingUpdate.set(false);
    upToDate.set(true);
    return;
  }

  try {
    checkingUpdate.set(true);
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update) {
      pendingUpdate.set({
        version: update.version,
        downloadAndInstall: () => update.downloadAndInstall(),
      });
    } else {
      upToDate.set(true);
      // Auto-reset after 5s so user can re-check
      setTimeout(() => upToDate.set(false), 5000);
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
