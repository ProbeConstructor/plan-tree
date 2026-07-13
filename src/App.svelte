<!-- SPDX-License-Identifier: GPL-3.0-only -->

<script lang="ts">
  //import Node from "./components/tree/Node.svelte";
  //import { tree } from "./stores/treeStore";
  import LoginScreen from "./components/LoginScreen.svelte";
  import UserManager from "./components/UserManager.svelte";
  import LanguageSelector from "./components/LanguageSelector.svelte";
  import { isAuthenticated, session } from "./services/sessionOrchestrator";
  import { activeProfile } from "./stores/profileStore";
  import Sidebar from "./components/Sidebar.svelte";
  import PanelContainer from "./components/panels/PanelContainer.svelte";
  import ModalHost from "./components/ModalHost.svelte";
  import RecoveryBanner from "./components/RecoveryBanner.svelte";
  import { autoSave } from "./services/workspaceManager";

  import { onMount } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import ErrorBoundary from "./components/ErrorBoundary.svelte";
  import { checkForUpdates } from "./stores/updateStore";
  import NodeSearch from "./components/tree/NodeSearch.svelte";
  import CommandPalette from "./components/CommandPalette.svelte";
  import { openModal } from "./stores/modalStore";
  import { panelLayout } from "./stores/panelStore";
  import { loadLanguage } from "./stores/languageStore";
  import { profileData } from "./services/profileDataStore";
  import { _ } from "svelte-i18n";

  // Initialize svelte-i18n (side-effect import)
  import "./i18n/index.js";

  let appReady = false;
  let languageSelected = false;
  let workspaceInitialized = false;
  let showUserManager = false;

  onMount(() => {
    // bootstrap is async but onMount must not return a promise with cleanup
    const setup = async () => {
      try {
        await session.bootstrapProfile();
      } catch (err) {
        console.error("Error en bootstrap:", err);
      }

      // Load saved language (defaults to "es" for existing users)
      await loadLanguage();

      // Check if any profiles exist — if not, show language selector first
      const hasProfiles = await profileData.hasProfiles();
      languageSelected = hasProfiles;

      appReady = true;

      try {
        const unlisten = await listen<{ args: string[]; cwd: string }>(
          "single-instance",
          () => {
            getCurrentWindow().show();
            getCurrentWindow().setFocus();
          },
        );

        getCurrentWindow().onCloseRequested(async (event) => {
          event.preventDefault();
          await autoSave.flush();
          await getCurrentWindow().destroy();
        });

        // store unlisten for cleanup
        cleanups.push(unlisten);
      } catch {
        // browser dev — Tauri API no disponible
      }

      // 🔄 Check for updates (non-blocking)
      checkForUpdatesHandler();
    };

    async function checkForUpdatesHandler() {
      await checkForUpdates();
    }

    const cleanups: (() => void)[] = [];
    setup();

    return () => {
      for (const fn of cleanups) fn();
    };
  });

  $: if (!$isAuthenticated) {
    workspaceInitialized = false;
  }

  $: if ($isAuthenticated && !workspaceInitialized) {
    workspaceInitialized = true;
    session.initializeApp();
  }
</script>

<svelte:window
  on:keydown={(e) => {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      openModal(NodeSearch, {});
    }
    if (e.ctrlKey && e.key === "k") {
      // Don't open if focus is inside an editor (easymde conflict)
      const tag = document.activeElement?.tagName;
      if (tag !== "TEXTAREA" && tag !== "INPUT") {
        e.preventDefault();
        openModal(CommandPalette, {});
      }
    }
  }}
/>

<ErrorBoundary>
  {#snippet children()}
    {#if !appReady}
      <p class="loading">Cargando...</p>
    {:else if !languageSelected}
      <LanguageSelector on:select={() => (languageSelected = true)} />
    {:else if !$isAuthenticated}
      {#if showUserManager}
        <UserManager onBack={() => (showUserManager = false)} />
      {:else}
        <LoginScreen onManageUsers={() => (showUserManager = true)} />
      {/if}
    {:else}
      <main class="layout">
        <Sidebar />
        <section class="content">
          <div class="topbar">
            <span class="topbar-user">👤 {$activeProfile} · {$panelLayout.leftProject ?? 'Sin proyecto'}</span>
            <div class="topbar-tabs">
              {#if $panelLayout.rightView !== null}
                <div class="right-tab">
                  <span class="right-tab-label">
                    {#if $panelLayout.rightProject}
                      {$panelLayout.rightProject} ·
                    {/if}
                    {$panelLayout.rightView === "tree" ? $_("sidebar.view.tree") : $panelLayout.rightView === "dashboard" ? $_("sidebar.view.dashboard") : $panelLayout.rightView === "calendar" ? $_("sidebar.view.calendar") : $_("sidebar.view.progress")}
                  </span>
                  <button
                    class="right-tab-close"
                    on:click={() => panelLayout.closeSplit()}
                    title={$_("app.closePanel")}
                  >✕</button>
                </div>
              {/if}
            </div>
          </div>

          <RecoveryBanner />
          <PanelContainer />
        </section>

        <ModalHost />
      </main>
    {/if}
  {/snippet}
</ErrorBoundary>

<style>
  :global(body) {
    margin: 0;
    background: #0f1115;
    color: #e7e9ee;
    font-family:
      system-ui,
      -apple-system,
      "Segoe UI",
      sans-serif;
    overflow-x: auto;
  }
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 24px;
  }

  .loading {
    text-align: center;
    margin-top: 80px;
    color: #6b7280;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 12px 0;
    font-size: 13px;
    color: #9aa1ab;
    flex-shrink: 0;
  }

  .topbar-tabs {
    display: flex;
    align-items: flex-end;
    align-self: stretch;
  }

  .right-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    background: #1a1d24;
    border: 1px solid #2a2f37;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    font-size: 12px;
    color: #e7e9ee;
    margin-bottom: -12px;
    align-self: flex-end;
  }

  .right-tab-close {
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 12px;
    padding: 1px 4px;
    border-radius: 4px;
    line-height: 1;
  }

  .right-tab-close:hover {
    background: #2a2f37;
    color: white;
  }
</style>
