# Architecture: @Mention Search Filtering Across All Search Bars

## Feature Request

Make sure all search bars search by the @mention name and apply the filter.

## Current State

The application has a shared `FilterBarComponent` that provides @-mention support with:
- An autocomplete dropdown that appears when `@` is typed
- Chip display for active mentions below the search input
- Removal of mentions via chip close button
- Emits raw search text (including @mentions) via `searchChange` output

Three consumer components use the filter bar with search:

### 1. AllFeaturesComponent (Features page)
- Receives search text via `searchChange -> search.set($event)`
- Uses `stripMentions(rawQ)` to strip @mentions then does plain-text search against: title, externalTicketRef, sprintName, piName, task title, task assignee
- **Problem**: @mentions are stripped but never used for filtering. If a user types `@John Doe`, the mention is stripped and the remaining empty string matches everything.

### 2. TeamListComponent (Team Members page)
- Receives search text via `searchChange -> memberSearch.set($event)`
- Uses `stripMentions(memberSearch)` to strip @mentions then searches by member full name
- **Problem**: @mentions are stripped and not used. The mention feature is essentially decorative.

### 3. LeaveOverviewComponent (Leave page)
- Receives search text via `searchChange -> search.set($event)`
- Has a `mentionMemberIds` computed property that parses @mentions and resolves member IDs
- In `filteredRecords` and `groups`: if mention IDs exist, filters records by those IDs; otherwise falls back to text search
- **Already works correctly** - this is the reference implementation.

## Proposed Solution

### For AllFeaturesComponent (Features page)
1. Add a computed property `mentionAssigneeNames` that extracts @mentioned names from the raw search text and returns them as a set of full names
2. In `activeFiltered`, when mention assignee names exist, filter features whose tasks have an assignee matching any mentioned name
3. Keep the existing `stripMentions` plain-text search for non-mention text, so both can work together (e.g. `@John Doe bug` would filter by John's tasks matching "bug")

### For TeamListComponent (Team Members page)
1. Add a computed property `mentionMemberNames` that extracts @mentioned names from the raw search text
2. In `filteredMembers`, when mention names exist, filter members whose full name matches the mentioned names
3. Keep `stripMentions` for plain-text search as a fallback when no mentions are present

### For LeaveOverviewComponent (Leave page)
- Already working correctly - verify no changes needed beyond confirming consistency

### For FilterBarComponent (Shared)
- No changes needed - already correctly emits raw search text with @mentions intact

## Data Flow

```
User types "@Jane" in search bar
  → FilterBarComponent detects @mention, shows dropdown, resolves to "Jane Smith"
  → User selects "Jane Smith"
  → FilterBarComponent inserts "@Jane Smith " into search text, emits via searchChange
  → Consumer component:
      1. Parses @mentions from raw search text → resolves to person IDs/names
      2. Applies mention-based filter (filter by that person)
      3. Strips mentions for remaining plain-text search
      4. Combines both filters (AND logic)
```

## Key Components

| Component | File | Action Needed |
|-----------|------|---------------|
| AllFeaturesComponent | `team-manager-ui/src/app/features/all-features/all-features.component.ts` | Add mention parsing + filtering by task assignee |
| TeamListComponent | `team-manager-ui/src/app/features/team/team-list/team-list.component.ts` | Add mention parsing + filtering by member name |
| LeaveOverviewComponent | `team-manager-ui/src/app/features/leave/leave-overview/leave-overview.component.ts` | No changes needed (already works) |
| FilterBarComponent | `team-manager-ui/src/app/shared/components/filter-bar/filter-bar.component.ts` | No changes needed |

## Team Member Name Resolution

Both AllFeaturesComponent and TeamListComponent already load `TeamMemberService.getAll()` on init. The mention parsing needs to:
1. Extract `@Name Surname` tokens from raw search text
2. Match against loaded team members' full names (`firstName + ' ' + lastName`)
3. Use the resolved names/IDs for filtering

## Consistency Check

Ensure all three consumers follow the same pattern for @mention handling:
- Parse mentions from raw search text before stripping
- Apply mention filters (AND with any plain-text search)
- Fall back to plain-text search when no mentions present
