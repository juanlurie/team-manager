# Diagnosis: Edit Slots Grid View + Open Voting

## Bug 1: Availability slots in edit showing as list instead of grid

### Root Cause
**File:** `meeting-series-detail.component.ts`, lines 66 and 154
**Reason:** The grid view is only rendered when `editMode() === true` (line 66: `@if (editMode())`). When `editMode() === false` and slots exist, it falls through to line 154 which renders the old list view (`<div class="slot-list">`).

### Fix Approach
Always render the grid view. When `editMode() === false`, show grid in readonly mode (no click interaction, no duration/location selectors). When `editMode() === true`, show full interactive grid with selectors.

### Files to Change
- `team-manager-ui/src/app/features/meeting-series/meeting-series-detail.component.ts`

### Regression Risk
- Low. The grid already handles readonly vs edit mode via the `isExistingSlot()` check and click handler. Just need to move the grid outside the `@if (editMode())` block and conditionally show the selectors.

---

## Bug 2: Can't open voting manually

### Root Cause
**File:** `WinOfMonthService.cs`, line 228 (`OpenVotingAsync`)
**Reason:** The method looks for a month with `Status == Pending`. However, when `GenerateFromClosedWeeksAsync` creates a month, it sets `Status = WinMonthStatus.Pending` but the `GetCurrentMonthAsync` auto-generation (`TryAutoGenerateAsync`) also creates with `Pending`. The open endpoint works correctly, but the UI "Open Voting Now" button only shows when `month()!.status === 'Pending'`.

**Actual issue:** There are 0 weekly winners, so generate fails. No month contest exists to open. This is expected behavior — you need 4+ weekly winners first.

However, checking the UI: the `openVoting()` method in `win-of-the-month.component.ts` calls the API correctly. The button shows when `status === 'Pending'`. If there's no month at all, the "Generate Month Contest" button shows instead.

### Fix Approach
This is not a code bug — it's a data dependency issue. The user needs weekly winners first. But we should verify the UI shows the correct state and the open endpoint works when a Pending month exists.

### Files to Change
- None (behavior is correct). May need to seed test data or clarify error messaging.
