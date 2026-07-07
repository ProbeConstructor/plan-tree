# Product Requirements Document — Plan Tree

## 1. Executive Summary

**Problem:** Knowledge workers need to organize tasks with hierarchical structure and total privacy. Existing solutions are cloud-based (no real privacy), lack tree structure, or aren't offline-first.

**Proposed Solution:** Plan Tree — a Tauri v2 + Svelte 5 desktop application for creating and managing encrypted tree-structured tasks using Argon2id + AES-256-GCM. Isolated profiles per folder, auto-save, undo, and recovery key. 100% offline, 100% local.

**Success Criteria:**

1. Zero data loss on abrupt close, meta corruption, or interrupted password reset.
2. User can unlock, edit, and save a tree in under 2s (excluding unlock time).
3. Distributable on Linux (AppImage), Windows (NSIS), and macOS (DMG) with no known regressions.
4. Test suite covers vault operations, tree mutations, and recovery flow.
5. CI passes typecheck + build + tests before each release.
6. Auto-updater checks for new versions on startup, downloads and installs with one click.
7. Multi-project progress chart shows progress lines for selected projects over time.

## 2. User Experience & Functionality

**User Personas:**

- **Spanish-speaking knowledge worker:** Needs to organize personal or professional projects with tree structure, without relying on cloud. Values privacy and data control.

**User Stories:**

| ID | Story | Acceptance Criteria |
|----|-------|--------------------|
| US-01 | As a user, I want to create password-protected profiles to isolate my projects. | Argon2id unlock < 5s. Visual feedback during unlock. Check string verifies password. |
| US-02 | As a user, I want to create projects within a profile to organize different areas. | Each project is an independent encrypted `.plan` file. Switch project without data loss. |
| US-03 | As a user, I want to add, edit, reorder, and delete tree nodes to structure my tasks. | Drag & drop, inline editing, add/remove child. Undo up to 50 snapshots. |
| US-04 | As a user, I want my data saved automatically without manual action. | AutoSaveStrategy with 2s debounce, 3 retries with backoff, explicit `flush()`/`cancel()`. `close-requested` handler flushes pending save before window closes. Single-instance file lock. |
| US-05 | As a user, I want to recover my vault if I forget my password using a recovery key. | 32-byte recovery key generated at setup. Reset re-encrypts all projects atomically (batch in-memory, batch write). |
| US-06 | As a user, I want to associate a small image/icon with each tree node for visual identification. | Image stored encrypted alongside the node. Rendered as small square icon in node view. Max 64x64, PNG/JPEG. |
| US-07 | As a user, I want the app not to break on unexpected errors. | Global error boundary captures unhandled exceptions. Friendly message with restart option. |
| US-08 | As a user, I want to see progress of multiple projects in a single chart for comparison. | Multi-project line chart with colored lines, selectable projects, persisted selection per profile. |
| US-09 | As a user, I want the app to check for updates automatically and install them with one click. | `check()` on startup (non-blocking), button in sidebar on new version, `downloadAndInstall()` + `relaunch()`. |

**Non-Goals:**

- Cloud sync / automatic backup to external services.
- Multi-window.
- Formal i18n (post-MVP).
- Team collaboration / sharing.
- Plugins or extensions.

## 3. Technical Specifications

### Architecture Overview

```
┌──────────────────────────────────────────────────┐
│              Frontend (Svelte 5)                   │
│  LoginScreen → sessionOrchestrator → App.svelte   │
│             │  (login/logout/recover/bootstrap)    │
│             │                                      │
│  TreeCanvas → treeStore → autoSaveStrategy         │
│             │  (debounce 2s, retry 3, flush/cancel)│
│             │                                      │
│  ImagePicker → node.icon → projectManager          │
│             │  (thin orchestrator)                 │
│  Sidebar ───┤  ├─ projectIO (read/write files)    │
│             │  ├─ projectCrypto (encrypt/decrypt)  │
│             │  └─ dialogAdapter (export/import)    │
│             │                                      │
│  App.onMount ── close-requested → autoSave.flush() │
└──────────────────┬───────────────────────────────┘
                   │ invoke() Tauri commands
┌──────────────────▼───────────────────────────────┐
│            Rust Backend (Tauri v2)                 │
│  VaultState (Mutex<Option<[u8;32]>>)               │
│  vault.rs: unlock/lock/encrypt/decrypt             │
│  vaultMeta.ts: read/write vault.meta               │
│  recoveryManager.ts: setup / reset                 │
│  vaultManager.ts: invoke wrappers                  │
└──────────────────┬───────────────────────────────┘
                   │ plugin-fs
┌──────────────────▼───────────────────────────────┐
│         File System (AppData)                     │
│  profiles/<name>/vault.meta                       │
│  profiles/<name>/projects/<name>.plan             │
│  profiles.json                                    │
│  (legacy plan-tree.json → migrado a Principal)    │
└───────────────────────────────────────────────────┘
```

Modules removed: `authStore.ts` (absorbed by sessionOrchestrator), `appInitializer.ts` (absorbed by `session.initializeApp()`).

### Data Model

```typescript
// TreeNode (stored encrypted as JSON inside .plan)
interface TreeNode {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  startDate?: string;   // ISO date
  dueDate?: string;     // ISO date
  icon?: string;        // Data URL (PNG/JPEG base64, max 64x64)
  children: TreeNode[];
}

// vault.meta (plain JSON, not encrypted)
interface VaultMeta {
  version: 1;
  salt: string;          // hex
  checkString: string;   // encrypted known plaintext
  wrappedRecovery?: string; // encrypted recovery key
  checksum: string;      // SHA-256 of content
}
```

### Integration Points

- `@tauri-apps/api/window` — `onCloseRequested` event to flush pending saves before window closes.
- `@tauri-apps/plugin-fs` — file I/O over AppData (abstracted by `projectIO.ts`).
- `@tauri-apps/plugin-dialog` — file dialogs for export/import and image selection (abstracted by `dialogAdapter.ts` with Tauri/Browser fork).
- `@tauri-apps/plugin-updater` — auto-updater. `check()` on startup, button in sidebar to download & install + `relaunch()`. Requires signing keypair + `latest.json` in every release.
- `@tauri-apps/plugin-process` — `relaunch()` for updater and error recovery.

### Security & Privacy

- Vault key: Argon2id(password + salt) → 256-bit AES-GCM key. Key only in Rust RAM (`VaultState(Mutex<Option<[u8;32]>>)`).
- `.plan` files always encrypted on disk. No plaintext.
- CSP with `'unsafe-inline'` for Svelte styles (required by Svelte), otherwise locked to `'self'`. `connect-src` includes `https://api.github.com` + `https://github.com` for updater checks.
- Input sanitization with DOMPurify on node titles and icons (data URIs).
- Single-instance lock prevents concurrent writes.
- Tauri capabilities scoped to `BaseDirectory.AppData`.
- SHA-256 checksum on `vault.meta` to detect corruption.

### Versioning & Migration

- `version` field in `.plan` and `vault.meta` for schema evolution.
- Batch migration on open when version mismatch is detected.
- No automatic rollback; manual backup of AppData.

### Image Icons (US-06)

- Image converted to base64 data URI, stored in `node.icon`.
- Encryption: image travels inside the encrypted `.plan` — same protection as text.
- Size limit: 64x64, max 50KB encoded.
- Render: `<img>` inside the node view, lazy loading when 20+ nodes visible.

## 4. Risks & Roadmap

### Phased Rollout

| Phase | Features | Criteria |
|-------|----------|----------|
| **MVP** | Integrity fixes (meta checksum, schema versioning, close guard, single-instance, CSP, error boundary) + image icons per node | Tests pass, typecheck clean, Linux build succeeds |
| **v1.0** | Windows build + auto-updater + CI pipeline | Windows build + GitHub Actions green |
| **v1.1** | Multi-project progress chart + updater signing + release automation + macOS build | Chart with project selector, color picker, persisted selection; GitHub Actions release flow produces `latest.json` for updates |
| **v1.2** | i18n (Svelte i18n library) | EN + ES translations, language switcher |
| **v2.0** | TBD (sync, mobile, etc.) | — |

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta corruption without checksum → permanent lockout | Catastrophic | SHA-256 checksum in vault.meta. Validation on unlock. |
| Password reset fails mid-way | Catastrophic | Batch temp + batch write atomic operation. Manual rollback possible. |
| Abrupt close during auto-save | Data loss on last change | `AutoSaveStrategy.flush()` in `close-requested` handler, debounce 2s with 3 retries, backup single-instance lock. |
| Base64 images bloat .plan file size | UX degradation | 50KB encoded limit. Validation on upload. |
| No tests → undetected regressions | Unpredictable quality | Test suite in CI before release. Critical coverage: vault, tree mutations, recovery. |
| CSP `'unsafe-inline'` → XSS in node titles | Local session hijack | CSP locks script-src to `'self'` exclusively. DOMPurify on all inputs. |
| Updater signing key lost → no updates deliverable | Delivery blocked | Private key stored as GitHub secret + local env. Backup keyfile in password manager. |
