# UX: @Mention Search Filtering Across All Search Bars

## Feature Request

Make sure all search bars search by the @mention name and apply the filter.

## Reference Architecture

See `arch.md` for full technical architecture. Key points:
- `FilterBarComponent` emits raw search text including @mentions
- `AllFeaturesComponent` and `TeamListComponent` strip mentions but don't use them for filtering
- `LeaveOverviewComponent` already uses mentions to filter correctly (reference implementation)
- Need to make Features page and Team Members page use @mentions for actual filtering

## Current UX Problem

The @-mention feature in the search bars currently works in two places:

| Page | @Mention UI | Filters By @Mention |
|------|-------------|---------------------|
| **Features** | ✅ Shows dropdown, chips, removal | ❌ Strips mention, no filter applied |
| **Team Members** | ✅ Shows dropdown, chips, removal | ❌ Strips mention, no filter applied |
| **Leave** | ✅ Shows dropdown, chips, removal | ✅ Filters correctly |

**User Impact**: Users who type `@John Doe` in the Features or Team Members search bar see the mention chip appear, but the results are NOT filtered by John. This creates a confusing experience where the UI suggests the feature works but it doesn't actually apply.

## Design Principles

1. **Consistency across all search bars** — same @mention behavior everywhere
2. **Progressive enhancement** — @mention filter combines naturally with plain-text search
3. **Transparency** — user should see exactly who they're filtering by (already handled by existing chip UI)
4. **Backward compatibility** — existing plain-text search continues to work

## Interaction Design

### Features Page — @Mention Filtering

**Current behavior:**
- User types `@Jane Smith` in search bar
- Mention chip appears showing @Jane Smith
- Search strips mention text → empty query
- All features shown (no filter applied)

**Target behavior:**
- User types `@Jane Smith` in search bar
- Mention chip appears showing @Jane Smith
- Search strips mention → empty query + mentions parsed
- Features filtered to only show those with tasks assigned to Jane Smith
- If user also types text after mention (e.g., `@Jane Smith bug`), filters combine: show features with tasks assigned to Jane AND task title/description matches "bug"

### Team Members Page — @Mention Filtering

**Current behavior:**
- User types `@Jane Smith` in search bar
- Mention chip appears showing @Jane Smith
- Search strips mention → empty query
- All members shown (no filter applied)

**Target behavior:**
- User types `@Jane Smith` in search bar
- Mention chip appears showing @Jane Smith
- Search strips mention → empty query + mentions parsed
- Members filtered to only show Jane Smith
- If user types text after mention (e.g., `@Jane Smith dev`), filters combine: show members matching Jane AND members with craft matching "dev"

### Leave Page

Already works correctly — no UX changes needed.

## Edge Cases and States

### Search with multiple @mentions
- `@Jane Smith @Bob Jones` → filter by BOTH Jane Smith AND Bob Jones (union/OR)
- Features: show features with tasks assigned to either Jane or Bob
- Team Members: show members matching either Jane or Bob

### Search with @mention + plain text
- `@Jane Smith backend` → AND filter: mentioned person(s) + text search
- Features: tasks assigned to Jane AND title/ref containing "backend"
- Team Members: match Jane AND craft/role containing "backend"

### @mention with no results
- Mention resolves to a valid member but no data matches → show empty state
- Existing "No features found" / "No members found" empty states apply

### Partial @mention typing
- `@Ja` → autocomplete dropdown appears (existing behavior, unchanged)
- Before selection, no mention is active → no mention filter applied

### Removing a mention chip
- Clicking X on chip removes the @mention from search text
- Filter updates immediately to exclude that person
- If no mentions remain, falls back to plain-text search

## Visual Changes

**No visual changes needed.** The existing FilterBarComponent UI already:
- Shows @mention autocomplete dropdown
- Shows mention chips below search input
- Allows chip removal
- Shows placeholder text

The only change is internal: the consumer components now act on the @mention data.

## Accessibility

- @mention dropdown is keyboard-navigable (already implemented via ArrowDown/ArrowUp/Enter/Escape)
- Mention chips are focusable and removable
- Screen readers will announce filter changes when results update

## Success Metrics

1. @mention chips in Features search actually filter features by task assignee
2. @mention chips in Team Members search actually filter members by name
3. Plain-text search still works when no @mentions are present
4. Combined @mention + text search works correctly
5. Leave page continues to work (regression check)

## Implementation Notes for Developers

- **Features page**: Parse @mentions from raw search → extract assignee names → filter features whose tasks have matching assignees
- **Team Members page**: Parse @mentions from raw search → extract member names → filter members whose full name matches
- Use the existing team members data already loaded via `TeamMemberService.getAll()` for name resolution
- Keep `stripMentions()` for plain-text portion of search
- Apply mention filter AND text filter together
