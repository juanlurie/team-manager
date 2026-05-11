# UX Design: @-mention Filtering in Leave Search Bar

## Feature Summary
Users can type `@` followed by a team member's name in the leave search bar to see a filtered suggestion list. Selecting a suggestion filters all leave records to show only that team member's entries.

## User Flow

### 1. User Types `@` in the Search Bar
- The user is on the Leave Overview page (calendar or list view)
- They click into the search input field (labeled "Search leave…")
- They type `@`

**Behavior:**
- A dropdown panel appears immediately below the search input
- The panel shows the full list of active team members (up to 10), each prefixed with a `@` icon
- The first item in the list is highlighted by default

### 2. User Types More Characters After `@`
- As the user continues typing (e.g., `@ja`), the dropdown filters to show only members whose first name, last name, or full name matches the typed query
- Filtering is case-insensitive
- The list shows a maximum of 10 results at a time

### 3. User Selects a Team Member
**Three ways to select:**
1. **Click/tap** on a member name in the dropdown
2. **Press Enter** while a member is highlighted (via keyboard navigation)
3. **Press Tab** while a member is highlighted

**After selection:**
- The search input displays `@FirstName LastName` with a trailing space
- The dropdown closes
- The leave records are immediately filtered to show only records for that team member
- Other filters (Sprint, Lead, Squad, Craft) remain active and work in conjunction

### 4. User Can Navigate the Dropdown with Keyboard
- **Arrow Down**: Move highlight to the next member (wraps to first if at end)
- **Arrow Up**: Move highlight to the previous member (wraps to last if at start)
- **Enter/Tab**: Select the highlighted member
- **Escape**: Close the dropdown without selecting, return to normal search

### 5. User Can Modify or Remove the Member Filter
- Typing additional text after `@Name` continues to filter by the selected member AND any additional text
- Deleting the `@Name` text removes the member-specific filter and falls back to free-text search

### 6. No Match Case
- If the `@` query matches no team members, the dropdown shows an empty state (no panel or an empty panel — same as comments behavior)
- The text filter falls through to the existing search behavior (matching by name, type, notes, crafts)

## Visual Design

### Mention Dropdown
| Property | Value |
|----------|-------|
| Position | Below the search input, aligned left, with a 4px gap |
| Width | Same as the search input |
| Max height | Auto (fits visible items, up to ~300px) |
| Background | `#1e2a3a` (same as comments mention dropdown) |
| Border | `1px solid rgba(255,255,255,0.12)` |
| Border radius | 8px |
| Shadow | `0 4px 16px rgba(0,0,0,0.4)` |
| Z-index | 100 (above other page content) |

### Dropdown Item
| Property | Default | Hover/Highlighted |
|----------|---------|-------------------|
| Padding | `6px 12px` | — |
| Background | Transparent | `rgba(100,181,246,0.15)` |
| Cursor | Pointer | Pointer |
| Font size | 0.78rem | 0.78rem |

### @ Icon Prefix
- Displayed as a `@` character in `#64b5f6` blue color before each member's name
- Font weight: 500

### Search Input
- No visual change to the input itself
- The `@Name` text appears as regular text in the input
- The mention relationship is implicit (not visually highlighted in the input)

## States

### Default State
- Search input is empty or contains regular text
- No mention dropdown shown
- All records are displayed (subject to other filters)

### Mention Active State
- Search input contains `@` with or without trailing characters
- Mention dropdown is displayed
- Records are not yet filtered by member (only after selection)

### Mention Selected State
- Search input contains `@FirstName LastName`
- Mention dropdown is closed
- Records are filtered to show only the selected member's entries

### No Results State
- `@` query typed but no matching team members found
- Dropdown is empty or hidden
- Records are filtered by the raw text (fallback behavior)

### Error / Edge Cases

| Scenario | Behavior |
|----------|----------|
| User types `@` at the end of existing search text | Mention triggers from the last `@` symbol |
| User types multiple `@` symbols | Only the last `@` is treated as a mention trigger |
| User pastes text containing `@` | If cursor is at the end of pasted text and there's a `@` before cursor, mention triggers |
| User types a space after `@` | Mention deactivates (space closes the mention mode) |
| Team member is no longer active | Active members are fetched on init; inactive members won't appear |
| User selects a member, then types more text | Both the member filter AND text filter are applied |
| Mobile/touch devices | Dropdown items are tappable; same behavior as click |

## Accessibility Considerations
- Dropdown items are navigable via keyboard (Tab/Arrow keys)
- Escape closes the dropdown
- The selected state is visually indicated with background color change
- No aria attributes required for this iteration (small internal tool)

## Consistency with Existing Patterns
- The mention UI, colors, and interaction directly replicate the working `@` mention pattern in `CommentsComponent`
- Users who have used `@` in comments will immediately recognize the same pattern in the search bar
