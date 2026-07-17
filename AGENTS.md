# Plan Tree

Tauri v2 desktop app (Svelte 5 + TypeScript + Vite) — encrypted tree-task organizer.

## Quick start

```sh
npm install
npm exec tauri dev          # requires WEBKIT_DISABLE_DMABUF_RENDERER=1 on Linux
npm run check               # typecheck: svelte-check && tsc -p tsconfig.node.json
npm run build               # frontend build only; tauri build wraps it
```

## Architecture

- **Single-window Tauri v2** app with Svelte 5 in `<div id="app">`.
- Frontend entry: `src/main.ts` — calls `mount(App, ...)` (Svelte 5 API).
- Backend entry: `src-tauri/src/lib.rs` — commands in `vault.rs`.
- CSP with `'unsafe-inline'` for Svelte styles in Tauri config (`tauri.conf.json`).

### Encryption (vault)

| Layer | Technology | Location |
|-------|-----------|----------|
| Key derivation | Argon2id | `src-tauri/src/vault.rs:69` (`unlock`) |
| Cipher | AES-256-GCM | `src-tauri/src/vault.rs:22` (`wrap_with_key`) |
| Key in memory only | `VaultState(Mutex<Option<[u8; 32]>>)` | never serialized, never sent to JS |

- Password + salt → 256-bit key lives **only in Rust memory** while unlocked.
- `vault.meta` per profile stores: salt, encrypted check string, optional `wrappedRecovery`.
- `tryUnlockVault` decrypts the check string to verify password (AES-GCM auth tag).
- All `.plan` files are encrypted JSON; cannot read them directly.

### Profiles

- `profiles.json` at `BaseDirectory.AppData` root — list of profiles, last active, last project per profile.
- Each profile has isolated `profiles/<name>/vault.meta` and `profiles/<name>/projects/`.
- Profile name regex: `/^[A-Za-z0-9 _-]{1,32}$/`, max 10 profiles.
- Password verification of another profile (`src/services/userManager.ts`) temporarily switches `activeProfile`.

### Projects

- Files: `profiles/<name>/projects/<name>.plan` (encrypted JSON of `TreeNode`).
- Auto-save: `tree.subscribe` in `workspaceManager.ts:123` guards by `isLoading` flag.
- Undo: up to 50 `structedClone` snapshots in `treeStore.ts`.
- Legacy file `plan-tree.json` at AppData root (pre-multi-project era) still has load/save functions — do not use for per-profile storage.

### Tree layout

- Constants: `COLUMN_WIDTH = 280`, `ROW_HEIGHT = 170` (`constants/layout.ts`).
- Absolute-positioned canvas with SVG connections (`TreeConnections.svelte`).
- `ResizeObserver` measures node heights per depth row.
- Layout algorithm in `buildVisibleTree.ts` (Reingold-Tilford-like).

### Recovery

- `setup_recovery` generates random 32-byte key, wraps active key with it.
- `resetPasswordWithRecovery` decrypts all projects with old key, re-encrypts with new password.

### Updater (auto-actualización)

- `@tauri-apps/plugin-updater` v2 en Rust + frontend.
- `check()` en `App.svelte` al iniciar — no blocking.
- `Sidebar.svelte` muestra botón con versión disponible + `relaunch()`.
- Requiere:
  - Par de claves generado con `tauri signer generate`.
  - `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` como env vars / GH secrets.
  - Pubkey en `tauri.conf.json`.
- El release workflow (`.github/workflows/release.yml`) genera y sube `latest.json` con `uploadUpdaterJson: true`.

### Multi-project Progress Chart

- `Progress.svelte` muestra gráfico de línea por proyecto (Progreso page).
- `MultiProjectLineChart.svelte`: una línea colorida por proyecto, tooltip con nombre + %, leyenda con dots.
- `ProjectSelector.svelte`: dropdown multi-select con checkboxes, select/deselect all, color picker inline.
- `ColorPicker.svelte`: 8 colores preset + `<input type="color">` nativo.
- `snapshotsToMultiProjectLineData()` en `chartDataUtils.ts`: carry-forward progress, proyectos sin snapshots como 0%.
- Selección guardada por perfil en `profiles.json` (`graphSelectionByProfile` + `projectColorsByProfile`).

### Plugin System

- Plugins are local ES modules loaded via dynamic `import()` from `~/.config/plan-tree/plugins/`.
- Each plugin has a `manifest.json` (id, name, version, permissions, entry) and an ES module entry point.
- `PluginManager` service (`src/services/pluginManager.ts`): discovery, manifest validation, parallel loading, lifecycle (enable/disable/reload).
- `PluginAPI` facade (`src/services/pluginApi.ts`): typed, permission-enforced surface — views, commands, tree mutations, events, CSS injection, settings.
- `PermissionVerifier` (`src/services/permissionVerifier.ts`): manifest validation + call-time enforcement + auto-disable at 3 violations.
- `PluginEventBus` (`src/services/pluginEventBus.ts`): typed event emitter for plugin lifecycle + tree mutation events.
- `PluginStore` (`src/stores/pluginStore.ts`): Svelte writable store with `PluginMeta[]` (loaded/active/disabled/errored).
- `ViewRegistry` (`src/stores/viewRegistry.ts`): `Map<string, Component>` — built-in views + plugin-registered views.
- `ViewRenderer.svelte`: registry-based dispatch with ErrorBoundary per view.
- Plugin settings: profile-scoped via `pluginSettingsByProfile` in `profiles.json`.
- Crash isolation: try/catch per PluginAPI call; plugins auto-disable on failure.
- Permissions: `tree_read`, `tree_write`, `view_register`, `command_register`, `css_inject`, `settings_write`.

## Commands

| Command | What |
|---------|------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | `vite build` into `dist/` |
| `npm run preview` | Preview built frontend |
| `npm run check` | `svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json` |
| `npm run test` | `vitest run` |
| `npm exec tauri dev` | Full Tauri dev (calls `npm run dev` as beforeDevCommand) |
| `npm exec tauri build` | Production build |
| `npm exec tauri signer generate` | Generate updater signing keypair |

## Conventions & quirks

- `app.css` **is commented out** in `main.ts` — App.svelte and components handle all styling.
- Two files excluded from `svelte-check` in `tsconfig.app.json`: `modalHost.svelte` (lowercase h) and `NewProjectModals.svelte`.
- TypeScript 6.x with `"ignoreDeprecations": "6.0"` in root tsconfig.
- Svelte 5: use `mount()` not `new App()`, use `$:` reactives and `onMount`.
- Tauri devUrl: `http://localhost:5173`; frontendDist: `../dist`.
- On Linux, `WEBKIT_DISABLE_DMABUF_RENDERER=1` is required before `npm exec tauri dev`.
- UI strings are in Spanish (e.g., root node title "Objetivo principal", "Cargando...").

## Notable files

- `src/App.svelte` — top-level layout, login/auth gates, view switching.
- `src/stores/treeStore.ts` — central tree state + undo history + derived layout.
- `src/services/workspaceManager.ts` — project CRUD + auto-save subscription.
- `src/utils/treeUtils.ts` — tree traversal, mutation, progress calculation, focus.
- `src/pages/Progress.svelte` — multi-project progress chart with ProjectSelector.
- `src/components/charts/MultiProjectLineChart.svelte` — line chart with colored project lines.
- `src/components/charts/ProjectSelector.svelte` — multi-select + color picker per project.
- `src/components/charts/ColorPicker.svelte` — preset colors + native picker.
- `src/services/profileManager.ts` — profiles.json CRUD, graph selection/colors per profile.
- `src/utils/chartDataUtils.ts` — snapshots → chart data with carry-forward.
- `src/stores/updateStore.ts` — pendingUpdate + checkingUpdate stores for updater.
- `src/components/Sidebar.svelte` — update button + navigation.
- `.github/workflows/release.yml` — CI release pipeline with signing + latest.json.
- `plan-tree.fish` — dev launcher script with the WebKit env var.
- `src/services/pluginManager.ts` — plugin discovery, loading, enable/disable lifecycle.
- `src/services/pluginApi.ts` — typed PluginAPI facade with permission enforcement.
- `src/services/permissionVerifier.ts` — manifest + call-time permission checking.
- `src/services/pluginEventBus.ts` — typed event emitter for plugin lifecycle.
- `src/stores/pluginStore.ts` — Svelte store for plugin metadata.
- `src/stores/viewRegistry.ts` — Map<string, Component> for view dispatch.
- `src/components/PluginSettings.svelte` — plugin settings panel UI.
- `src/components/PluginErrorFallback.svelte` — error fallback for crashed plugin views.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
