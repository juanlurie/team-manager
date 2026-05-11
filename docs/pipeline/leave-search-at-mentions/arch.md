# Architecture: @-mention Filtering in Leave Search Bar

## Feature Request
> "Use the @ syntax in the search bar of leave to find specific team members to filter on"

## Current Architecture

### Relevant Components

1. **`leave-overview.component.ts`** — The leave overview page. Uses `FilterBarComponent` for search/filtering. Has:
   - `search` signal for raw search text
   - `filteredRecords` and `groups` computeds that currently filter by `memberName`, `type`, `notes`, and `crafts`
   - `TeamMemberService.getAll()` is already injected as `memberSvc`, and `members` signal holds all team members
   - `members` is populated in `ngOnInit` via `memberSvc.getAll({ isActive: true })`

2. **`filter-bar.component.ts`** — Reusable search + filter bar. Has:
   - Plain `<input>` for search text
   - `searchChange` output emitting raw text
   - `searchVal` input for two-way binding
   - Dropdown filter menus for Sprint, Lead, Squad, Craft

3. **`comments.component.ts`** — Already has working `@` mention implementation:
   - `allTeamMembers` signal
   - `mentionActive`, `mentionQuery`, `mentionAtPos`, `mentionSelectedIndex` state
   - `filteredMentions` computed
   - `onInput`, `onKeydown`, `insertMention` event handlers
   - Dropdown overlay positioned below the input

### Data Models

```typescript
TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // ...
}

LeaveRecord {
  id: string;
  teamMemberId: string;
  memberName: string;
  // ...
}
```

## Design Decisions

### Decision 1: Embed mention logic in FilterBarComponent (not LeaveOverview)

**Option A**: Add `@` mention handling to `FilterBarComponent` with an optional `mentionItems` input.
**Option B**: Replace `FilterBarComponent` search input with custom handling in `LeaveOverviewComponent`.

**Chosen: Option A** — The filter-bar is the natural home for search input behavior. Making it mention-aware keeps the leave-overview clean and allows reuse in other features. The mention feature is gated behind an optional input so existing consumers are unaffected.

### Decision 2: Mention data passed as input, not injected

The `FilterBarComponent` receives mention candidates via an optional `mentionItems` input (`{ id: string; label: string }[]`). This keeps the component decoupled from any service. The `LeaveOverviewComponent` maps `TeamMember[]` to `{ id, label }` objects before passing.

### Decision 3: Search emits raw text; filtering happens in parent

The `searchChange` output continues to emit the raw input text (which may include `@Name` syntax). The parent (`LeaveOverviewComponent`) is responsible for:
- Detecting if the search text matches an `@mention` pattern
- Extracting the team member ID
- Using the member ID as an additional filter on `filteredRecords` / `groups`

This keeps the filter-bar simple and the filtering logic centralized.

### Decision 4: Mention dropdown replicates comments pattern

The dropdown UI, keyboard handling (ArrowUp/Down, Enter/Tab, Escape), and text insertion logic mirror the working implementation in `comments.component.ts`. This gives users a consistent `@` experience across the app.

## Changes Required

### FilterBarComponent

1. Add optional inputs:
   - `mentionItems: { id: string; label: string }[]` — team member list for mentions
   - `mentionEnabled: boolean` (default false) — opt-in for mention feature

2. Add mention state:
   - `mentionActive = signal(false)`
   - `mentionQuery = signal('')`
   - `mentionAtPos = 0`
   - `mentionSelectedIndex = 0`
   - `filteredMentions = computed(...)`

3. Modify template:
   - Change `(input)` handler to `onInput($event)` for mention detection
   - Add `(keydown)` handler for keyboard navigation
   - Add mention suggestion dropdown overlay

4. Add methods:
   - `onInput(event)` — detect `@` and set mention state
   - `onKeydown(event)` — ArrowUp/Down/Enter/Escape handling
   - `insertMention(item)` — replace `@query` with `@label` in search value
   - `resetMention()` — clear mention state

### LeaveOverviewComponent

1. Pass `mentionItems` and `mentionEnabled` to `FilterBarComponent`:
   ```html
   <app-filter-bar
     [mentionItems]="mentionMembers()"
     [mentionEnabled]="true"
     ...
   />
   ```

2. Add computed for mention data:
   ```typescript
   mentionMembers = computed(() =>
     this.members().map(m => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))
   );
   ```

3. Update `filteredRecords` and `groups` computeds to detect `@pattern`:
   - Extract `@Name` from search query
   - Find matching team member
   - If match found, filter records by that member's ID
   - Fall through to existing text/craft matching if no `@` match

4. No new services needed — `members` signal already exists.

## Data Flow

```
User types "@Ja" in search
  → FilterBarComponent.onInput()
  → mentionActive = true, mentionQuery = "Ja"
  → filteredMentions = members matching "Ja"
  → Dropdown renders

User selects "Jane Doe"
  → insertMention()
  → search value = "@Jane Doe "
  → searchChange emits("@Jane Doe ")
  → LeaveOverviewComponent.search.set("@Jane Doe ")

filteredRecords / groups computed
  → Detects "@Jane Doe" in search
  → Finds member ID for Jane Doe
  → Filters records where teamMemberId === janeId
  → Renders filtered results
```

## No Database or API Changes

This feature is entirely client-side. The leave records are already loaded client-side. Filtering is done via computed signals. No backend changes are needed.

## Risk Assessment

- **Low risk**: Adding optional inputs to FilterBarComponent won't break existing usage (default false for `mentionEnabled`)
- **Low risk**: Mention overlay is pure CSS/DOM positioning within the filter-bar
- **Edge case**: If user types `@` but doesn't complete a valid mention, it falls through to normal text search
- **Edge case**: If the mention matches a member AND the text also matches something, member filter takes priority (more specific)
