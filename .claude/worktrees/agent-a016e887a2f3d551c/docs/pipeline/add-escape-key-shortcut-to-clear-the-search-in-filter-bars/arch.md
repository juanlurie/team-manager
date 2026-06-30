# Add Escape Key Shortcut to Clear Search in Filter Bars

## Problem

Users have to manually delete text or click a clear button to reset search in filter bars. This is inefficient and inconsistent with common UX patterns where Escape clears search inputs.

## Scope

Two shared components need changes:

| Component | File | Current Escape behavior |
|---|---|---|
| `FilterBarComponent` | `shared/components/filter-bar/filter-bar.component.ts` | Closes @mention dropdown only |
| `SearchInputComponent` | `shared/components/search-input/search-input.component.ts` | None (has a clear button via `(click)`) |

## Proposed Behavior

| Context | Escape pressed | Result |
|---|---|---|
| @mention dropdown visible | 1st press | Close dropdown (existing), keep search text |
| @mention dropdown visible | 2nd press | Clear search text (new) |
| Search non-empty, no dropdown | 1st press | Clear search text (new) |
| Search empty | 1st press | Nothing |

## Solution Design

### FilterBarComponent

Modify `onSearchKeydown()` so that `event.key === 'Escape'` falls through to a new clear-search branch when the mention dropdown is not active:

```
onSearchKeydown(event):
  if mentionActive AND filteredMentions.length > 0:
    if key === ArrowDown/Up/Enter/Tab:  handle nav, return
    if key === 'Escape':                resetMention(), return  // unchanged

  // NEW: clear search on Escape when mention dropdown is not interfering
  if key === 'Escape' AND search text is non-empty:
    preventDefault()
    search.set('')
    searchChange.emit('')
```

Key detail: the existing Escape handler for mentions `return`s, so the new code only runs when mentions were not active. This preserves the two-press flow.

### SearchInputComponent

Add a `(keydown)` listener on the `<input>` element to handle Escape:

```
if key === 'Escape' AND value() is non-empty:
  event.preventDefault()
  clear(event)  // reuse existing clear method
```

## Data Flow

```
Escape keydown
  │
  ├─ FilterBarComponent.onSearchKeydown()
  │     │
  │     ├─ mentionActive? → resetMention(), return
  │     │
  │     └─ search non-empty? → search.set(''), searchChange.emit('')
  │                            → parent search signal resets
  │                            → parent computed properties recalc
  │
  └─ SearchInputComponent keydown handler
        │
        └─ value non-empty? → clear() → value.set(''), onChange(''), valueChange.emit('')
```

Both components emit empty string to their respective outputs, which consumers use to reactively update filtered data. No consumer component changes needed — they already handle `search.set($event)` or `valueChange` via their bindings.

## Edge Cases

| Case | Behavior |
|---|---|
| @mention open + press Escape | Resets mention. Search text unchanged. |
| Search empty + Escape | Nothing happens. Event not swallowed. |
| Multiple @mentions in text + Escape | All cleared along with search text. Consumers use `stripMentions()` internally for filtering, so cleared search = no text match. |
| Consumer has `searchVal` bound via `input()` and syncs with `effect` | Works correctly: effect will re-set `search` signal from the new parent value, but since the parent already received `searchChange.emit('')`, parent is already at empty and synced. |
| SearchInputComponent used with `ControlValueAccessor` | Works correctly: clear() already calls onChange and integrates with Angular forms. |

## Files to Modify

1. `team-manager-ui/src/app/shared/components/filter-bar/filter-bar.component.ts` — `onSearchKeydown()` method
2. `team-manager-ui/src/app/shared/components/search-input/search-input.component.ts` — template and handler

## Files NOT to Modify

- Consumer components (all-features, team-list, leave-overview, sprints, discussion) — no changes needed
- `QuickOpenDialogComponent` — already handles Escape to close dialog (different UX)
