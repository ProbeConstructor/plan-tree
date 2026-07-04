## Exploration: Modal System & Delete Project Flow

### Current State

The app has a lightweight modal system managed through a Svelte writable store. There's one base `Modal.svelte` component, a `ModalHost.svelte` that conditionally renders modals, and 3 individual modal components in `src/modals/`. The delete project flow uses `ConfirmModal` triggered from `Sidebar.svelte`, which calls `workspaceManager.deleteProject()` → `projectManager.deleteProject()`.

---

### Affected Areas

| File | Lines | Role |
|------|-------|------|
| `src/components/Modal.svelte` | 1-94 | Base modal container — backdrop, header, close button, default slot |
| `src/components/ModalHost.svelte` | 1-13 | Reads modal store, renders active modal with `<svelte:component>` |
| `src/stores/modalStore.ts` | 1-23 | Writable store with `openModal()` and `closeModal()` |
| `src/components/Sidebar.svelte` | 56-71 | Triggers all project modals (new, rename, delete) |
| `src/modals/ConfirmModal.svelte` | 1-46 | Reusable confirm dialog — title, message, Cancel / Eliminar buttons |
| `src/modals/NewProjectModal.svelte` | 1-60 | Single-input form modal for creating a project |
| `src/modals/RenameProjectModal.svelte` | 1-49 | Single-input form modal for renaming current project |
| `src/services/workspaceManager.ts` | 110-120 | `deleteProject()` — gets active, deletes, refreshes, switches to first |
| `src/services/projectManager.ts` | 88-97 | `deleteProject(name)` — guards against deleting the last project with native `alert()`, calls `IO.removeFile` |
| `src/components/ErrorBoundary.svelte` | 54-76 | Full-screen error overlay (NOT a modal, but similar visual pattern) |
| `src/components/LoginScreen.svelte` | 1-284 | Full-page form (NOT a modal — replaces main content) |
| `src/components/UserManager.svelte` | 54-96 | Inline profile list with inline delete forms (NOT a modal) |
| `src/components/tree/Node.svelte` | 76 | Uses native `confirm()` for extract-to-project |

---

### How the Modal System Works

**Store** (`src/stores/modalStore.ts`):
```ts
interface ModalState {
  component: any;
  props?: Record<string, unknown>;
}
const modal = writable<ModalState>({ component: null });
openModal(component, props) → sets component + props
closeModal() → sets component to null
```

**Host** (`ModalHost.svelte`, rendered in `App.svelte` line 141 within authenticated layout):
- If `$modal.component` is truthy, renders `<Modal>` wrapping `<svelte:component>`.

**Base** (`Modal.svelte`):
- Fixed backdrop `z-index: 1000`, `rgba(0,0,0,.6)` + `backdrop-filter: blur(5px)`.
- Closes on: Escape, backdrop click (target check), close button (✕).
- Dialog: `width: 420px`, `background: #1a1d24`, `border-radius: 12px`.
- Header with title + close button, bottom border. Section with `padding: 18px` for content slot.

**Component hierarchy:**
```
App.svelte →
  ModalHost.svelte (reads $modal store) →
    Modal.svelte (wrapper) →
      <svelte:component> (New | Rename | Confirm)
```

---

### All Modal/Dialog Instances

#### Standard Modal System (src/modals/)

**1. NewProjectModal** (`src/modals/NewProjectModal.svelte`)
- **Title**: "Nuevo proyecto"
- **Content**: Single `<input>` with `placeholder="Nombre del proyecto"`, `use:focusOnMount`
- **Actions**: Cancelar (closes) | Crear (calls `createProject`)
- **Enter**: Submits

**2. RenameProjectModal** (`src/modals/RenameProjectModal.svelte`)
- **Title**: "Renombrar proyecto"
- **Content**: Single `<input>`, pre-filled with `$activeProject`, `use:focus`
- **Actions**: Cancelar (closes) | Guardar (calls `renameProject`)
- **Enter**: Submits
- **Note**: Defines its own `focus()` action instead of reusing `focusOnMount`

**3. ConfirmModal** (`src/modals/ConfirmModal.svelte`)
- **Title**: Dynamic (prop), **Content**: `<p>{message}</p>`
- **Actions**: Cancelar (closes) | **Eliminar** (calls `onConfirm` then closes — hardcoded "Eliminar" label)
- **Props**: `title`, `message`, `onConfirm: () => Promise<void> | void`
- **Danger button**: `class="danger"` with `background: #b91c1c`

#### Delete Project Flow

**Trigger**: Sidebar.svelte line 62-71:
```svelte
<button on:click={() =>
  openModal(ConfirmModal, {
    title: "Eliminar proyecto",
    message: `¿Eliminar "${$activeProject}"?`,
    onConfirm: deleteProject,
  })}>
  🗑️ Eliminar
</button>
```

**Execution chain**:
1. `workspaceManager.deleteProject()` (line 110-120) — gets `$activeProject`, calls `projectManager.deleteProject(current)`, refreshes project list, switches to first remaining project
2. `projectManager.deleteProject(name)` (line 88-97) — guards: if last project, shows `alert("Debe existir al menos un proyecto.")` and returns; otherwise `IO.removeFile(name)`
3. `ConfirmModal.confirmAction()` (line 9-12) — calls `onConfirm()`, then calls `closeModal()` — **NOTE**: if `onConfirm()` throws, the modal still closes (no error handling)

#### Non-modal Dialogs / Pages

| Component | Type | Notes |
|-----------|------|-------|
| ErrorBoundary.svelte | Full-screen overlay | Fixed `z-index: 9999`, dark bg, red-bordered card, "Reintentar" / "Recargar app". UIs overlap but structurally independent. |
| LoginScreen.svelte | Full-page form | Uses `@tauri-apps/plugin-dialog` `ask()` for create-profile confirmation (native OS dialog) |
| UserManager.svelte | Inline page with expandable delete forms | Not a modal — inline form revealed per profile with password input and Confirmar/Cancelar buttons |
| Node.svelte:76 | Native browser `confirm()` | Extracting a node to a new project uses `confirm("...")` — bypasses modal system entirely |

---

### Styling Patterns

**Modal base** (`Modal.svelte`):
- Backdrop: `position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(5px); z-index:1000`
- Dialog: `width:420px; background:#1a1d24; border:1px solid #2a2f37; border-radius:12px; overflow:hidden`
- Header: `display:flex; justify-content:space-between; padding:16px 18px; border-bottom:1px solid #2a2f37`
- Slot section: `padding:18px`
- Title: `font-size:18px; margin:0`
- Close button: `color:#aaa; font-size:18px; background:none; border:none`

**App-wide color tokens** (consistently used):
- Body bg: `#0f1115` | Text: `#e7e9ee`
- Card/surface: `#1a1d24`, border: `#2a2f37`
- Sidebar: `#17191d`
- Input bg: `#20242c` or `#1a1d24`, border: `#333` or `#2a2f37`, radius: `6-8px`
- Muted text: `#6b7280` or `#9aa1ab`
- Danger: `#b91c1c` (bg), `#ef4444` (border/text)
- Button base: `border-radius: 8px; padding: 8-10px;`

**No animations** — modals and overlays appear/disappear instantly (no transitions).

---

### Key Inconsistencies Found

1. **⚠️ DOUBLE MODAL WRAPPING (structural bug)**: `ModalHost.svelte` wraps the component in `<Modal>`, AND each individual modal (NewProjectModal, RenameProjectModal, ConfirmModal) also starts with `<Modal>`. This renders two nested modals — two backdrops, two dialogs. The inner modal's `position:fixed` backdrop covers the outer one. It works in practice but is clearly unintended and fragile.

2. **ConfirmModal hardcodes "Eliminar" button** — the action button always says "Eliminar" regardless of `title` prop. Reusing it for non-delete confirmations (e.g., "Cerrar sesión") would show wrong label. Should be a configurable prop.

3. **ConfirmModal swallows errors** — if `onConfirm()` rejects, `closeModal()` still runs (line 10-11). No error feedback to user.

4. **`projectManager.ts:91-93` uses native `alert()`** — the only browser-native `alert()` in the app (last-project guard). Breaks consistency.

5. **`Node.svelte:76` uses native `confirm()`** — "Extract to project" bypasses the modal system entirely.

6. **ModalStore has no `title` field in interface** — but `ModalHost` references `$modal.title` (always `undefined`). The actual title comes from the individual modal's `<Modal title={...}>` wrapper. This ties back to issue #1 (the double-wrapping means `ModalHost`'s title is never used).

7. **RenameProjectModal defines redundant `focus()`** — NewProjectModal has `focusOnMount()`, RenameProjectModal defines its own identical `focus()`. Should be shared.

8. **No focus trap** — Tab key cycles outside the modal (a11y gap).

9. **`confirmAction` naming inconsistency** — ConfirmModal names its handler `confirmAction`, but the UI says "Eliminar" and the store exposes `onConfirm`. Mixed terminology.

### Recommendation

The modal system is simple and functional for a small app but has the double-wrapper bug that should be fixed. The cleanest fix is to have `ModalHost` provide the wrapping `<Modal>`, and have individual modals export ONLY the slot content (no `<Modal>` root). Alternatively, remove the `<Modal>` wrapper from `ModalHost` and let each modal be fully self-contained — but that loses the centralized rendering pattern in `ModalHost`.

The delete flow itself is cleanly structured — uses `ConfirmModal` correctly, chains through `workspaceManager` → `projectManager`. The native `alert()` in `projectManager.ts` is the only rough edge.

### Risks
- Removing the double-modal wrapping needs care — individual modals rely on their own `<Modal>` for styling. They'd need to be refactored to provide just content.
- The ConfirmModal's hardcoded button label means any new use of it (non-delete) will show wrong text.

### Ready for Proposal
Yes — the analysis is complete. Orchestrator should confirm if the user wants to fix the double-wrapping and the native `alert()` inconsistency, or if they just want the delete project flow documented as-is.
