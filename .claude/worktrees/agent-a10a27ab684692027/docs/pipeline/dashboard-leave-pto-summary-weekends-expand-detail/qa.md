# QA Report: Dashboard Leave / PTO Summary with Weekends & Expandable Detail

## 1. Summary

Tested the new **Leave & PTO Summary** feature across backend (C#) and frontend (Angular). Verified all arch.md and ux.md requirements, code quality, edge cases, and performed a full TypeScript compilation check. .NET build was not available in this environment (dotnet CLI not installed), but C# code was reviewed manually for structural correctness.

**TypeScript compilation:** ✅ PASS (no errors, `npx tsc --noEmit` and `npm run build` both succeeded).

---

## 2. Acceptance Criteria Checklist

| # | Criterion | Verdict | Notes |
|---|-----------|---------|-------|
| 1 | New API endpoint returns leave summary for a sprint | ✅ PASS | `GET /api/v1/dashboard/sprint/{sprintId}/leave-summary` added in `DashboardController.cs:28` |
| 2 | API includes weekend-aware calendar day counts | ✅ PASS | `CalendarDaysBetween()` uses `end.DayNumber - start.DayNumber + 1` in `DashboardService.cs:258-261` — inclusive, counts all calendar days |
| 3 | Collapsed state shows summary stats | ✅ PASS | Template renders "X on leave today · Y members on leave · Z calendar days" before expand toggle (`leave-summary-card.component.ts:39-45`) |
| 4 | Expanded state shows by-type breakdown | ✅ PASS | `By Type` section renders rows with type name, record count, working days, cal days (`leave-summary-card.component.ts:48-56`) |
| 5 | Expanded state shows per-member details with individual records | ✅ PASS | `Team Members` section renders member cards with individual record rows showing type badge, date range, work/cal days, notes icon (`leave-summary-card.component.ts:57-79`) |
| 6 | Empty state shows "No leave records this sprint" | ✅ PASS | When `membersOnLeaveTotal === 0`, non-interactive card with check icon and message is shown (`leave-summary-card.component.ts:20-28`) |
| 7 | Card is expandable/collapsible via click | ✅ PASS | Header has `role="button"`, `(click)`, `(keydown.enter)`, `(keydown.space)` — toggles `expanded` signal (`leave-summary-card.component.ts:30-32`) |
| 8 | Old "On Leave" section is removed | ✅ PASS | No `leaveWindow`, `leaveByDay`, `namesOf` references remain. Grep confirmed zero hits. Template has no old On Leave HTML. |
| 9 | No build errors (TS compiles) | ✅ PASS | `npx tsc --noEmit` — zero errors. `npm run build` — zero errors (only budget warnings, pre-existing) |
| 10 | No unused imports remain | ✅ PASS | All imports in `sprint-dashboard.component.ts` and `leave-summary-card.component.ts` are used. No stale `LeaveRecord` import. |

**All 10/10 acceptance criteria PASS.**

---

## 3. Code Quality Checklist

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| 1 | C# DTOs use records with `{ get; init; }` | ✅ PASS | `DashboardLeaveSummaryDto`, `LeaveTypeSummaryDto`, `MemberLeaveDetailDto`, `DetailedLeaveRecordDto` — all `public record` with `{ get; init; }` |
| 2 | Angular component is standalone | ✅ PASS | `LeaveSummaryCardComponent` has `standalone: true` |
| 3 | Component uses signals | ✅ PASS | `leaveSummary` is `input<DashboardLeaveSummary \| null>(null)`, `expanded` is `signal(false)` |
| 4 | Endpoint returns 404 if sprint not found | ✅ PASS | `DashboardService.GetLeaveSummaryAsync` returns `null` when sprint not found; controller maps null to `NotFound()` |
| 5 | Endpoint returns empty summary (not 404) if sprint exists but no members/leave | ✅ PASS | Service returns `new DashboardLeaveSummaryDto()` (all zeros/empty lists) when `memberIds.Count == 0` (line 188) or when no leave records match |
| 6 | Calendar days formula: `EndDate.DayNumber - StartDate.DayNumber + 1` | ✅ PASS | `DashboardService.cs:258-261` — correct formula |

**All 6/6 code quality checks PASS.**

---

## 4. Edge Case Analysis

| Edge Case | Expected Behavior | Actual | Verdict |
|-----------|-------------------|--------|---------|
| Sprint with no members | Empty summary (members = 0, summary = zeros) | Service returns `new DashboardLeaveSummaryDto()` at line 188 | ✅ PASS |
| Sprint with members but no leave records | Empty summary (zeros + empty arrays) | Records query returns empty list; `membersOnLeaveToday` = 0, `members.Count` = 0, sums = 0 | ✅ PASS |
| Sprint doesn't exist | 404 response | Service returns `null` → Controller → `NotFound()` | ✅ PASS |
| Leave record spanning a weekend (Fri-Mon: working=2, cal=4) | `workingDays` = 2, `calendarDays` = 4 | Formula: `Mon.DayNumber - Fri.DayNumber + 1` = 4 | ✅ PASS |
| Single-day leave record (Fri-Fri) | `workingDays` = 1, `calendarDays` = 1 | Formula: `Fri.DayNumber - Fri.DayNumber + 1` = 1 | ✅ PASS |
| Multiple leave records for same member overlapping same day | Both records counted; no dedup on overlap | Service doesn't deduplicate overlapping records — they are summed. This could overcount calendar days. | ⚠️ NOTE: Design doesn't specify dedup, so this is acceptable but worth noting |
| Very long leave period (weeks/months) | Calendar days computed correctly | Formula works for any date range | ✅ PASS |
| Null notes field on leave record | `notes` field serialized as `null` in JSON | `string? Notes` with get/init; Angular interface has `notes: string \| null` | ✅ PASS |
| `Today` during weekend | `membersOnLeaveToday` still works | Uses `DateOnly.FromDateTime(DateTime.UtcNow)` — handles weekends fine | ✅ PASS |

**Edge cases: 7/8 PASS, 1 noted (overlapping leave records — not specified as a requirement, low severity).**

---

## 5. Manual Test Scenarios

### Scenario 1: Basic happy path — sprint with active leave records
1. Open the sprint dashboard (`/dashboard`)
2. Verify the **Leave & PTO Summary** card is visible (collapsed by default)
3. Confirm the collapsed stats show correct numbers: `X on leave today · Y members on leave · Z calendar days`
4. Click the card header to expand
5. Verify **By Type** section lists each leave type with correct record counts and day totals
6. Verify **Team Members** section shows each member on leave with their records
7. Verify each record shows type badge, date range, working days, calendar days
8. Click header again to collapse — card returns to summary state

### Scenario 2: Empty state — no leave records in sprint
1. Navigate to a sprint where no team members have leave records
2. Verify the card shows: 🏖 LEAVE & PTO SUMMARY header + ✅ *No leave records this sprint*
3. Verify the card is NOT clickable (no chevron, no expand behavior)
4. Verify no errors in browser console

### Scenario 3: Weekend-aware calendar day computation
1. Find or create a leave record: Fri 9 May – Mon 12 May (with `DaysCount` = 2)
2. Open the dashboard for that sprint
3. Expand the card
4. Verify the record shows: `2 work` and `4 cal`
5. Verify the **By Type** section sums include 4 calendar days for that record
6. Verify the member's total also reflects 4 calendar days

### Scenario 4: Keyboard accessibility
1. Navigate to the Leave & PTO Summary card using Tab key
2. Press Enter — card should expand
3. Press Enter again — card should collapse
4. Press Space — card should expand (with `$event.preventDefault()` preventing page scroll)
5. Verify `aria-expanded` attribute updates to `true`/`false`

### Scenario 5: Sprint does not exist (404)
1. Using browser dev tools or a direct API call, hit `GET /api/v1/dashboard/sprint/{non-existent-guid}/leave-summary`
2. Verify the API returns HTTP 404
3. Verify the Angular app handles this gracefully (the `forkJoin` will error — note: the current implementation does not have a `.catch()` handler, so the dashboard may fail to load if a 404 occurs during normal operation)

---

## 6. Overall Verdict

### ✅ **PASS**

All 10 acceptance criteria pass. All 6 code quality checks pass. 7 of 8 edge cases pass with 1 low-severity note.

### Minor Observations (non-blocking)

| Severity | Finding |
|----------|---------|
| LOW | **No expand animation**: The UX doc recommends a smooth max-height or Angular animation (200–300ms). The implementation uses `@if (expanded())` which is an instant show/hide. The UX doc calls both options acceptable, so this is a cosmetic observation, not a failure. |
| LOW | **Overlapping leave records**: If a member has two leave records covering the same days, calendar days are summed (overcounted). This is consistent with how `workingDays` are computed. The design doesn't specify dedup logic. |
| LOW | **No error handling in forkJoin**: If `getLeaveSummary` returns a 404 (sprint deleted between page load and data fetch), the entire forkJoin errors and the dashboard fails to load. This is a pre-existing pattern (all other calls have the same risk) and is outside the scope of this feature. |

No HIGH or MEDIUM severity issues found.
