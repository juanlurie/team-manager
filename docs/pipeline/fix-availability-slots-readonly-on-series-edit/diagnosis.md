# Diagnosis: Availability Slots — Duration Mismatch on Series Edit

## Root Cause

**File:** `team-manager-ui/src/app/features/meeting-series/meeting-series-detail.component.ts`
**Line 305:** `editDuration = signal<number>(30);`

The `editDuration` signal is **hardcoded to 30 minutes** and never updated from existing slot data. This signal drives `editTimeRows` (lines 338-347), which generates the time grid rows used for BOTH readonly display and edit mode.

When slots were originally created with a duration other than 30 minutes (e.g., 60 minutes), the time grid rows are generated at 30-minute intervals (07:00, 07:30, 08:00, 08:30...) while the existing slots have start times at 60-minute intervals (07:00, 08:00, 09:00...). The `isExistingSlot()` check (line 404-406) looks up `date|startTime` in the grid — slots whose start times don't match a row will not be highlighted, making them appear invisible or misaligned.

**Two symptoms:**
1. **Duration not matching original:** When entering edit mode, the duration selector defaults to 30m regardless of what was used to create the existing slots.
2. **Slots not populating in readonly mode:** The time grid rows don't align with existing slot start times, so the `.existing` CSS class is never applied to the correct cells.

## Fix Approach

Add a computed signal `inferredDuration` that calculates the slot duration from the first existing slot (`endTime - startTime`). When the series loads (in `load()` method) or when entering edit mode (`toggleEditMode()`), set `editDuration` to the inferred duration. This ensures:
- Time grid rows align with existing slot start times
- Duration selector reflects the original duration
- Existing slots are properly highlighted in readonly mode

## Files to Change

| File | Change |
|------|--------|
| `team-manager-ui/src/app/features/meeting-series/meeting-series-detail.component.ts` | Add `inferredDuration` computed signal; update `load()` or `toggleEditMode()` to set `editDuration` to inferred value |

## Regression Risk Areas

1. **Mixed-duration slots:** If a series has slots with different durations (e.g., some 30m, some 60m), the inferred duration will only reflect the first slot. The grid will still show all slots that match a row, but slots with non-matching start times may not highlight. This is an edge case — in practice, slots are created with a single duration picker.
2. **No existing slots:** When there are no slots, `inferredDuration` should fall back to 30 (the default). The duration picker should still work normally for adding new slots.
3. **Changing duration after selecting new slots:** The existing `pickDuration()` method already warns and clears selections when duration changes — this behavior should remain unchanged.
4. **Edit mode toggle:** When toggling edit mode on/off and back on, `editDuration` should re-infer from existing slots (not retain a manually changed value from a previous edit session).
