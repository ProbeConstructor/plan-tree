# Archive Report: Calendar View

**Change**: calendar-view
**Archived at**: 2026-07-05
**Archive path**: `sdd/archive/2026-07-05-calendar-view/`

## Change Summary

Added a monthly calendar grid accessible from the sidebar, showing tree nodes organized by their startDate/dueDate. Clicking a node opens a modal to edit its dates, status, and priority.

## Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Proposal | `sdd/archive/2026-07-05-calendar-view/proposal.md` | ✅ Done |
| Spec | `sdd/archive/2026-07-05-calendar-view/spec.md` | ✅ Done |
| Design | N/A (implemented directly from spec) | ⚠️ Not persisted as formal SDD artifact |
| Tasks | N/A (implemented directly from spec) | ⚠️ Not persisted as formal SDD artifact |
| Verify Report | N/A (verification done inline) | ⚠️ Not persisted as formal SDD artifact |

## Files Created

- `src/utils/calendarUtils.ts` — `getMonthGrid`, `groupNodesByDate`, `formatMonthYear`, `getWeekDays`, `isToday`, `getStatusDotColor`, `getCellDisplayInfo`
- `src/utils/calendarUtils.test.ts` — 32 tests for calendar utilities
- `src/pages/Calendar.svelte` — Monthly calendar grid with navigation, overflow, today highlight
- `src/pages/Calendar.test.ts` — 7 integration tests
- `src/modals/NodeDetailModal.svelte` — Node editing modal with buffered state, validation, null guard
- `src/modals/NodeDetailModal.test.ts` — 13 tests (7 unit + 6 component)

## Files Modified

- `src/stores/viewStore.ts` — Added `"calendar"` to `View` type
- `src/components/Sidebar.svelte` — Added "📅 Calendario" button
- `src/App.svelte` — Added calendar render branch
- `vitest.config.ts` — Added `allowOnly: false`

## Verification Results

- **125 tests pass** (existing + new)
- **0 type errors** (`svelte-check && tsc`)
- **31/32** spec requirements compliant
- **strict_tdd**: active (tests alongside code)

## Known Gaps

1. **View persistence across remount** (S13 in spec — SHOULD-level, not MUST): Calendar does not remember the last-viewed month when switching away and back. Requires a store to persist `currentMonth` state. Filed as deferred enhancement.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Standalone Calendar.svelte (not within tree) | Cleaner separation; tree layout algorithm conflicts with grid layout |
| Modal via modalStore.openModal | Reuses existing modal infrastructure; avoids reinventing overlay logic |
| Dedup by nodeId per date key | Same-day start===due produces one entry; diff days produce two |
| 3-entry cap with "+N más" overflow | Balances density with readability; matches common calendar UX pattern |
| Spanish locale for strings | Consistent with existing project convention (all UI in Spanish) |
| Past/future navigation unrestricted | More flexible; users may want to check dates in past or far future |
| Done nodes at ≤50% opacity | Provides visual closure without hiding completed work |

## Recommendations

1. **Consider adding `calendarMonth` to `viewStore.ts`** to persist the last-viewed month across view switches (addresses S13 gap)
2. **Formalize SDD artifact persistence** — the implementation pipeline skipped intermediate artifacts (design, tasks, verify-report on disk). Consider adopting OpenSpec convention (`openspec/`) for future changes to get a full audit trail.
3. **No further active development needed** on this change — scope is complete and verified.
