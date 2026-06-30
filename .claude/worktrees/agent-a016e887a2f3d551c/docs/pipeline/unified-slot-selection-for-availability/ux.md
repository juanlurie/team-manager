# UX Design: Unified Slot Selection for Availability

## User Flow

1. User navigates to a meeting series detail page (`/meeting-series/:id`)
2. User clicks the "Set My Availability" button at the bottom of the page
3. User is taken to the availability page (`/meeting-series/:id/availability`)
4. The page displays a weekly calendar grid showing all existing slots for the series
5. Slots the user has previously selected are pre-highlighted
6. User clicks cells to toggle their availability on/off
7. User clicks "Save" to submit, or "Cancel" to return to the detail page
8. On save, a success toast appears and user is returned to the detail page

## Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ Meeting Series › Series Title › Set Availability         │  ← breadcrumb
│                                                          │
│ Set Your Availability                                    │  ← page title
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │  Week Navigation                                     │ │
│ │         ‹  Week of Jan 13, 2026  ›                    │ │
│ │                                                      │ │
│ │        Mon 13    Tue 14    Wed 15    Thu 16    Fri 17│ │  ← day headers
│ │ 07:00   [  ]      [  ]      [  ]      [  ]      [  ] │ │
│ │ 07:30   [██]      [  ]      [██]      [  ]      [  ] │ │  ← ██ = selected
│ │ 08:00   [  ]      [██]      [  ]      [██]      [  ] │ │  ← [  ] = empty
│ │ 08:30   [  ]      [██]      [  ]      [██]      [  ] │ │
│ │ 09:00   [██]      [  ]      [  ]      [  ]      [██] │ │
│ │ ...                                                     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ 🟢 Remote: 3   🔵 Boardroom: 2          [Clear all]     │  ← summary
│                                                          │
│ [Cancel]                                          [Save] │  ← bottom actions
└─────────────────────────────────────────────────────────┘
```

## Differences from Slot Creation

The availability page is a **simplified version** of the slot creation grid:

| Element | Slot Creation | Availability |
|---------|--------------|--------------|
| Duration picker | Yes (15m/30m/45m/60m/90m) | **Removed** — slots already have fixed durations |
| Location picker | Yes (select active location) | **Removed** — slots already have assigned locations |
| Grid time rows | Generated from duration + hours | **Derived from existing slots** — only show rows where slots exist |
| Cell selection | Click to assign active location color | **Click to toggle** — cell adopts the slot's existing location color |
| Pre-selection | None (fresh selection) | **Pre-selected** — user's existing availability is shown |
| Summary | Count per location | Count per location (same) |
| Save label | "Add Slots" | **"Save"** |
| Save action | Creates new slots on series | **Sets availability for all items** |

## Grid Behavior

### Time Rows
The grid shows time rows that correspond to the actual slots in the series. If the series has slots at 07:30, 08:00, 09:00, and 14:00, the grid shows those specific time rows. This is different from slot creation which generates all possible rows based on duration.

**Implementation approach:** Collect all unique `(date, startTime)` pairs from the series slots, then build the grid from those. This ensures the grid only shows cells where slots actually exist.

### Cell Toggle
- Clicking an **empty** cell selects it — the cell fills with the slot's location color
- Clicking a **selected** cell deselects it — the cell returns to empty
- Each cell corresponds to exactly one `MeetingSeriesSlot` (identified by slot ID)

### Pre-selected Cells
When the page loads, cells corresponding to the user's existing availability are pre-selected. These look identical to newly selected cells — no visual distinction between "was already selected" and "just selected."

## Interaction Details

### Cell Hover
- Empty cell hover: light blue tint (`rgba(100,181,246,0.12)`) with blue border — same as slot creation
- Selected cell hover: slightly brighter version of the location color

### Cell Selected State
- Background: `color-mix(in srgb, <location-color> 30%, transparent)`
- Border: `<location-color>`
- Inner shadow: `inset 0 0 0 1px <location-color>`

### Clear All
- Appears only when at least one cell is selected
- Clicking clears all selections (including pre-selected ones)
- No confirmation dialog — user can re-select or cancel

### Save Button
- Disabled when no cells are selected
- Enabled when at least one cell is selected
- On click: shows loading state, submits to API, shows success toast, navigates back

### Cancel Button
- Always enabled
- Navigates back to series detail without saving
- No confirmation dialog — unsaved changes are discarded

## Edge Cases

### No Slots Exist
If the series has no availability slots yet:
- Show empty state: "No availability slots have been created for this series yet."
- Show button: "Go to Add Slots" → navigates to `/meeting-series/:id/slots`
- Hide the grid, summary, and save button

### User Has No Existing Availability
- Grid renders with all cells empty
- User selects slots from scratch
- Save works normally

### User Has Existing Availability
- Grid renders with user's existing slots pre-selected
- User can add/remove selections
- Save replaces all existing availability for this user

### All Slots Already Selected
- All cells are pre-selected
- User can deselect some
- Summary shows total count matching all slots

### Single Slot in Series
- Grid shows one cell
- User toggles it on/off
- Minimal but functional

## Visual States Summary

| State | Background | Border | Text/Icon |
|-------|-----------|--------|-----------|
| Empty cell | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.06)` | — |
| Empty cell hover | `rgba(100,181,246,0.12)` | `rgba(100,181,246,0.25)` | — |
| Selected cell | `color-mix(slot-loc-color 30%, transparent)` | `slot-loc-color` | — |
| Day header | — | — | Day name: opacity 0.5, uppercase; Day number: bold, 0.9rem |
| Time label | — | — | opacity 0.45, 0.68rem |
| Save button (disabled) | Material default disabled | — | opacity 0.5 |
| Save button (enabled) | Material primary | — | — |

## Confirmation on Save (Optional Future)
If the user had previously set per-item availability that differs from the new unified selection, consider showing a confirmation dialog: "This will replace your existing availability for all items in this series. Continue?" — **Not required for v1**, can be added later if users report confusion.
