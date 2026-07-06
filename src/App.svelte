<!-- SPDX-License-Identifier: GPL-3.0-only -->

<script lang="ts">
  //import Node from "./components/tree/Node.svelte";
  //import { tree } from "./stores/treeStore";
  import LoginScreen from "./components/LoginScreen.svelte";
  import UserManager from "./components/UserManager.svelte";
  import { isAuthenticated, session } from "./services/sessionOrchestrator";
  import { activeProfile } from "./stores/profileStore";
  import { clearActiveProfile } from "./services/profileManager";
  import Sidebar from "./components/Sidebar.svelte";
  import Dashboard from "./pages/Dashboard.svelte";
  import Calendar from "./pages/Calendar.svelte";
  import Progress from "./pages/Progress.svelte";
  import { currentView } from "./stores/viewStore";
  import ModalHost from "./components/ModalHost.svelte";
  import RecoveryBanner from "./components/RecoveryBanner.svelte";
  import TreeCanvas from "./components/tree/TreeCanvas.svelte";
  import { autoSave } from "./services/workspaceManager";

  import { onMount } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import ErrorBoundary from "./components/ErrorBoundary.svelte";
  import { check } from "@tauri-apps/plugin-updater";
  import { pendingUpdate, checkingUpdate } from "./stores/updateStore";
  import NodeSearch from "./components/tree/NodeSearch.svelte";
  import { openModal } from "./stores/modalStore";

  let appReady = false;
  let workspaceInitialized = false;
  let showUserManager = false;

  onMount(() => {
    // bootstrap is async but onMount must not return a promise with cleanup
    const setup = async () => {
      try {
        await session.bootstrapProfile();
      } catch (err) {
        console.error("Error en bootstrap:", err);
        // si el bootstrap falla, igual mostramos la UI para que el
        // usuario pueda loguearse o reintentar. No quedarse colgado
        // en "Cargando..." eternamente.
      }
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
      checkForUpdates();
    };

    async function checkForUpdates() {
      try {
        checkingUpdate.set(true);
        const update = await check();
        if (update) {
          pendingUpdate.set({
            version: update.version,
            downloadAndInstall: () => update.downloadAndInstall(),
          });
        }
      } catch {
        // Silencio — fallo en check de updates no bloquea la app
      } finally {
        checkingUpdate.set(false);
      }
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

  async function switchUser() {
    await session.logout();
    clearActiveProfile();
  }

  let content: HTMLElement;
  let scrolling = false;

  function keyboardScroll(delta: number) {
    if (scrolling) return;
    scrolling = true;
    requestAnimationFrame(() => {
      content.scrollTop += delta;
      scrolling = false;
    });
  }
</script>

<svelte:window
  on:keydown={(e) => {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      openModal(NodeSearch, {});
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyboardScroll(80);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      keyboardScroll(-80);
    }
  }}
/>

<ErrorBoundary>
  {#snippet children()}
    {#if !appReady}
      <p class="loading">Cargando...</p>
    {:else if !$isAuthenticated}
      {#if showUserManager}
        <UserManager onBack={() => (showUserManager = false)} />
      {:else}
        <LoginScreen onManageUsers={() => (showUserManager = true)} />
      {/if}
    {:else}
      <main class="layout">
        <Sidebar />
        <section class="content" bind:this={content}>
          <div class="user-bar">
            <span class="current-user">👤 {$activeProfile}</span>
            <button class="switch-user-btn" on:click={switchUser}
              >Cambiar de usuario</button
            >
          </div>

          <RecoveryBanner />
          {#if $currentView === "tree"}
            <div id="tree-anchor"></div>
            <div class="tree-viewport">
              <div class="tree-canvas">
                <TreeCanvas />
              </div>
            </div>
          {:else if $currentView === "calendar"}
            <Calendar />
          {:else if $currentView === "progress"}
            <Progress />
          {:else}
            <Dashboard />
          {/if}
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
  .tree-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
  }
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .content {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }

  .loading {
    text-align: center;
    margin-top: 80px;
    color: #6b7280;
  }

  .user-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    font-size: 13px;
    color: #9aa1ab;
  }
  .switch-user-btn {
    background: none;
    border: none;
    color: #6b7280;
    text-decoration: underline;
    cursor: pointer;
    font-size: 12px;
  }
</style>
