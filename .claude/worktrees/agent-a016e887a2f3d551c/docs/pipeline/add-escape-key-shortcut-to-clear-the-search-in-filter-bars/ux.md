# UX: Escape Key Shortcut to Clear Search in Filter Bars

## Feature Summary

Pressing **Escape** clears the search text in filter bars, matching the common UX convention. When an @mention dropdown is open, the first Escape closes the dropdown (existing), and a second Escape clears the search text.

## Reference Architecture

See `arch.md` for full technical architecture. Key points:
- `FilterBarComponent` (shared) — used on Features, Team Members, Leave, Sprints, Discussion pages
- `SearchInputComponent` (shared) — standalone search input with clear button
- Escape currently closes @mention dropdown in `FilterBarComponent`; no Escape handling in `SearchInputComponent`
- Consumer components already handle empty search via `searchChange` / `valueChange` outputs — no consumer changes needed

## Current UX Problem

To clear a search, users must either:
1. Click the small X (clear) button inside the input
2. Manually select all text and delete it
3. Click outside the input and re-focus (no effect)

This is inefficient — especially on keyboard-heavy workflows. Escape is the standard shortcut across OS and web (esc to cancel/clear), and its absence is a friction point.

## Design Principles

1. **Consistency with platform convention** — Escape clears search across all filter bars
2. **Preserve existing @mention flow** — one Escape closes the mention dropdown; two Escapes clear search
3. **No visual changes** — clear button remains; Escape is an additional shortcut, not a replacement
4. **Idempotent on empty** — Escape on an empty search does nothing
5. **Event safety** — Escape is never swallowed when search is empty, so other handlers (e.g., closing dialogs/modals) are not blocked

## Interaction Design

### FilterBarComponent (all pages)

| Context | Key Press | Result |
|---|---|---|
| @mention dropdown visible, search non-empty | Escape (1st press) | Closes @mention dropdown. Search text unchanged. |
| @mention dropdown visible, search non-empty | Escape (2nd press) | Clears search text. Resets results to unfiltered state. |
| @mention dropdown closed, search non-empty | Escape (1st press) | Clears search text immediately. |
| Search empty | Escape | Nothing happens. |

**User flow — typical clear:**
1. User types `backend` in the search bar
2. Results filter to items matching "backend"
3. User presses **Escape**
4. Search input clears, results reset to full list
5. Search placeholder reappears

**User flow — @mention then clear:**
1. User types `@` and selects `Jane Smith` from the dropdown
2. @mention chip appears, dropdown closes
3. User presses **Escape**
4. Search clears, all results shown
5. Mention chips disappear along with search text

**User flow — @mention dropdown dismiss (existing behavior preserved):**
1. User types `@` and sees the mention dropdown
2. User presses **Escape** (1st press)
3. Dropdown closes, `@` text remains in input
4. User presses **Escape** (2nd press)
5. Search clears

### SearchInputComponent (standalone use)

| Context | Key Press | Result |
|---|---|---|
| Search non-empty | Escape | Clears search text. Same as clicking the X button. |
| Search empty | Escape | Nothing happens. |

**User flow:**
1. User types in a SearchInputComponent field
2. The clear (X) button appears (existing behavior)
3. User presses **Escape**
4. Input clears, `onChange('')` fires, valueChange emits `''`
5. Clear button disappears (existing reactive behavior)

## Edge Cases and States

| Case | Behavior |
|---|---|
| @mention open + press Escape | Resets mention. Search text unchanged. |
| Search empty + Escape | Nothing happens. Event not swallowed — propagates normally. |
| Multiple @mentions in text + Escape | All cleared along with search text. Consumers call `stripMentions()` for filtering, so emptied search = no text match. |
| User is typing in a dropdown filter menu search + Escape | Not affected — only the main search bar handles Escape. Menu searches are separate inputs. |
| SearchInputComponent bound via `[(ngModel)]` + Escape | Works correctly: `clear()` calls `onChange('')`, integrating with Angular forms. |
| Consumer binds `searchVal` via `input()` and syncs with `effect` | Works correctly: parent receives `searchChange.emit('')`, parent signal is already `''`, effect sees no delta. |
| Mobile / touch keyboard | Escape key exists on iOS/iPadOS keyboard bar. Behavior identical. |
| Screen reader active | Escape clears the input; screen reader will announce the change when results update reactively. |

## Visual Changes

**None.** This is entirely a keyboard interaction change. The existing clear (X) button remains in both components.

## Accessibility

- Escape is a standard, expected keyboard shortcut across web applications
- No new aria attributes or focus management needed
- Screen readers will naturally announce the updated results when search clears and data refilters
- The clear button remains available for mouse/touch users

## Success Metrics

1. Escape clears search in FilterBarComponent on all consumer pages
2. Escape clears search in SearchInputComponent
3. Two-press flow works: 1st press closes @mention dropdown, 2nd press clears search
4. Non-empty search clears, empty search is no-op
5. Clear button still works (regression check)
6. @mention dropdown navigation (ArrowUp/Down/Enter/Escape) still works (regression check)
