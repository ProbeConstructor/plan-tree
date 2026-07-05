# Proposal: Calendar View

## Intent

Users need to see tree nodes organized by date. The tree view is hierarchical; the dashboard shows a basic overdue/upcoming list. A monthly calendar grid lets users navigate dates visually and edit node dates contextually without switching to the tree.

## Scope

### In Scope
- Monthly calendar grid (Mon–Sun, ISO 8601 week start)
- Nodes with `startDate` or `dueDate` appear in corresponding cells
- Cell: title + status dot + icon; overflow truncated at 3 with "+N más"
- Done nodes shown but dimmed (reduced opacity)
- Left/right month navigation; starts on current month
- Spanish month/day names
- Click node → modal to view/edit node details (dates, status, priority) with undo snapshot
- Sidebar button "📅 Calendario" to switch view
- Add `"calendar"` to `View` union type in `viewStore.ts`

### Out of Scope
- Drag & drop, recurring events, external calendar integration
- Week or day views, creating nodes from calendar
- Calendar export or printing

## Capabilities

### New Capabilities
- `calendar-view`: Monthly grid with date-grouped nodes, month navigation, overflow expansion, deduplication of same-day start/due
- `node-detail-modal`: Shared modal for viewing/editing node fields (dates, status, priority, icon) from calendar and future views

### Modified Capabilities
- None

## Approach

1. Extend `View` union: `"tree" | "dashboard" | "calendar"` in `viewStore.ts`
2. Add "📅 Calendario" button to `Sidebar.svelte` → calls `currentView.set("calendar")`
3. Add `{:else if $currentView === "calendar"}` + `<Calendar />` branch in `App.svelte`
4. Create `src/pages/Calendar.svelte`: monthly grid, reads `$tree` reactively, derives date-grouped node list
5. Create `src/utils/calendarUtils.ts`: `getMonthDays(year, month)` → 2D grid, `groupNodesByDate(tree)` → `Map<string, TreeNode[]>`, deduplicates when `startDate === dueDate`
6. Create `src/modals/NodeDetailModal.svelte`: form with date inputs, status/priority selects, reuses `snapshot()` + `mutateTree(updateNode(...))` from `useNodeActions.ts` pattern
7. Calendar cells: show up to 3 node entries, "+N más" button expands full day list inline or via modal

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/stores/viewStore.ts` | Modified | Add `"calendar"` to View type |
| `src/components/Sidebar.svelte` | Modified | Add calendar navigation button |
| `src/App.svelte` | Modified | Add calendar view render branch |
| `src/pages/Calendar.svelte` | New | Monthly calendar grid component |
| `src/utils/calendarUtils.ts` | New | Calendar math + date grouping logic |
| `src/modals/NodeDetailModal.svelte` | New | Node editing modal for calendar context |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Many nodes in single day hurts render perf | Med | Cap visible entries at 3, lazy-render expanded list |
| Same-day start/due double-counted | Low | `groupNodesByDate` deduplicates by node ID per date key |
| Empty month renders broken grid | Low | Always render 6-week grid; empty cells show muted placeholder |
| Modal double-wrapping bug (existing) | Low | `NodeDetailModal` exports slot content only; `ModalHost` provides the `<Modal>` wrapper |

## Rollback Plan

1. Remove `"calendar"` from View union → restores original type
2. Delete `Calendar.svelte`, `calendarUtils.ts`, `NodeDetailModal.svelte`
3. Remove sidebar button and App.svelte calendar branch
4. No data migration needed — all state lives in treeStore

## Dependencies

- None. Pure frontend Svelte/TypeScript. No new Rust commands or npm deps.

## Success Criteria

- [ ] Calendar renders correct month grid with 6-row ISO 8601 layout
- [ ] Nodes with dates appear in correct day cell; same-day start/due produce one entry
- [ ] Clicking a node opens NodeDetailModal with editable fields
- [ ] Editing in modal calls `snapshot()` before `mutateTree()` — undo works
- [ ] Month ←/→ navigation works; cannot go before current month? (decision: allow past/future freely)
- [ ] "+N más" appears when >3 entries in a cell, expands on click
- [ ] Done nodes render at ≤50% opacity
- [ ] All strings (month names, day headers, overflow label) in Spanish
