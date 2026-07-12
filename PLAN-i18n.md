# Plan: Bilingual i18n (EN/ES) for Plan Tree

> **Goal**: Add bilingual support with language selector, global preference, and immediate UI switching.
> **Engine**: svelte-i18n
> **Scope**: ~170 UI strings across 31 files + infrastructure + documentation
> **Invariant**: Existing user data is never translated.

---

## Key Naming Convention

Flat namespace with dot-notation prefixes. All keys are lowercase, English, descriptive.

```
app.loading                  → "Loading..."
login.title                  → "Login"
login.username.placeholder   → "Username"
login.password.placeholder   → "Password"
modal.confirm.delete         → "Delete"
tree.node.delete.title       → "Delete node"
calendar.months.january      → "January"
tree.defaults.depth0         → "User"
validation.nameEmpty         → "{label}: name cannot be empty."
```

Prefixes: `app.`, `login.`, `user.`, `recovery.`, `sidebar.`, `modal.confirm.`, `modal.newProject.`, `modal.rename.`, `modal.nodeDetail.`, `modal.tagManager.`, `modal.recurrence.`, `tree.node.`, `tree.search.`, `tree.titleControls.`, `tree.detailsPanel.`, `tree.tagPopover.`, `tree.defaults.`, `dashboard.`, `calendar.`, `progress.`, `chart.`, `error.`, `validation.`

---

## Step 0 — i18n Infrastructure

**Goal**: Install svelte-i18n, create translation dictionaries, wire up persistence, create language selector.

### 0.1 Install svelte-i18n

```bash
npm install svelte-i18n
```

Verify: `npm run check` passes after install.

### 0.2 Create translation dictionaries

**File**: `src/i18n/en.json`
**File**: `src/i18n/es.json`

Both files start empty (`{}`), populated incrementally in Steps 1-5.

Structure example:
```json
{
  "app.loading": "Loading...",
  "app.noProject": "No project",
  "login.title": "Login",
  "login.username.placeholder": "Username"
}
```

### 0.3 Create i18n entry point

**File**: `src/i18n/index.ts`

```typescript
import { init, register, locale } from "svelte-i18n";

register("en", () => import("./en.json"));
register("es", () => import("./es.json"));

init({
  fallbackLocale: "en",
  initialLocale: "es", // overridden at startup from profiles.json
});

export { locale };
```

### 0.4 Add language to ProfilesFile schema

**File**: `src/services/profileDataStore.ts`

Add to `ProfilesFile` interface:
```typescript
language: string; // "en" | "es", default "es"
```

Add to `defaultData()`:
```typescript
language: "es",
```

Add methods to `ProfileDataStore`:
```typescript
async getLanguage(): Promise<string> {
  const data = await this.load();
  return data.language ?? "es";
}

async setLanguage(lang: string): Promise<void> {
  return this.serialized(async () => {
    const data = await this.load();
    data.language = lang;
    this.dirty = true;
    await this.flush();
  });
}
```

### 0.5 Create language store

**File**: `src/stores/languageStore.ts`

```typescript
import { writable, get } from "svelte/store";
import { locale } from "svelte-i18n";
import { profileData } from "../services/profileDataStore";

export const currentLanguage = writable<string>("es");

export async function loadLanguage(): Promise<void> {
  const lang = await profileData.getLanguage();
  currentLanguage.set(lang);
  locale.set(lang);
}

export async function setLanguage(lang: string): Promise<void> {
  await profileData.setLanguage(lang);
  currentLanguage.set(lang);
  locale.set(lang);
}
```

### 0.6 Create LanguageSelector component

**File**: `src/components/LanguageSelector.svelte`

Centered minimalist screen with two cards:
- 🇺🇸 English
- 🇪🇸 Español

On select: call `setLanguage()`, dispatch event to parent.

### 0.7 Wire into App.svelte

**File**: `src/App.svelte`

Add to bootstrap sequence (after `bootstrapProfile()`, before `appReady = true`):
```typescript
await loadLanguage();
```

Add new template gate between `!appReady` and `!$isAuthenticated`:
```svelte
{#if !appReady}
  <p class="loading">{t('app.loading')}</p>
{:else if !languageSelected && !hasProfiles}
  <LanguageSelector on:select={() => (languageSelected = true)} />
{:else if !$isAuthenticated}
  ...existing login...
```

`hasProfiles` = check if profiles.json has any profiles (determines first-launch vs existing user).

**After Step 0**: `npm run check` must pass. App boots, shows language selector on first launch, defaults to Spanish for existing users.

---

## Step 1 — Utility Base

**Goal**: Migrate strings in utility files that feed multiple components.

### 1.1 calendarUtils.ts

**File**: `src/utils/calendarUtils.ts`

Replace hardcoded `MONTH_NAMES` and `WEEK_DAYS_SHORT` with i18n lookups:

```typescript
import { t } from "svelte-i18n";

// Replace const arrays with getter functions:
export function getMonthNames(): string[] {
  return [
    get(t)("calendar.months.january"),
    get(t)("calendar.months.february"),
    // ... all 12
  ];
}

export function getWeekDays(): string[] {
  return [
    get(t)("calendar.days.monday"),
    get(t)("calendar.days.tuesday"),
    // ... all 7
  ];
}
```

Update `formatMonthYear()` to use `getMonthNames()[month]`.

**Impact**: `Calendar.svelte`, `Progress.svelte` consume these functions.

### 1.2 validation.ts

**File**: `src/utils/validation.ts`

Replace hardcoded error messages:

```typescript
import { get } from "svelte/store";
import { t } from "svelte-i18n";

export const SAFE_NAME_PATTERN_KEY = "validation.namePattern";

export function validateSafeName(name: string, label: string): void {
  if (!name || !name.trim()) {
    throw new Error(get(t)("validation.nameEmpty", { values: { label } }));
  }
  if (!SAFE_NAME_REGEX.test(name.trim())) {
    throw new Error(get(t)("validation.nameInvalid", { values: { label, pattern: get(t)("validation.namePattern") } }));
  }
}
```

### 1.3 tree-display.ts

**File**: `src/utils/tree-display.ts`

Replace `getDefaultTitle()`:

```typescript
import { get } from "svelte/store";
import { t } from "svelte-i18n";

export function getDefaultTitle(depth: number): string {
  const key = `tree.defaults.depth${Math.min(depth, 5)}`;
  return get(t)(key);
}
```

### 1.4 pathUtils.ts

**File**: `src/utils/pathUtils.ts`

Replace error message:

```typescript
throw new Error(get(t)("validation.noActiveProfile"));
```

**After Step 1**: `npm run check` passes. All utility strings use i18n keys.

---

## Step 2 — Login & Users

**Goal**: Migrate LoginScreen, UserManager, RecoveryBanner.

### 2.1 LoginScreen.svelte

**File**: `src/components/LoginScreen.svelte` (~25 strings)

Replace all hardcoded Spanish with `t()` calls. Example:

```svelte
<script lang="ts">
  import { t } from "svelte-i18n";
</script>

<input placeholder={$t('login.username.placeholder')} />
<input placeholder={$t('login.password.placeholder')} />
<button>{$t('login.submit')}</button>
```

Dialog messages, validation errors, hints — all use `$t('login.*')` keys.

### 2.2 UserManager.svelte

**File**: `src/components/UserManager.svelte` (~10 strings)

Same pattern: replace all Spanish with `$t('user.*')` keys.

### 2.3 RecoveryBanner.svelte

**File**: `src/components/RecoveryBanner.svelte` (~4 strings)

Replace with `$t('recovery.*')` keys.

**After Step 2**: `npm run check` passes. Login flow fully bilingual.

---

## Step 3 — Sidebar + Modals

**Goal**: Migrate Sidebar (including language switcher) and all modals.

### 3.1 Sidebar.svelte

**File**: `src/components/Sidebar.svelte` (~20 strings)

- Replace all Spanish button labels, dialog titles, messages with `$t('sidebar.*')` keys
- Add language switcher dropdown in the settings section (near lock button):
  ```svelte
  <select on:change={(e) => setLanguage(e.target.value)} value={$currentLanguage}>
    <option value="en">English</option>
    <option value="es">Español</option>
  </select>
  ```
- Import `currentLanguage` from `languageStore`

### 3.2 ConfirmModal.svelte

**File**: `src/modals/ConfirmModal.svelte`

Replace default `confirmLabel = "Eliminar"` with `$t('modal.confirm.delete')`.

### 3.3 NewProjectModal.svelte

**File**: `src/modals/NewProjectModal.svelte`

Replace title, placeholder, validation messages, button labels with `$t('modal.newProject.*')` keys.

### 3.4 RenameProjectModal.svelte

**File**: `src/modals/RenameProjectModal.svelte`

Replace with `$t('modal.rename.*')` keys.

### 3.5 NodeDetailModal.svelte

**File**: `src/modals/NodeDetailModal.svelte`

Replace all labels (Título, Fecha de inicio, Estado, Prioridad, etc.), status options (Por hacer, En progreso, Completado), priority options (Baja, Media, Alta, Crítica), button labels with `$t('modal.nodeDetail.*')` keys.

### 3.6 TagManagerModal.svelte

**File**: `src/modals/TagManagerModal.svelte`

Replace with `$t('modal.tagManager.*')` keys.

### 3.7 RecurrenceConfigModal.svelte

**File**: `src/components/RecurrenceConfigModal.svelte`

Replace day abbreviations, labels (Diaria, Semanal, Cada, etc.), button labels with `$t('modal.recurrence.*')` keys.

**After Step 3**: `npm run check` passes. All modals and sidebar bilingual. Language switcher works.

---

## Step 4 — Tree + Pages + Charts

**Goal**: Migrate all tree components, pages, and chart components.

### 4.1 Node.svelte

**File**: `src/components/tree/Node.svelte`

Replace dialog messages (delete confirmation, extract to project) with `$t('tree.node.*')` keys.

### 4.2 NodeTitleControls.svelte

**File**: `src/components/tree/NodeTitleControls.svelte`

Replace tooltips (Quitar de favoritos, Repetición configurada, etc.) with `$t('tree.titleControls.*')` keys.

### 4.3 NodeSearch.svelte

**File**: `src/components/tree/NodeSearch.svelte`

Replace title, placeholder, match labels, empty state with `$t('tree.search.*')` keys.

### 4.4 NodeDetailsPanel.svelte

**File**: `src/components/tree/NodeDetailsPanel.svelte`

Replace tooltip with `$t('tree.detailsPanel.*')` key.

### 4.5 TagPopover.svelte

**File**: `src/components/tree/TagPopover.svelte`

Replace header, placeholder, create action, empty state with `$t('tree.tagPopover.*')` keys.

### 4.6 App.svelte (remaining strings)

**File**: `src/App.svelte`

Replace tab labels (Árbol, Resumen, Calendario, Gráficos), loading text, "Sin proyecto" with `$t('app.*')` keys. Import `t` from svelte-i18n.

### 4.7 ErrorBoundary.svelte

**File**: `src/components/ErrorBoundary.svelte`

Replace error heading, toggle labels, retry/reload buttons with `$t('error.*')` keys.

### 4.8 Dashboard.svelte

**File**: `src/pages/Dashboard.svelte`

Replace section headings (Progreso global, Para hoy, Favoritos, Etiquetas, etc.), empty states, status text with `$t('dashboard.*')` keys.

### 4.9 Calendar.svelte

**File**: `src/pages/Calendar.svelte`

Replace "Hoy" button, overflow labels, "omitida" with `$t('calendar.*')` keys. Uses `getMonthNames()` and `getWeekDays()` from Step 1.

### 4.10 Progress.svelte

**File**: `src/pages/Progress.svelte`

Replace error messages, loading states, chart titles, empty states with `$t('progress.*')` keys.

### 4.11 Chart Components

**Files**: `StatsCards.svelte`, `BarChart.svelte`, `DonutChart.svelte`, `LineChart.svelte`, `MultiProjectLineChart.svelte`, `ProjectSelector.svelte`, `ColorPicker.svelte`

Replace stat labels, chart titles, empty states, ARIA labels with `$t('chart.*')` keys.

**After Step 4**: `npm run check` passes. Entire UI bilingual.

---

## Step 5 — Documentation + Services

**Goal**: Translate README, rename/translate security audit doc, migrate TS service messages.

### 5.1 README.md

**File**: `README.md`

Full translation to English. Keep code blocks, file paths, and command examples as-is. Translate:
- Tagline
- "¿Qué es esto?" section
- Feature table labels
- Architecture diagram comments
- Command comments
- Contributing section
- License tagline

### 5.2 Security audit doc

**File**: `docs/auditoria-seguridad.md` → rename to `docs/security-audit.md`

Translate content to English.

### 5.3 TypeScript services

**Files**: `workspaceManager.ts`, `vaultMeta.ts`, `recoveryManager.ts`, `autoSaveStrategy.ts`

Replace UI-facing error messages (dialog titles, messages shown to users) with `$t()` calls. Console-only messages (like autoSave warning) can stay in English or be migrated — low priority.

`autoSaveStrategy.ts` console warnings are developer-facing, not user-facing — leave in English.

**After Step 5**: `npm run check` passes. All documentation in English. All UI strings bilingual.

---

## Verification Checklist

After each step:
- [ ] `npm run check` passes (svelte-check + tsc)
- [ ] App boots without errors
- [ ] Language selector appears on first launch (no profiles)
- [ ] Existing users default to Spanish silently
- [ ] Language switch from sidebar updates UI immediately
- [ ] Fallback to English works for missing keys

Final verification:
- [ ] All ~170 strings migrated (grep for remaining Spanish in .svelte and .ts files)
- [ ] README fully in English
- [ ] Security audit doc renamed and translated
- [ ] No regressions in login flow, tree operations, or modals

---

## Files Modified (Summary)

| Step | Files | New Files |
|------|-------|-----------|
| 0 | `profileDataStore.ts`, `App.svelte` | `src/i18n/index.ts`, `src/i18n/en.json`, `src/i18n/es.json`, `src/stores/languageStore.ts`, `src/components/LanguageSelector.svelte` |
| 1 | `calendarUtils.ts`, `validation.ts`, `tree-display.ts`, `pathUtils.ts` | — |
| 2 | `LoginScreen.svelte`, `UserManager.svelte`, `RecoveryBanner.svelte` | — |
| 3 | `Sidebar.svelte`, `ConfirmModal.svelte`, `NewProjectModal.svelte`, `RenameProjectModal.svelte`, `NodeDetailModal.svelte`, `TagManagerModal.svelte`, `RecurrenceConfigModal.svelte` | — |
| 4 | `Node.svelte`, `NodeTitleControls.svelte`, `NodeSearch.svelte`, `NodeDetailsPanel.svelte`, `TagPopover.svelte`, `App.svelte`, `ErrorBoundary.svelte`, `Dashboard.svelte`, `Calendar.svelte`, `Progress.svelte`, `StatsCards.svelte`, `BarChart.svelte`, `DonutChart.svelte`, `LineChart.svelte`, `MultiProjectLineChart.svelte`, `ProjectSelector.svelte`, `ColorPicker.svelte` | — |
| 5 | `README.md`, `workspaceManager.ts`, `vaultMeta.ts`, `recoveryManager.ts` | — (rename `docs/auditoria-seguridad.md` → `docs/security-audit.md`) |
