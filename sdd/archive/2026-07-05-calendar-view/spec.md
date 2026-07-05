# Calendar View — Specification

## 1. calendar-view

### Requirements

| # | Req | Strength |
|---|-----|----------|
| R1 | Mon–Sun ISO 8601 grid, 6 rows, adjacent-month days muted | MUST |
| R2 | Nodes with startDate OR dueDate appear; no-date nodes excluded | MUST |
| R3 | Same-day start===due → one entry; diff days → two entries | MUST |
| R4 | Cell: title + status dot + icon. Max 3 entries, "+N más" expand/collapse | MUST |
| R5 | Done nodes ≤50% opacity | MUST |
| R6 | ←/→ nav, starts current month, past/future free, year wraps | MUST |
| R7 | Click entry → NodeDetailModal via modalStore.openModal | MUST |
| R8 | Spanish strings: day headers, months, "+N más", "Sin tareas" | MUST |
| R9 | Preserves last-viewed month across view switches | SHOULD |
| R10 | Reflows on resize | SHOULD |

### Scenarios

**S1 Current month** GIVEN nodes with dates in current month WHEN Calendar opens THEN nodes in correct cells, each shows title+dot+icon

**S2 Single date** GIVEN node has only startDate="2026-07-10" WHEN July shown THEN one entry in July 10

**S3 Same-day dedup** GIVEN node has startDate=dueDate="2026-09-01" WHEN Sep shown THEN one entry (not two)

**S4 Split-day entries** GIVEN node has startDate="2026-10-05", dueDate="2026-10-12" WHEN Oct shown THEN entries in Oct 5 AND Oct 12

**S5 No dates** GIVEN node has no startDate and no dueDate WHEN any month THEN never appears

**S6 Empty month** GIVEN no nodes have dates this month WHEN viewed THEN day numbers only, "Sin tareas para este mes"

**S7 Overflow** GIVEN 5 nodes share a date WHEN cell renders THEN 3 + "+2 más" shown WHEN "+2 más" clicked THEN all visible, link toggles to "Mostrar menos"

**S8 Year wrap** GIVEN Dec 2026 WHEN → THEN Jan 2027 (year increments)

**S9 Done dimmed** GIVEN done+active nodes share a date THEN done at ≤50%, active at full

**S10 Click opens modal** GIVEN visible entry WHEN clicked THEN NodeDetailModal opens with that nodeId

**S11 Edit+undo** GIVEN modal changes date WHEN saved THEN snapshot() + mutateTree fire, calendar re-renders node in new cell WHEN undo THEN calendar restores previous state

**S12 Close preserves** GIVEN calendar at March 2026 with expanded cells WHEN modal opens, user Escape THEN month, expanded cells, scroll unchanged

**S13 View switch** GIVEN March 2026 WHEN user goes to tree and back THEN calendar returns to March 2026

**S14 Delete** GIVEN node in calendar WHEN deleted from tree THEN next render removes it

**S15 Resize** GIVEN 1200px WHEN resized to 800px THEN columns shrink, scrollbar appears, no overlap

## 2. node-detail-modal

### Requirements

| # | Req | Strength |
|---|-----|----------|
| R1 | Opens via modalStore.openModal(NodeDetailModal, { nodeId }) | MUST |
| R2 | Editable: startDate, dueDate (date input), status (select), priority (select); title read-only | MUST |
| R3 | "Guardar" → snapshot() + mutateTree(updateNode(...)) | MUST |
| R4 | Close via ✕ or Escape; no mutation if cancelled | MUST |
| R5 | dueDate >= startDate validation if both set | SHOULD |
| R6 | Spanish labels, buttons, validation errors | MUST |

### Scenarios

**S1 Open** GIVEN node clicked in calendar WHEN modalStore.openModal(NodeDetailModal, { nodeId }) THEN title read-only, dates/status/priority editable

**S2 Save** GIVEN modal open, user changes dueDate from "2026-07-15" to "2026-07-20" WHEN "Guardar" clicked THEN snapshot() + mutateTree, modal closes, calendar shows node in July 20

**S3 Cancel** GIVEN modal open with edits WHEN Escape pressed THEN no mutation, calendar unchanged

**S4 Validation** GIVEN startDate="2026-08-10" WHEN user sets dueDate="2026-08-05" and clicks Guardar THEN save blocked, error "La fecha de fin no puede ser anterior a la de inicio"
