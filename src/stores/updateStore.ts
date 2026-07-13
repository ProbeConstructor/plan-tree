import { writable } from "svelte/store";

const LOG = "[updater]";

export interface UpdateInfo {
  version: string;
  downloadAndInstall: () => Promise<void>;
}

export const pendingUpdate = writable<UpdateInfo | null>(null);
export const checkingUpdate = writable(false);
export const upToDate = writable(false);
export const updateError = writable("");

function isDevMode(): boolean {
  const internals = (window as any).__TAURI_INTERNALS__;
  if (!internals) {
    console.log(LOG, "isDevMode=true — __TAURI_INTERNALS__ not found");
    return true;
  }
  // In Vite dev server the page is served from http://localhost:*
  // In production Tauri builds the protocol is tauri:// on all platforms.
  const isHttp = window.location.protocol === "http:";
  if (isHttp) {
    console.log(LOG, "isDevMode=true — protocol is http:", window.location.href);
  } else {
    console.log(LOG, "isDevMode=false — protocol:", window.location.protocol, "href:", window.location.href);
  }
  return isHttp;
}

export async function checkForUpdates() {
  console.log(LOG, "checkForUpdates called — starting...");

  // Reset previous state before checking
  upToDate.set(false);
  updateError.set("");
  pendingUpdate.set(null);

  if (isDevMode()) {
    console.log(LOG, "dev mode detected, simulating check");
    // Simulate a quick check in dev mode so the UI still works
    checkingUpdate.set(true);
    await new Promise(r => setTimeout(r, 800));
    checkingUpdate.set(false);
    upToDate.set(true);
    console.log(LOG, "dev mode: set upToDate=true (simulated)");
    return;
  }

  try {
    checkingUpdate.set(true);
    console.log(LOG, "importing @tauri-apps/plugin-updater...");
    const { check } = await import("@tauri-apps/plugin-updater");
    console.log(LOG, "calling check()...");
    const update = await check();
    console.log(LOG, "check() returned:", update ? `Update v${update.version}` : "null (no update)");
    if (update) {
      console.log(LOG, "update found, setting pendingUpdate");
      pendingUpdate.set({
        version: update.version,
        downloadAndInstall: () => update.downloadAndInstall(),
      });
    } else {
      upToDate.set(true);
      console.log(LOG, "no update, set upToDate=true");
      // Auto-reset after 5s so user can re-check
      setTimeout(() => upToDate.set(false), 5000);
    }
  } catch (e) {
    console.error(LOG, "Update check failed:", e);
    let msg: string;
    if (e instanceof Error) {
      msg = e.message;
      console.error(LOG, "Error stack:", e.stack);
    } else if (typeof e === "string") {
      msg = e;
    } else {
      msg = JSON.stringify(e);
    }
    updateError.set(msg || "Error al buscar actualizaciones");
  } finally {
    checkingUpdate.set(false);
    console.log(LOG, "check complete — checkingUpdate=false");
  }
}
