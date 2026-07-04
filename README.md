# Plan Tree

![License](https://img.shields.io/github/license/ProbeConstructor/plan-tree)

**Encrypted tree-task organizer** — a desktop app built with Tauri v2 + Svelte 5 + TypeScript.

Tasks are organized as a tree (parent-child relationships), encrypted at rest with AES-256-GCM + Argon2id, and unlocked only in Rust memory — never sent to JS or serialized.

## Quick Start

```sh
npm install
npm exec tauri dev        # requires WEBKIT_DISABLE_DMABUF_RENDERER=1 on Linux
npm run check             # typecheck
npm test                  # run tests
npm run build             # production frontend build
```

## Features

- **Tree-based task organization** with auto-layout (Reingold-Tilford), SVG connections, and drag-free navigation
- **Multiple profiles** with isolated encrypted vaults
- **Unlimited projects per profile** — each `.plan` file encrypted individually
- **Password recovery** via 32-byte recovery key
- **Auto-save** with 2s debounce + undo history (50 snapshots)
- **Export/import** trees via markdown

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript + Vite |
| Backend | Tauri v2 (Rust) |
| Key derivation | Argon2id |
| Cipher | AES-256-GCM |
| Key storage | In-memory `[u8; 32]` in Rust only |

## Architecture

- **Single-window** Tauri v2 app
- Frontend entry: `src/main.ts` (`mount(App, ...)`)
- Backend entry: `src-tauri/src/lib.rs`
- All crypto in `src-tauri/src/vault.rs`
- Tree state in `src/stores/treeStore.ts` with undo support
- Auto-save via `src/services/workspaceManager.ts`

## Security

- Password never leaves the Rust layer
- Vault key derived with Argon2id (memory-hard KDF)
- All `.plan` files encrypted with AES-256-GCM (authenticated encryption)
- Rate-limited unlock (500ms minimum between attempts)
- Scoped filesystem permissions per Tauri capabilities
- No shell/HTTP/process permissions granted

## Tests

```sh
npm test        # vitest (68+ tree utility tests)
npm run check   # svelte-check + tsc
npm run audit   # npm + cargo audit
```

## License

GPL-3.0-only
