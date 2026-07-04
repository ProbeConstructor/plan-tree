import { writable } from "svelte/store";
import {
  vaultExists,
  createVault,
  tryUnlockVault,
} from "./vaultMeta";
import { lockVault } from "./vaultManager";
import { resetTree } from "../stores/treeStore";
import { resetWorkspace } from "../stores/workspaceStore";
import { restoreLastProfile } from "./profileManager";
import { refreshProjects, loadCurrentProject } from "./workspaceManager";
import { resetPasswordWithRecovery } from "./recoveryManager";

export const isAuthenticated = writable(false);
export const vaultIsNew = writable(false);

class SessionOrchestrator {
  async login(password: string): Promise<boolean> {
    const has = await vaultExists();

    if (!has) {
      await createVault(password);
      isAuthenticated.set(true);
      return true;
    }

    const ok = await tryUnlockVault(password);
    if (ok) {
      isAuthenticated.set(true);
    }
    return ok;
  }

  async logout(): Promise<void> {
    await lockVault();
    resetTree();
    resetWorkspace();
    isAuthenticated.set(false);
  }

  async recover(
    recoveryKey: string,
    newPassword: string,
  ): Promise<string> {
    const newKey = await resetPasswordWithRecovery(recoveryKey, newPassword);
    isAuthenticated.set(true);
    return newKey;
  }

  async bootstrapProfile(): Promise<void> {
    await restoreLastProfile();
  }

  async initializeApp(): Promise<void> {
    await refreshProjects();
    await loadCurrentProject();
  }
}

export const session = new SessionOrchestrator();
