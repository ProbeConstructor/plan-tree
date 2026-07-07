# Plan Tree 🌳

> **Encrypted tree-task organizer** — tus tareas, tu árbol, tu cifrado. Nada sale de tu máquina.

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2.11-ffc131?logo=tauri&logoColor=white" alt="Tauri v2">
  <img src="https://img.shields.io/badge/Svelte-5-ff3e00?logo=svelte&logoColor=white" alt="Svelte 5">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Rust-🦀-DEA584?logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/github/license/ProbeConstructor/plan-tree" alt="License">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status">
</p>

---

## ¿Qué es esto?

Plan Tree es una app de escritorio **100% offline, 100% local** para organizar tareas en forma de árbol. Cada proyecto es un archivo `.plan` cifrado con **AES-256-GCM**, derivado con **Argon2id**. La clave vive **exclusivamente en memoria en Rust** — ni el frontend la ve, ni se serializa, ni se va a la nube.

No hay servidores, no hay telemetría, no hay cuenta de usuario. Solo vos, tu password, y tu árbol.

---

## ✨ Features

| | |
|---|---|
| 🌲 **Árbol interactivo** | Layout auto-mático (Reingold-Tilford), conexiones SVG, navegación sin drag |
| 🔐 **Cifrado de verdad** | AES-256-GCM + Argon2id. Key derivation y cipher en Rust. Nunca toca JS |
| 👤 **Múltiples profiles** | Perfiles aislados con su propio vault. Cada uno con proyectos independientes |
| 📁 **Proyectos ilimitados** | Cada proyecto es un archivo `.plan` cifrado individualmente |
| 🔑 **Recuperación** | Recovery key de 32 bytes por si olvidás la contraseña |
| 💾 **Auto-save** | Guardado automático con 2s de debounce + 3 retries con backoff |
| ↩️ **Undo** | Hasta 50 snapshots inmutables del árbol completo |
| 📈 **Progreso multi-proyecto** | Gráfico de líneas comparativo entre proyectos, con selector y colores custom |
| 🔄 **Auto-updater** | Las actualizaciones se firman con clave privada y se sirven via GitHub Releases |
| 🖼️ **Iconos por nodo** | Imagen cuadrada chica para identificar visualmente cada tarea |
| 📤 **Export/Import** | Árboles completos exportables a markdown |
| 🛡️ **Error boundary** | Captura global de errores inesperados sin perder data |

---

## 🏗️ Architecture

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
│  │  Mutex<Option<[u8; 32]>>    │  ← clave en RAM    │
│  │  nunca serializada          │                    │
│  └─────────────────────────────┘                    │
│  vault.rs: unlock/lock/encrypt/decrypt               │
│  Argon2id → 256-bit key → AES-256-GCM                │
└──────────────────────┬──────────────────────────────┘
                       │ plugin-fs
┌──────────────────────▼──────────────────────────────┐
│  File System (AppData)                               │
│  profiles/<name>/vault.meta                          │
│  profiles/<name>/projects/<name>.plan  ← cifrados    │
│  profiles.json                                       │
└─────────────────────────────────────────────────────┘
```

### 🔐 Crypto flow

```
Password + Salt → Argon2id → 256-bit key (Rust RAM only)
                                     ↓
                              AES-256-GCM encrypt
                                     ↓
                              .plan file on disk
```

---

## 📦 Build targets

| Platform | Format |
|----------|--------|
| Linux | `.AppImage` |
| Windows | `.exe` (NSIS installer) |
| macOS | `.dmg` |

---

## 🚀 Quick start

```sh
npm install
npm exec tauri dev          # requires WEBKIT_DISABLE_DMABUF_RENDERER=1 on Linux
npm run check               # typecheck: svelte-check + tsc
npm test                    # vitest
npm run build               # producción (frontend)
```

### Release build

```sh
# Requiere clave de firma para el updater
export TAURI_SIGNING_PRIVATE_KEY=$(cat /path/to/private-key)
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-password"

npm exec tauri build
```

---

## 🧪 Tests

```sh
npm test                    # vitest (tests de árbol, vault, utilidades)
npm run check               # svelte-check + tsc
npm run audit               # npm audit + cargo audit
```

---

## 🛠️ Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Svelte 5, TypeScript 6, Vite |
| Desktop | Tauri v2 (Rust) |
| KDF | Argon2id |
| Cipher | AES-256-GCM |
| Charts | Chart.js |
| Editor | EasyMDE (markdown) |
| Sanitization | DOMPurify |
| CI | GitHub Actions (Linux, Windows, macOS) |
| Updates | tauri-plugin-updater + signed releases |

---

## 🤝 Contributing

PRs bienvenidas. El proyecto usa [conventional commits](https://www.conventionalcommits.org/), TypeScript estricto, y Svelte 5 runes.

```sh
git clone https://github.com/ProbeConstructor/plan-tree
cd plan-tree
npm install
npm exec tauri dev
```

---

## 📄 License

GPL-3.0-only — porque tu data es tuya.
