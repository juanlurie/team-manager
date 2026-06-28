# Session Self-Service Booking — UX Document

## Design System Conventions

This document assumes the existing codebase visual language:
- **Background**: `#0f1117`, text `#e0e0e0`, Geist font
- **Cards**: `.section` panels with `rgba(255,255,255,0.03) background` and `rgba(255,255,255,0.06) border`
- **Chips**: Pill‑style `.chip` with `.chip.active` using `color-mix` against location/type colors
- **Badges**: `.status-badge` — `.status-open` (green), `.status-filled` (blue), `.status-cancelled` (gray), `.status-confirmed` (gold)
- **Week nav**: `‹` / `›` circle buttons, week label, 5‑day Mon–Fri columns
- **Grid cell**: 64×28px, `rgba(255,255,255,0.04)`, selected cells get `--sel-color` via `color-mix`
- **Slot card**: `.slot-card` with `.slot-booked` / `.slot-mine` modifiers
- **Avatar**: 32px circle, initials, `rgba(255,255,255,0.08)`
- **Progress bar**: 3px tall, `rgba(100,181,246,0.5)` fill
- **Actions**: `mat-stroked-button` / `mat-raised-button color="primary"`, Material Icons

---

## 1. User Flow Diagrams

### Step 1 — Session Catalog (Lead Creates Catalog Item)

```
[ /catalog ]                      [ /catalog/create ]
   │                                    │
   │  ┌─ empty state ──────────┐        │  Basic Info section
   │  │ No catalog items yet   │        │   - Name (text input, max 200)
   │  │ "Create the first      │        │   - Description (textarea, max 2000, optional)
   │  │  session catalog item"  │        │
   │  └────────────────────────┘        │  Participants section
   │                                    │   - Mandatory (searchable multi-select)
   │  ┌─ populated list ───────┐        │   - Optional (searchable multi-select)
   │  │ Session Card 1         │        │
   │  │  · name + description   │        │  [Save] → POST → redirect to /catalog/:id
   │  │  · mandatory: 4        │        │
   │  │  · optional: 2         │        └──────────────┘
   │  │  · slots: 0            │                      
   │  │  · [View] [Delete]     │        [ /catalog/:id ]
   │  │ Session Card 2         │           │
   │  │  ...                   │           │  Header
   │  │ [+ Create Catalog Item]│           │   - Name, description
   │  └────────────────────────┘           │   - [Edit] [Delete] [Back]
   │                                      │
   └──────────────────────────────────────┤  Participants list
                                          │   - Mandatory section (name chips)
                                          │   - Optional section (name chips)
                                          │
                                          │  Slots summary
                                          │   - Count and fill ratio
                                          │   - [Create Slots] → /catalog/:id/slots
                                          │   - [Book Slots] → /catalog/:id/book
                                          │
                                          │  Slot list (read-only)
                                          │   - Each slot: date, time, location, bookings/mandatory
                                          └──────────────────────────────────┘
```

### Step 2 — Slot Creation by Lead

```
[ /catalog/:id ] → [ /catalog/:id/slots ]
                          │
                     Header
                      - Session name
                      - [Back]
                      
                     Active Location chips (color-coded, same as meeting-form-dialog)
                     
                     Week nav (‹ Week of May 18, 2026 ›)
                     
                     Time grid (same grid as meeting-form-dialog)
                      - Click empty cell → highlights with location color
                      - Click selected cell → deselects
                      - Duration fixed at 30m per cell
                     
                     Summary bar
                      - Location counts: "Room A: 4, Room B: 2"
                      - [Clear all]
                      
                     [Save Slots] → POST /api/v1/session-definitions/{id}/slots
                         → Grid re-renders, now showing created slot blocks
                         → Toast: "3 slots created"
                          │
                          ▼
                     Grid switches to view mode
                      - Slots shown as colored blocks (location color)
                      - Each slot: time, location dot
                      - [Create More] → back to create mode
                      - [Back to Detail] → /catalog/:id
```

### Step 3 — Self-Service Booking

```
[ /catalog/:id ] → [ /catalog/:id/book ]
                          │
                     Header
                      - Session name
                      - Participant counts: "Mandatory: 4 · Optional: 2"
                      - [Back]
                      
                     Week nav (‹ Week of May 18, 2026 ›)
                     
                     Time grid (view/book mode)
                      - Slots rendered as colored blocks (location color)
                      
                      Slot states within grid:
                      ┌──────────────────────────────────────┐
                      │ Available (empty)     "Book →"       │
                      │ Partially booked      "2/4 booked"   │
                      │ Fully booked          "✓ Confirmed"  │
                      │ My booking            "You" (highlighted) │
                      └──────────────────────────────────────┘
                      
                     Legend
                      - Each location shown with its color dot
                          
                     Click flow:
                      - Click available slot → POST /book → grid updates
                      - Click "You" slot → DELETE /book → grid updates
                      - Click confirmed slot → nothing (disabled)
```

### Step 4 — Auto-Fill (Automatic, No Dedicated Screen)

Happens server-side after each book/unbook. UI reflects `IsConfirmed` in real time:
- When all mandatory participants have booked a slot → gold "Confirmed ✓" badge appears on that slot block in the grid
- When a mandatory participant unbooks and the set is no longer complete → badge disappears, count updates

---

## 2. Wireframe Descriptions

### 2A. Session Catalog List Page (`/catalog`)

```
┌────────────────────────────────────────────────────────────┐
│  Session Catalog                         [+ Create Item]  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  <empty state — 3 cards shown below when populated> │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [🔵 4 mandatory / 2 optional]  Sprint Planning     │  │
│  │  Plan the upcoming sprint backlog                   │  │
│  │  3 slots · 2/4 mandatory filled          [View] 🗑  │  │
│  │  ▓▓▓▓▓░░░░░  (progress bar: 50%)                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [🔵 2 mandatory / 0 optional]  Retrospective       │  │
│  │  Team retro for the sprint                          │  │
│  │  0 slots · 0/2 mandatory filled          [View] 🗑  │  │
│  │  ░░░░░░░░░░  (progress bar: 0%)                     │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Elements:**
- Page title "Session Catalog" (h2)
- "[+ Create Item]" button → `mat-raised-button color="primary"` with `add` icon
- Each card is a `.session-card` (same as meeting-planner) — clickable → navigates to detail
- Card content: participant count badge, name, description (truncated), slot count, mandatory fill ratio, progress bar
- Action: [View] button (visible on hover/always), delete icon button
- Empty state: centered icon (`list_alt`), "No catalog items yet", "Create the first session catalog item to get started"

### 2B. Session Catalog Create Page (`/catalog/create`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Back  Create Catalog Item                              │
│                                                           │
│  ┌─ BASIC INFO ─────────────────────────────────────────┐ │
│  │  Name [_____________________________]                │ │
│  │  Description [______________________________        │ │
│  │               _______________________________]        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─ PARTICIPANTS ───────────────────────────────────────┐ │
│  │                                                       │ │
│  │  Mandatory Attending                                  │ │
│  │  [app-searchable-multi-select                         │ │
│  │   placeholder="Search team members..."]               │ │
│  │                                                       │ │
│  │  Selected: [Alice] [Bob] [Charlie] [×]               │ │
│  │                                                       │ │
│  │  Optional Attending                                   │ │
│  │  [app-searchable-multi-select                         │ │
│  │   placeholder="Search team members..."]               │ │
│  │                                                       │ │
│  │  Selected: [Diana] [Eve] [×]                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│                          [Cancel]  [Save Catalog Item]    │
└────────────────────────────────────────────────────────────┘
```

**Elements:**
- Back button → `/catalog`
- Title: "Create Catalog Item" (h2)
- Section 1: Basic Info — two `mat-form-field` inputs (name required, description optional)
- Section 2: Participants — two `app-searchable-multi-select` components fed from `TeamMemberService`
  - Mandatory labeled 🔵 indicator, Optional labeled 🟢 indicator
  - Selected members shown as chips below each select
- Actions: [Cancel] `mat-stroked-button` → back to list; [Save Catalog Item] `mat-raised-button color="primary"` → disables when name empty
- On success: redirect to `/catalog/:id`, snackbar "Catalog item created"

**States:**
- Form validation error: red text below the field, "Name is required"
- API error: snackbar "Failed to create catalog item"
- Loading: spinner replacing the save button during submit

### 2C. Session Catalog Detail Page (`/catalog/:id`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Catalog                                         │
│                                                           │
│  Sprint Planning                          [Edit] [Delete] │
│  ─────────────────────────────────────────                 │
│  Plan the upcoming sprint backlog                         │
│                                                           │
│  Created by Alice · May 13, 2026                          │
│                                                           │
│  ┌─ PARTICIPANTS ───────────────────────────────────────┐ │
│  │  Mandatory (4)    [Alice] [Bob] [Charlie] [David]    │ │
│  │  Optional (2)     [Diana] [Eve]                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─ SLOTS ──────────────────────────────────────────────┐ │
│  │  3 slots · 2/4 mandatory filled                      │ │
│  │                                                       │ │
│  │  [Create Slots]  [Book Slots]                        │ │
│  │                                                       │ │
│  │  ┌──────────────────────────────────────────┐        │ │
│  │  │  Slot list (horizontal scroll or list):   │        │ │
│  │  │  Mon May 18 · 09:00–09:30 · Room A       │        │ │
│  │  │  2/4 mandatory — 1 booked                │        │ │
│  │  │  ──────────────────────────────────────  │        │ │
│  │  │  Mon May 18 · 10:00–10:30 · Room B       │        │ │
│  │  │  2/4 mandatory — 0 booked                │        │ │
│  │  └──────────────────────────────────────────┘        │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Elements:**
- Back → `/catalog`
- Header: item name (h2), [Edit] and [Delete] action buttons
- Metadata: created by, date
- Participants section: two groups — Mandatory (with count), Optional (with count), each member shown as a `.chip`
- Slots section: summary line, two CTA buttons, then slot list
- Empty slots state: "No slots created yet" with [Create Slots] CTA prominent
- Each slot row: date, time range, location name, fill count, confirmed badge (if confirmed)

### 2D. Lead Slot Creation Page (`/catalog/:id/slots`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Detail                                          │
│  Sprint Planning — Create Time Slots                       │
│                                                           │
│  Active Location                                           │
│  [Room A] [Room B] [Room C] [🏠 Remote]                   │
│                                                           │
│                  ‹  Week of May 18, 2026  ›               │
│                                                           │
│  ┌────────────────────────────────────────────────────────┐│
│  │      Mon      Tue      Wed      Thu      Fri          ││
│  │      18       19       20       21       22           ││
│  │                                                       ││
│  │ 07:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │    │ │    │ │    │ │    │ │    │            ││
│  │ 07:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │ 08:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │ ██ │ │    │ │ ██ │ │    │ │    │            ││
│  │ 08:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │ 09:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │ ██ │ │    │ │ ██ │ │    │ │    │            ││
│  │ 09:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │ 10:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │    │ │    │ │    │ │    │ │    │            ││
│  │ 10:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │  ...                                                  ││
│  └────────────────────────────────────────────────────────┘│
│                                                           │
│  Room A: 2  Room B: 0  Room C: 0  Remote: 0              │
│                      3 slots selected  [Clear all]        │
│                                                           │
│                          [Cancel]  [Save 3 Slots]         │
└────────────────────────────────────────────────────────────┘
```

**Elements:**
- Back → `/catalog/:id`
- Header: session name + "Create Time Slots" subtitle
- Location chips: same pattern as `meeting-form-dialog` — `.chip.loc-chip` with `--loc-color`, click to set active location
- Week nav: `‹` / `›` nav buttons + "Week of ..." label
- Time grid: reuses `BookingGridComponent` in `create` mode
  - Empty cells are clickable, show subtle border on hover
  - Selected cells fill with `color-mix(in srgb, var(--loc-color) 30%, transparent)` and get a colored border
  - Duration: 30m per cell (no duration picker — implicit)
- Summary bar: per-location counts with location color dots, total count, [Clear all] link
- Actions: [Cancel] → back to detail; [Save N Slots] → disabled when no slots selected, shows count
- After save: grid switches to `view` mode showing created blocks, button becomes [Create More]

**States:**
- No location selected: chips present, first location auto-selected
- No slots selected: summary shows "No slots selected", save button disabled
- After save success: toast "N slots created", grid re-renders with existing slots as colored blocks
- API error: snackbar "Failed to create slots"
- Existing slots shown: when re-entering page, pre-existing slots render as colored blocks in view mode

### 2E. Self-Service Booking Page (`/catalog/:id/book`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Detail                                          │
│  Sprint Planning — Book Your Slots                         │
│  Mandatory: 4 · Optional: 2                               │
│                                                           │
│                  ‹  Week of May 18, 2026  ›               │
│                                                           │
│  ┌────────────────────────────────────────────────────────┐│
│  │      Mon      Tue      Wed      Thu      Fri          ││
│  │      18       19       20       21       22           ││
│  │                                                       ││
│  │ 07:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │    │ │    │ │    │ │    │ │    │            ││
│  │ 07:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │ 08:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │XXXX│ │    │ │YYYY│ │    │ │    │            ││
│  │ 08:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │ 09:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │XXXX│ │    │ │YYYY│ │    │ │    │            ││
│  │ 09:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │ 10:00 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            ││
│  │       │    │ │WWWW│ │    │ │    │ │    │            ││
│  │ 10:30 └────┘ └────┘ └────┘ └────┘ └────┘            ││
│  │  ...                                                  ││
│  └────────────────────────────────────────────────────────┘│
│                                                           │
│  Legend:  🟦 Room A  🟩 Room B  🟧 Room C               │
│                                                           │
│  <Mon 18, 08:00 — Room A> click → POST /book             │
│    → grid shows "You" on that cell                       │
│    → count updates from 1/4 to 2/4                       │
│  <same cell, click again> → DELETE /unbook               │
│    → grid removes "You"                                  │
│    → count updates back to 1/4                           │
└────────────────────────────────────────────────────────────┘
```

**Elements:**
- Back → `/catalog/:id`
- Header: session name + "Book Your Slots" subtitle
- Participant context: "Mandatory: 4 · Optional: 2" so the user knows the requirement
- Week nav: same `‹` / `›` pattern
- Time grid: reuses `BookingGridComponent` in `book` mode
  - Each existing slot rendered as a horizontal block spanning its time duration
  - Block coloring by location (same `--loc-color` pattern)
  - Block overlays show slot state (see Section 5)
- Legend: location colors with labels
- Click interaction: toggle book/unbook

**States:**
- No slots exist yet: empty grid with message "No slots have been created yet. Ask your lead to create time slots." and a link back to detail
- Loading: spinner
- Booking success: toast "Slot booked!", grid updates immediately
- Unbook success: toast "Booking removed", grid updates
- Error: snackbar "Could not book slot"

---

## 3. Navigation Model

### Route Map

```
/catalog                    → Session catalog list (landing)
/catalog/create             → Create new catalog item
/catalog/:id                → Catalog item detail
/catalog/:id/slots          → Lead slot creation
/catalog/:id/book           → Self-service booking
```

### Navigation Elements Per Page

| Page | Primary Nav | Secondary Nav | Breadcrumb |
|------|-------------|---------------|------------|
| `/catalog` | — | — | "Session Catalog" (page title only) |
| `/catalog/create` | ← Back button → `/catalog` | — | Catalog > Create |
| `/catalog/:id` | ← Back button → `/catalog` | [Create Slots] → `/catalog/:id/slots`, [Book Slots] → `/catalog/:id/book` | Catalog > {Name} |
| `/catalog/:id/slots` | ← Back button → `/catalog/:id` | [Cancel] → `/catalog/:id` | Catalog > {Name} > Slots |
| `/catalog/:id/book` | ← Back button → `/catalog/:id` | — | Catalog > {Name} > Book |

### Breadcrumb Pattern

Use a subtle breadcrumb line at the top (not always visible — only on sub-pages):
```
Catalog  ›  Sprint Planning  ›  Book Your Slots
```

Each breadcrumb segment is clickable (back to that level). The last segment is the current page (plain text, not a link). Style: `font-size:0.75rem; opacity:0.5;` with `›` separators, colored links `color:#64b5f6`.

### Tab / Section Navigation (Within Detail Page)

The detail page (`/catalog/:id`) has two CTA buttons that branch the user:
- **[Create Slots]** — visible to all users (though typically a lead action)
- **[Book Slots]** — primary CTA for all team members

These are `mat-raised-button` and `mat-stroked-button` respectively, placed side by side.

---

## 4. Error and Empty States

### Session Catalog List (`/catalog`)

**Empty state** (no catalog items exist):
```
          [📋 list_alt icon]
     No catalog items yet
  Create the first session catalog
  item to get started.
      [+ Create Catalog Item]
```

**Error state** (API fails to load):
```
          [⚠️ error outline icon]
     Could not load catalog
  [Retry] button
```

### Session Catalog Create (`/catalog/create`)

**Validation errors:**
- Name empty on save → red text below field: "Name is required"
- API error → snackbar (not inline): "Failed to create catalog item"

### Session Catalog Detail (`/catalog/:id`)

**Loading state:** Full-page `mat-spinner` (same pattern as `meeting-detail`)

**Error/Not Found:**
```
  Session not found
  [Back to Catalog]
```

**Empty slots (no slots created yet):**
```
  ┌─ SLOTS ────────────────────────────┐
  │  No time slots created yet.         │
  │  Create available time windows      │
  │  for team members to book.          │
  │                                     │
  │     [🔨 Create Slots]              │
  └─────────────────────────────────────┘
```

### Slot Creation (`/catalog/:id/slots`)

**No slots selected** (on initial load with no existing slots):
- Grid is empty (all cells unselected)
- Summary shows "No slots selected"
- [Save] button is disabled

**No locations available:**
- Warning banner: "No locations configured. Ask an admin to create slot locations first."
- Grid hidden
- Save button disabled

### Self-Service Booking (`/catalog/:id/book`)

**No slots exist:**
```
  ┌─ BOOK YOUR SLOTS ──────────────────┐
  │  No time slots available yet.       │
  │  The lead needs to create slots     │
  │  before you can book.              │
  │                                     │
  │     [← Back to Detail]             │
  └─────────────────────────────────────┘
```

**All slots fully booked:**
- Grid still shows all slots as confirmed (gold badges)
- No click interaction possible
- Message above grid: "All slots are confirmed"

**Current user already booked everywhere:**
- Each slot shows "You" in highlighted style
- User can click to unbook if desired

---

## 5. Component States for the Booking Grid

### Slot State Matrix (applies to each occupied cell in the grid)

| State | Condition | Visual | Interaction |
|-------|-----------|--------|-------------|
| **Available** | No bookings, slot exists | Cell filled with location color at 30% opacity, thin colored border. Hover: slight brighten. | Click → POST /book → "You" appears |
| **Partially booked** | Some bookings exist, mandatory not all met | Cell shows `N/M` count overlay (e.g. "2/4"), location color at 40% opacity. | Clickable if not full. Click → POST /book |
| **Fully booked (confirmed)** | All mandatory participants booked | Cell shows gold "✓ Confirmed" badge, location color at full opacity, slight glow. `.slot-confirmed` class. | Not clickable. Cursor: default. |
| **My booking** | Current user is booked on this slot | Cell highlighted with `--my-color` (blue #64b5f6), shows "You" label, blue border. `.slot-mine` class. | Click → DELETE /unbook → "You" removed, reverts to Available/Partially Booked/Confirmed |

### CSS Class Mapping

| State | Classes |
|-------|---------|
| Available | `.slot-available` (colored by `--loc-color`) |
| Partially booked | `.slot-partial` |
| Fully booked | `.slot-confirmed` (gold badge, non-interactive) |
| My booking | `.slot-mine` (blue highlight) |

### Slot Block Rendering

Unlike the empty-grid click-to-create mode, each existing slot is a **horizontal block** spanning its time range:
```
┌──────────────────────────────┐
│ Room A                       │
│ 09:00–10:00                  │
│ 2/4 mandatory · 1 booked     │
│ [✓ Confirmed]                │  ← only when all mandatory met
└──────────────────────────────┘
```

Each block uses:
- Background: `color-mix(in srgb, var(--loc-color) 25%, transparent)` with `var(--loc-color)` left border (3px)
- Width: spans multiple time rows based on duration (e.g. 09:00–10:00 = 2 rows)
- "You" label: shown inside the block when `booking.teamMemberId === currentMemberId`

---

## 6. Color and Visual Design

### Location Colors

Reuse the existing `SlotLocation.color` values. Apply via CSS custom property `--loc-color`:
- `.loc-chip.active` → `background: color-mix(in srgb, var(--loc-color) 20%, transparent); border-color: color-mix(in srgb, var(--loc-color) 50%, transparent); color: var(--loc-color);`
- Grid slot blocks → `background: color-mix(in srgb, var(--loc-color) 30%, transparent); border-color: var(--loc-color); box-shadow: inset 0 0 0 1px var(--loc-color);`
- Summary counts → location color dot + count

### Confirmation Badge

```
.status-confirmed {
  background: rgba(255,215,0,0.15);
  color: #FFD700;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

Shown as: `✓ Confirmed` — gold on dark gold background, inside the slot block.

### Participant Role Indicators

| Role | Visual |
|------|--------|
| **Mandatory** | Small blue dot (`background: #64b5f6`) next to name in participant list |
| **Optional** | Small green dot (`background: #81c784`) next to name in participant list |

In the create form, the two multi-select sections have section labels colored to match:
- "Mandatory Attending" → label in `#64b5f6`
- "Optional Attending" → label in `#81c784`

### My Booking Highlight

Use the existing `.slot-mine` pattern:
```
.slot-mine {
  background: rgba(100,181,246,0.08);
  border-color: rgba(100,181,246,0.3);
  box-shadow: inset 0 0 0 2px rgba(100,181,246,0.4);
}
```

The "You" label inside: `font-size:0.7rem; color:#64b5f6; font-weight:600;`

### Count Labels

```
.slot-count {
  font-size: 0.68rem;
  opacity: 0.6;
}
```

Partially booked: "2/4" in amber `#ff9800` to indicate attention needed.
Fully booked: "4/4" in green `#81c784` to indicate satisfied.

---

## Appendix: BookingGridComponent Mode Summary

| Mode | Used By | Cell Behavior | Cell Visual |
|------|---------|--------------|-------------|
| `create` | `/catalog/:id/slots`, `meeting-form-dialog` | Click empty → select with active location color; click selected → deselect | Empty cells: dim, hover highlight. Selected: location color fill + border |
| `book` | `/catalog/:id/book` | Click existing slot → toggle book/unbook | Existing slots as colored blocks with state overlays. Empty cells: not clickable |
| `view` | `/catalog/:id` (detail) | No interaction | Slots as colored blocks with full info (counts, badges). Read-only |
