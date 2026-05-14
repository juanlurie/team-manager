# UX Specification: Edit Series Slots (Readonly → Editable)

## 1. User Flow

### Default (Readonly) View
1. User navigates to a meeting series detail page
2. "Availability Slots" section shows the same grid layout as the Add Slots page
3. Existing slots are highlighted in the grid with their location color
4. Grid cells are non-interactive (no hover effects, no click)
5. Duration and location selectors are hidden
6. Week navigation is visible for browsing different weeks
7. An "Edit" button appears in the section header

### Edit Mode
1. User clicks "Edit" button
2. Section header changes to show "Done" button
3. Duration selector chips appear (15/30/45/60/90 min)
4. Location chips appear with color indicators
5. Grid cells become interactive:
   - Hover shows blue highlight
   - Click toggles selection with active location color
   - Existing slots cannot be selected (visual distinction maintained)
6. A summary bar shows count of new slots by location
7. "Clear new" and "Save X new slot(s)" actions appear
8. User clicks "Save" → slots added → grid refreshes → edit mode stays active
9. User clicks "Done" → exits edit mode, returns to readonly view

### Empty State
1. No slots defined → shows message "No availability slots defined yet"
2. "Add Slots" button triggers edit mode directly

## 2. Visual Design Specifications

### Readonly Grid Cells
- **Existing slot**: `background: rgba(100,181,246,0.08)`, `border: 1px solid rgba(100,181,246,0.2)`
- **Empty cell**: `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.06)`
- **No hover effects** in readonly mode

### Edit Mode Grid Cells
- **Empty cell hover**: `background: rgba(100,181,246,0.12)`, `border-color: rgba(100,181,246,0.25)`
- **Selected cell**: `background: color-mix(in srgb, var(--sel-color) 30%, transparent)`, `border-color: var(--sel-color)`, `box-shadow: inset 0 0 0 1px var(--sel-color)`
- **Existing slot**: Same as readonly (not selectable)

### Section Header
- **Readonly**: "Availability Slots (N)" label + "Edit" button (stroked, icon: edit)
- **Edit mode**: Same label + "Done" button (stroked, icon: visibility)

### Duration Chips
- Inactive: `border: 1px solid rgba(255,255,255,0.12)`, `background: transparent`
- Active: `background: rgba(100,181,246,0.2)`, `border-color: rgba(100,181,246,0.5)`, `color: #64b5f6`

### Location Chips
- Inactive: Same as duration chips
- Active: `background: color-mix(in srgb, var(--loc-color) 20%, transparent)`, `border-color: color-mix(in srgb, var(--loc-color) 50%, transparent)`, `color: var(--loc-color)`

### Summary Bar
- Font: `0.78rem`, opacity `0.6`
- Location counts with colored dots
- "Clear new" link: `color: #ef5350`, underlined
- "Save X new slot(s)" link: `color: #64b5f6`, font-weight `600`

### Spacing
- Section padding: `14px`
- Grid cell: `64px × 28px`
- Time column: `44px` width
- Day header height: `40px`
- Gap between grid elements: `1px`

## 3. Component Layout

### Readonly Mode
```
┌─────────────────────────────────────────────────┐
│ Availability Slots (5)              [✏️ Edit]   │
├─────────────────────────────────────────────────┤
│                    Week Navigation               │
│  ‹    Week of May 12, 2026    ›                 │
├─────────────────────────────────────────────────┤
│        Mon    Tue    Wed    Thu    Fri          │
│  07:00  [ ]    [■]    [ ]    [ ]    [■]         │
│  07:30  [ ]    [ ]    [■]    [ ]    [ ]         │
│  08:00  [■]    [ ]    [ ]    [■]    [ ]         │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

### Edit Mode
```
┌─────────────────────────────────────────────────┐
│ Availability Slots (5)             [👁️ Done]    │
├─────────────────────────────────────────────────┤
│ Slot Duration                                    │
│ [15m] [30m] [45m] [60m] [90m]                   │
│                                                  │
│ Active Location                                  │
│ [● Room A] [● Room B] [● Remote]                │
│                                                  │
│                    Week Navigation               │
│  ‹    Week of May 12, 2026    ›                 │
├─────────────────────────────────────────────────┤
│        Mon    Tue    Wed    Thu    Fri          │
│  07:00  [ ]    [■]    [ ]    [ ]    [■]         │
│  07:30  [ ]    [ ]    [●]    [ ]    [ ]         │  ← newly selected
│  08:00  [■]    [ ]    [ ]    [■]    [ ]         │
│  ...                                            │
├─────────────────────────────────────────────────┤
│ Room A: 2 new    Room B: 1 new    [Clear] [Save]│
└─────────────────────────────────────────────────┘
```

## 4. Interaction Patterns

### Hover
- Readonly: No hover effects on grid cells
- Edit mode: Empty cells show blue tint on hover
- Buttons: Standard Material hover states

### Click
- Readonly: Grid cells non-interactive
- Edit mode: Click toggles slot selection
- Existing slots: Never selectable, even in edit mode
- Duration/Location chips: Single-select, immediate update

### Keyboard
- Tab navigation through all interactive elements
- Enter/Space activates buttons and chips
- Arrow keys for week navigation when focused
- Escape exits edit mode (optional, future enhancement)

## 5. Responsive Behavior

- Grid scrolls horizontally on narrow screens (`overflow-x: auto`)
- Chips wrap to multiple lines if needed
- Section header buttons stack vertically on very narrow screens
- Minimum grid width maintained for readability

## 6. Accessibility

- Grid cells have `role="gridcell"` with aria-labels describing date/time
- Existing slots marked with `aria-disabled="true"`
- Edit mode toggle announces state change via aria-live region
- Color contrast meets WCAG AA (4.5:1 minimum)
- Focus indicators visible on all interactive elements
- Screen reader announces slot count and status changes
