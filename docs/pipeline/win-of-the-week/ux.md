# UX: Win of the Week Feature

## Feature Request
People can nominate wins for the week and then on a Friday voting opens and a winner is chosen.

## User Flow

### 1. Landing on the Page
- URL: `/win-of-the-week`
- A clean, card-style page with a header: trophy icon + "Win of the Week" title
- Below the header, a **phase badge** shows the current status:
  - 🟡 "Nominations Open" (Mon-Thu)
  - 🟢 "Voting Open" (Fri-Sun)
  - 🔴 "Closed — Winner announced!" (after close)

### 2. Nominating Phase (Monday - Thursday)
- A prominent **"+ Nominate a Win"** button in the top-right area
- Clicking opens a dialog with:
  - "Who are you nominating?" — searchable dropdown of team members
  - "Title" — short text input (e.g. "Fixed the production DB issue")
  - "Description" — textarea (optional, max 500 chars)
  - "Submit" / "Cancel" buttons
- Below, a scrollable **list of nominations** for this week:
  - Each card shows: nominee avatar + name, title, description, who submitted it, when
  - A trophy icon next to the nominee name
  - Vote count shows "0 votes" (greyed out — voting not yet open)
  - Cards are sorted by newest first

### 3. Voting Phase (Friday - Sunday)
- The **"+ Nominate a Win"** button is hidden (or disabled with tooltip "Voting is open")
- Each nomination card now shows:
  - A **"Vote" button** (or "Voted ✓" if already voted)
  - Vote count is highlighted in accent color
  - "3 votes remaining" indicator at the top if user hasn't used all votes
- Clicking "Vote" instantly increments the count (optimistic UI) and toggles to "Voted ✓"
- Clicking "Voted ✓" removes the vote
- Voting limit: max 3 votes per person per week
- Cannot vote for your own nomination (button hidden/disabled)
- Toast/snackbar feedback on vote actions

### 4. Closed Phase (After Winner Selected)
- A **winner banner** at the top:
  - Gold crown icon
  - "🏆 [Nominee Name] — [Title]" 
  - "Winner of the Week [date range]" subtitle
  - Background: subtle gold gradient
- All nominations remain visible in read-only mode
- Vote counts are frozen
- A "See you next week!" message at the bottom

### 5. Admin/Lead Actions
- For team leads/admins only, a small gear icon or "Manage" button in the header:
  - "Close Week & Pick Winner" — only available during Voting phase
  - "Open Next Week" — only available when current week is Closed
- These could also be auto-triggered via a background job (future)

### 6. Empty States
- **No nominations yet**: Centered illustration/icon with "No wins nominated yet this week. Be the first to recognise a teammate!"
- **No votes yet**: During voting phase, show "Be the first to vote!" on cards

### 7. Edge Cases
- **Late Friday night**: Voting closes at end of Sunday (user's local time or UTC)
- **Monday morning**: Nominating phase auto-starts when user visits the page
- **User hasn't nominated anyone**: Empty state + prompt to nominate
- **All votes used**: Show "You've used all 3 votes" with checkmark indicators
- **Same nominee multiple times**: Cards listed separately, each can be voted for

## Visual Design
- Follow existing app theme (dark background, Material components)
- Trophy icon (`emoji_events` Material Icon) in gold `#FFD700`
- Phase badge uses coloured pill/chip component
- Nomination cards: border-radius 12px, subtle border, avatar on left
- Vote button: outlined style, fills solid when active
- Winner banner: full-width card with gold border and subtle animation
- Responsive: single column on mobile, two columns on desktop for nomination grid

## Component Structure
```
WinOfTheWeekComponent
├── PhaseBadgeComponent (status chip)
├── AdminActionsComponent (lead-only buttons)
├── NominateButtonComponent
├── NominationListComponent
│   └── NominationCardComponent (avatar, name, title, description, vote button, submitter)
├── WinnerBannerComponent
└── NominateDialogComponent (dialog form)
```
