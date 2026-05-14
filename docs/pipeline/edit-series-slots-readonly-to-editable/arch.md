# Architecture: Edit Series Slots (Readonly → Editable)

## 1. Problem Statement

When viewing a meeting series detail page, availability slots are displayed as a simple text list. Users want to see the same visual grid layout used in the "Add Slots" page, but in readonly mode by default. An edit toggle should enable the grid for adding/removing slots inline.

## 2. Current Architecture

### Components
- `meeting-series-detail.component.ts` — Shows series info, slots as a list, and meeting items
- `meeting-series-slots.component.ts` — Dedicated page for adding slots with a full grid picker

### State
- `series` signal holds the `MeetingSeries` object with `slots[]` and `items[]`
- No local editing state in detail component

### APIs
- `MeetingSeriesService.createSlots(seriesId, { slots })` — POST to add new slots
- `MeetingSeriesService.deleteSlot(seriesId, slotId)` — DELETE to remove a slot
- `SlotLocationService.getAll()` — GET available locations

### Grid Picker (from slots component)
- Duration selector (15/30/45/60/90 min)
- Location chips
- Week navigation (Mon-Fri)
- Time grid (7:00-17:00)
- Selected slots tracked in `Map<SlotKey, locationId>`

## 3. Proposed Changes

### meeting-series-detail.component.ts

#### New State Signals
- `editMode: Signal<boolean>` — Toggle between readonly and edit mode
- `editDuration: Signal<number>` — Selected slot duration for new slots
- `editWeekOffset: Signal<number>` — Week navigation offset
- `editActiveLocationId: Signal<string | null>` — Selected location for new slots
- `editSelectedSlots: Signal<Map<SlotKey, string>>` — New slots being added
- `locations: Signal<SlotLocation[]>` — Available locations

#### Template Changes
- Replace slot list with grid-based view (same as add component)
- Readonly mode: grid cells with existing slots highlighted, no click interaction
- Edit mode: full interactive grid with duration/location selectors
- "Edit" / "Done" toggle button in section header
- "Save X new slot(s)" button appears when new slots are selected
- Existing slots show a distinct visual style (blue tint vs green for new)

#### Methods
- `toggleEditMode()` — Switches edit mode, clears selection state
- `pickDuration(d)` — Changes duration, warns if selection exists
- `isExistingSlot(key)` — Checks if a grid cell corresponds to an existing slot
- `toggleEditSlot(key)` — Adds/removes slot from selection (edit mode only)
- `clearEditSlots()` — Clears new slot selections
- `saveEditSlots()` — Calls API to persist new slots, reloads series

### Data Flow
1. User loads detail page → slots displayed in readonly grid
2. User clicks "Edit" → grid becomes interactive
3. User selects duration, location, and clicks grid cells
4. New selections tracked in `editSelectedSlots` map
5. User clicks "Save" → `createSlots()` API called
6. On success → series reloaded, edit mode stays active or exits
7. User can delete individual slots via X button (both modes)

## 4. Edge Cases

- **Duration change with selections**: Warn and clear selections
- **Existing slot overlap**: Prevent selecting cells that match existing slots (date + time + duration)
- **Week navigation**: Existing slots may span multiple weeks; grid only shows current week view
- **Location changes**: Existing slots retain their location; new slots use active location
- **Save failure**: Show error toast, keep selections for retry
- **Empty state**: Show "Add Slots" button when no slots exist (triggers edit mode)

## 5. File-Level Change Summary

| File | Change |
|------|--------|
| `meeting-series-detail.component.ts` | Add edit mode state, grid template, toggle logic, save/clear methods |
| `meeting-series-detail.component.ts` (styles) | Add grid styles matching slots component |

No new files created. All changes are within the existing detail component.
