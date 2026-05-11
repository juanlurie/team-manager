# Review: Dashboard Leave & PTO Summary with Weekends and Expand

## Review Summary

Solid implementation that cleanly replaces the old flat "On Leave" list with an expandable summary card. No new bugs introduced, but the pre-existing `forkJoin` without error handling means a `GetLeaveSummary` failure hangs the entire dashboard in loading state.

## BLOCK Items

None. No correctness, security, or data-integrity issues found in the new code.

## WARN Items

1. **`forkJoin` in `sprint-dashboard.component.ts:467` lacks error handler** (pre-existing but now affects the new `leaveSummary` observable). If the `getLeaveSummary` endpoint throws (network error, 500, etc.), the entire forkJoin fails and `loading` stays `true` — the user sees a permanent spinner. Add a `.pipe(catchError(() => of(null)))` to each observable or a `catchError` on the forkJoin subscription to set `loading` to `false`.

2. **Redundant `CalendarDaysBetween` computations in `DashboardService.cs:216,231-232,239,252`**. The same calendar-day calculation for a given `(StartDate, EndDate)` pair is computed up to 4 times (byType sum, per-member sum, per-record, top-level total). Pre-compute once per record into an in-memory DTO list and derive aggregates from that to avoid repeated integer math and improve clarity.

3. **`badgeStyle` in `leave-summary-card.component.ts:98` doesn't handle `Other` leave type**. The `LeaveType` enum includes `Other`, but the known-types list omits it. Falls through to the default gray style gracefully, but if designers intended `Other` to have a distinct color (or share a known-type color), it won't render as expected. Either add `'Other'` to `knownTypes` or handle it explicitly.

## INFO Items

- **TypeScript interfaces match C# DTOs exactly**: PascalCase maps to camelCase correctly across all 7 new model types (`DashboardLeaveSummary`, `LeaveTypeSummary`, `MemberLeaveDetail`, `DetailedLeaveRecord` plus the 4 C# records).
- **Empty-state handling works end-to-end**: No sprint members → empty DTO with `membersOnLeaveTotal: 0` → card shows "No leave records this sprint". No leave records with members → same result via empty `records` list. Both paths produce the correct UI.
- **`membersOnLeaveToday` counts distinct members correctly** (line 203-207) with `.Distinct().Count()` — overlapping leave records on the same day from the same member are not double-counted.
- **Date handling matches existing conventions**: `fmtDate(iso)` in the card component appends `'T00:00:00'` to ISO dates, same as `sprint-dashboard.component.ts:515`. Both share the same minor timezone-offset risk but are consistent.
- **No new SQL injection or over-fetching vectors**: All queries use EF Core parameterized predicates. Leave records scoped to sprint date range via `StartDate <= EndDate` overlap check (line 195-197).
- **No new N+1**: The one `Include(l => l.TeamMember)` produces a single SQL query.
- **Component follows existing project conventions**: standalone, signals (`input`, `signal`, `computed`), `inject()` DI, inline templates/styles, Material icons.
- **Backend DTOs use `record` with `{ get; init; }`** — consistent with existing codebase patterns.

## Overall Verdict

**PASS** — No blocking issues. Address WARN items before production deployment.
