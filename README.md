# Plan Tree 🌳

> **Your tasks. Your tree. Your data. Nothing leaves your machine.**

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="src-tauri/icons/icon.png">
    <img src="src-tauri/icons/icon.png" alt="Plan Tree" width="120">
  </picture>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2.11-ffc131?logo=tauri&logoColor=white" alt="Tauri v2">
  <img src="https://img.shields.io/badge/Svelte-5-ff3e00?logo=svelte&logoColor=white" alt="Svelte 5">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Rust-🦀-DEA584?logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/github/license/ProbeConstructor/plan-tree" alt="License">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status">
  <img src="https://img.shields.io/github/downloads/ProbeConstructor/plan-tree/total" alt="Downloads">
</p>

---

## What is Plan Tree?

Plan Tree is a desktop app for organizing tasks as a tree. It runs entirely offline — no accounts, no servers, no telemetry. Your data stays on your machine, encrypted with military-grade algorithms.

Break down complex projects into smaller pieces, visualize your progress, and never worry about where your data goes.

<!-- TODO: Add screenshot of the main tree view here -->

---

## Philosophy

- **Offline first**: No internet required. Everything runs locally.
- **No accounts**: No sign-ups, no email, no cloud. Just you and your password.
- **No telemetry**: We don't track you. Period.
- **Your data, your format**: Every project is a single `.plan` file you can backup, move, or delete.
- **Transparent encryption**: AES-256-GCM + Argon2id. The key lives only in memory, never touches JavaScript.

---

## Highlights

| | |
|---|---|
| 🌲 **Interactive tree** | Auto-layout with SVG connections. Navigate without dragging. |
| 🔐 **Real encryption** | AES-256-GCM + Argon2id. Key derivation in Rust. Never leaves memory. |
| 👤 **Multiple profiles** | Isolated vaults per user. Each profile has its own projects. |
| 📈 **Progress tracking** | Multi-project line charts with custom colors and selectors. |
| 💾 **Auto-save + undo** | Automatic saving with 50 snapshot undo history. |
| 🔄 **Auto-updater** | Signed updates via GitHub Releases. No manual downloads needed. |

<!-- TODO: Add screenshots of encryption flow, profiles, and progress charts here -->

---

## Who is this for?

- **Developers** who want to break down features without cloud dependencies
- **Students** organizing thesis, coursework, or side projects
- **Writers** structuring chapters, research, or content calendars
- **Anyone** who values privacy and wants to own their task data

---

## Download

Get the latest version from [GitHub Releases](https://github.com/ProbeConstructor/plan-tree/releases/latest):

| Platform | Format |
|----------|--------|
| Linux | `.AppImage` (portable) |
| Windows | `.exe` (installer) |
| macOS | `.dmg` (app) |

---

## Comparison

| Feature | Plan Tree | Traditional Task Managers |
|---------|-----------|---------------------------|
| Offline | ✅ 100% | ❌ Usually cloud-based |
| Encryption | ✅ AES-256-GCM | ❌ None or basic |
| No account | ✅ None needed | ❌ Email required |
| No telemetry | ✅ Zero tracking | ❌ Usually included |
| Data format | ✅ Single `.plan` file | ❌ Proprietary database |
| Multi-profile | ✅ Isolated vaults | ⚠️ Basic or none |
| Auto-save | ✅ With undo history | ⚠️ Depends on sync |
| Tree visualization | ✅ Interactive | ❌ Flat lists only |
| Self-hosted | ✅ Desktop app | ❌ SaaS only |

---

## All Features

| | |
|---|---|
| 🌲 **Interactive tree** | Auto-layout (Reingold-Tilford), SVG connections, keyboard navigation |
| 🔐 **AES-256-GCM encryption** | Argon2id key derivation, key in Rust memory only |
| 👤 **Multiple profiles** | Isolated vaults with independent projects |
| 📁 **Unlimited projects** | Each project is an individual `.plan` file |
| 🔑 **Recovery key** | 32-byte recovery key for forgotten passwords |
| 💾 **Auto-save** | Serialized save queue with 3 retries and backoff |
| ↩️ **50-step undo** | Immutable snapshots of the entire tree |
| 📈 **Multi-project progress** | Comparative line charts with custom selectors and colors |
| 🏷️ **Node tags** | Visual capsules, assignment popover, sidebar filtering |
| ♻️ **Recurring tasks** | Daily, weekly, monthly, or custom recurrence |
| 💬 **Markdown notes** | Editor with preview, per-node |
| ⭐ **Favorites** | Mark nodes as favorites with quick filter |
| 🎯 **Focus mode** | Isolate a node and its subtree |
| 🖼️ **Node icons** | Small square image for visual identification |
| 📐 **Split panel** | Tree + dashboard/calendar/progress side by side |
| 📤 **Export/Import** | Full tree export to markdown |
| 🔄 **Auto-updater** | Signed with private key, served via GitHub Releases |
| 🛡️ **Error boundary** | Global error capture without data loss |
| 🌐 **Bilingual** | English and Spanish with instant switching |

<!-- TODO: Add screenshots of key features here -->

---

## Roadmap

### Completed

- ✅ Offline-first encrypted task management
- ✅ Multi-profile support
- ✅ Auto-save with undo
- ✅ Progress visualization
- ✅ Auto-updater
- ✅ Bilingual support (EN/ES)

### Under evaluation

- 🔌 **Plugin system** — Extensible architecture for custom integrations
- ⌨️ **Command palette** — Keyboard-driven navigation and actions
- 📱 **Mobile companion** — Read-only viewer for on-the-go access
- 🔗 **Import/export formats** — JSON, CSV, and Markdown compatibility

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Svelte 5)                                 │
│  LoginScreen → App.svelte → TreeCanvas               │
│                              ↓                       │
│                   treeStore + undo (50 snapshots)    │
│                              ↓                       │
│                   workspaceManager (auto-save)        │
└──────────────────────┬──────────────────────────────┘
                       │ invoke() Tauri commands
┌──────────────────────▼──────────────────────────────┐
│  Rust Backend (Tauri v2)                             │
│  ┌─────────────────────────────┐                    │
│  │  VaultState                 │                    │
│  │  Mutex<Option<[u8; 32]>>    │  ← key in RAM     │
│  │  never serialized           │                    │
│  └─────────────────────────────┘                    │
│  vault.rs: unlock/lock/encrypt/decrypt               │
│  Argon2id → 256-bit key → AES-256-GCM                │
└──────────────────────┬──────────────────────────────┘
                       │ plugin-fs
┌──────────────────────▼──────────────────────────────┐
│  File System (AppData)                               │
│  profiles/<name>/vault.meta                          │
│  profiles/<name>/projects/<name>.plan  ← encrypted   │
│  profiles.json                                       │
└─────────────────────────────────────────────────────┘
```

### Encryption flow

```
Password + Salt → Argon2id → 256-bit key (Rust RAM only)
                                     ↓
                              AES-256-GCM encrypt
                                     ↓
                              .plan file on disk
```

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Svelte 5, TypeScript 6, Vite |
| Desktop | Tauri v2 (Rust) |
| KDF | Argon2id |
| Cipher | AES-256-GCM |
| Charts | Chart.js |
| Editor | EasyMDE (markdown) |
| Sanitization | DOMPurify |
| i18n | svelte-i18n |
| CI | GitHub Actions (Linux, Windows, macOS) |
| Updates | tauri-plugin-updater + signed releases |

---

## Getting started

### Development

```sh
npm install
npm exec tauri dev          # requires WEBKIT_DISABLE_DMABUF_RENDERER=1 on Linux
```

### Production build

```sh
# Requires signing key for auto-updater
export TAURI_SIGNING_PRIVATE_KEY=$(cat /path/to/private-key)
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-password"

npm exec tauri build
```

### Testing

```sh
npm test                    # vitest (tree, vault, utilities)
npm run check               # svelte-check + tsc
npm run audit               # npm audit + cargo audit
```

---

## Contributing

PRs welcome. The project uses [conventional commits](https://www.conventionalcommits.org/), strict TypeScript, and Svelte 5 runes.

```sh
git clone https://github.com/ProbeConstructor/plan-tree
cd plan-tree
npm install
npm exec tauri dev
```

---

## License

GPL-3.0-only — because your data is yours.
