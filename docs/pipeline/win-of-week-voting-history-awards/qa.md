# QA Report: Win of the Week — Voting Visibility, History, Awards

| Field | Value |
|-------|-------|
| Date | 2026-05-14 |
| QA Engineer | AI QA |
| Feature | Win of the Week Voting History & Awards |
| Status | Reviewed |

---

## Acceptance Criteria & Verification Results

### AC-1: Voting Schedule Visibility
**Requirement:** Users should understand when voting opens/closes. A schedule indicator should show the current phase.

**Verification:**
- `win-of-the-week.component.ts:64-86` — Schedule bar with Mon–Sun segments implemented
- `win-of-the-week.component.ts:76-81` — Labels change based on status ("NOMINATIONS OPEN" / "VOTING OPEN" / "Voting Opens Friday" / "Voting Closed")
- `win-of-the-week.component.ts:84-85` — Current day indicator ("▲ Current day")
- `win-of-the-week.component.ts:138-142` — Info banner during nominating: "Voting opens Friday. You'll have 3 votes to use."
- `win-of-the-week.component.ts:297-310` — Phase badge computed signal shows "Nominations Open" / "Voting Open" / "Closed"

**Result: PASS**

---

### AC-2: Voting UI Visible During Voting Phase
**Requirement:** Vote buttons must be visible and functional during the Voting phase (Fri–Sun).

**Verification:**
- `win-of-the-week.component.ts:197-220` — Vote buttons render when `currentWeek()?.status === 'Voting'`
- `win-of-the-week.component.ts:205-209` — Vote button shown when votes remain
- `win-of-the-week.component.ts:211-214` — Disabled "Max votes" button when exhausted
- `win-of-the-week.component.ts:199-203` — "Voted" button with remove capability
- `win-of-the-week.component.ts:198` — Self-vote prevention (`nom.teamMemberId !== currentUserId`)
- `WinOfTheWeekService.cs:127-143` — Server-side validation: status check, self-vote check, duplicate check, max 3 votes

**Result: PASS**

---

### AC-3: Win of the Week History
**Requirement:** Users can see a history of past winners with week date, winner name, title, and vote count.

**Verification:**
- **Backend:**
  - `WinOfTheWeekController.cs:100-105` — `GET /api/v1/win-of-the-week/history` endpoint
  - `WinOfTheWeekController.cs:107-120` — `GET /api/v1/win-of-the-week/weeks/{weekId}` endpoint for detail
  - `WinOfTheWeekService.cs:230-270` — `GetHistoryAsync` queries closed weeks, joins winners, returns `WinWeekHistoryDto`
  - `WinOfTheWeekService.cs:272-317` — `GetWeekDetailAsync` loads all nominations for a week
- **Frontend:**
  - `win-of-the-week-history.component.ts` — Grid view with winner cards (avatar, name, title, week date, vote count)
  - `win-of-the-week-history.component.ts:23-30` — Year filter dropdown
  - `win-of-the-week-history.component.ts:78-106` — Expandable detail showing all nominations
  - `win-of-the-week-history.component.ts:40-45` — Empty state: "No winners yet"
  - `win-of-the-week-history.routes.ts` — Routes configured
  - `win-of-the-week.service.ts:34-42` — `getHistory()` and `getWeekDetail()` service methods
  - `win-of-the-week.component.ts:228-230` — "View past winners" link from WoW component

**Result: PASS**

---

### AC-4: Win of the Month (Aggregated Voting Event)
**Requirement:** A periodic event that takes all weekly winners from the past ~4 weeks and presents them for a new round of voting.

**Verification:**
- **Backend:**
  - `WinOfMonthController.cs:13-19` — `GET /api/v1/win-of-the-month/current`
  - `WinOfMonthController.cs:21-26` — `GET /api/v1/win-of-the-month/history`
  - `WinOfMonthController.cs:28-45` — `POST /api/v1/win-of-the-month/nominations/{id}/vote`
  - `WinOfMonthController.cs:47-53` — `DELETE /api/v1/win-of-the-month/nominations/{id}/vote`
  - `WinOfMonthController.cs:55-69` — `POST /api/v1/win-of-the-month/close` (admin)
  - `WinOfMonthController.cs:71-85` — `POST /api/v1/win-of-the-month/generate` (admin)
  - `WinOfMonthService.cs:16-40` — `GetCurrentMonthAsync` with auto-generation logic
  - `WinOfMonthService.cs:228-282` — `TryAutoGenerateAsync` creates month from 4+ closed weeks
  - `WinOfMonthService.cs:80-128` — `VoteAsync` with max 3 votes, self-vote prevention, voting deadline check
  - `WinOfMonthService.cs:163-226` — `GenerateFromClosedWeeksAsync` manual generation
- **Frontend:**
  - `win-of-the-month.component.ts` — Full component with countdown timer, nomination cards, vote buttons, winner announcement, final standings
  - `win-of-the-month.component.ts:62-98` — Empty state with progress bar ("X of 4 weekly wins collected")
  - `win-of-the-month.component.ts:102-125` — Countdown timer + vote counter during voting
  - `win-of-the-month.component.ts:128-155` — Winner celebration + final standings when closed
  - `win-of-the-month.routes.ts` — Routes configured
  - `win-of-the-month.service.ts` — All API methods implemented
  - `fun-hub.component.ts:14` — "Win of the Month" tab in nav
  - `fun.routes.ts:18-21` — Route configured
  - `win-of-the-week.component.ts:103-114` — Cross-promotion banner from WoW to WoM

**Result: PASS**

---

### AC-5: Awards Integration — Weekly Achievement
**Requirement:** Weekly winners receive an achievement and leaderboard points.

**Verification:**
- `WinOfTheWeekService.cs:198-199` — `AwardWeeklyAchievementAsync` called in `CloseWeekAsync`
- `WinOfTheWeekService.cs:319-351` — Awards `win-of-the-week` achievement with `Note` = month label, creates `PointAward` with reason "Win of the Week Champion — {Month Year}"
- Duplicate prevention via `Note` field check (line 327-332)
- Migration `20260514110000_AddWinOfMonthTables.cs:125-128` — Seeds `win-of-the-week` achievement (10 pts, category `wow`)
- `win-of-the-week.component.ts:95-97` — Winner banner shows "Weekly Champion +10 points"

**Result: PASS**

---

### AC-6: Awards Integration — Monthly Champion Achievement
**Requirement:** Monthly winners receive achievement and 50 bonus points on the leaderboard.

**Verification:**
- `WinOfMonthService.cs:300-304` — `AwardMonthlyChampionAsync` called in `CloseMonthInternalAsync`
- `WinOfMonthService.cs:323-355` — Awards `win-of-month-champion` achievement, creates `PointAward` with 50 pts
- Duplicate prevention via `Note` field (line 331-336)
- Migration seeds `win-of-month-champion` (50 pts, category `wow`)
- `win-of-the-month.component.ts:133-135` — Winner banner shows "Monthly Champion +50 points"

**Result: PASS**

---

### AC-7: Awards Integration — Voter Achievement
**Requirement:** All voters in Win of the Month receive a voter achievement (5 pts).

**Verification:**
- `WinOfMonthService.cs:306-318` — Collects all voter IDs, calls `AwardMonthlyVoterAsync` for each
- `WinOfMonthService.cs:357-388` — Awards `win-of-month-voter` achievement with 5 pts, duplicate prevention via `Note`
- Migration seeds `win-of-month-voter` (5 pts, category `wow`)

**Result: PASS**

---

### AC-8: Leaderboard Integration — WoW Breakdown Source
**Requirement:** WoW points appear as a dedicated breakdown source in the leaderboard.

**Verification:**
- `LeaderboardService.cs:78-83` — `wow` category gets its own `PointBreakdownItem` with source `"wow"` and label `"Win of the Week"`
- `leaderboard.component.ts:23` — `SOURCE_COLORS` includes `wow: { bg: 'rgba(255,215,0,0.15)', text: '#FFD700' }`
- `leaderboard.component.ts:174` — Legend includes "Win of the Week" entry

**Result: PASS**

---

### AC-9: Fun Hub Navigation
**Requirement:** New "History" and "Win of the Month" tabs in the Fun Hub nav bar.

**Verification:**
- `fun-hub.component.ts:12-16` — Tabs: Win of the Week, History, Win of the Month, Leaderboard, Spin Wheel
- `fun.routes.ts:9-29` — All child routes configured including history and win-of-the-month

**Result: PASS**

---

### AC-10: Data Model & Migration
**Requirement:** New entities (WinMonth, WinMonthNomination, WinMonthVote) with proper EF configurations and migration.

**Verification:**
- `WinMonth.cs` — Entity matches arch spec (Id, Year, Month, Status, WinnerNominationId, OpenedAt, ClosedAt, VotingEndsAt)
- `WinMonthNomination.cs` — Entity matches spec (Id, WinMonthId, SourceWinWeekId, NomineeMemberId, Title, Description, VoteCount)
- `WinMonthVote.cs` — Entity matches spec (Id, WinMonthNominationId, TeamMemberId, VotedAt)
- `WinMonthStatus.cs` — Enum with Voting, Closed
- `WinMonthConfiguration.cs` — Unique index on (Year, Month), SetNull on winner
- `WinMonthNominationConfiguration.cs` — Unique index on (WinMonthId, NomineeMemberId), Restrict on SourceWinWeek/Nominee
- `WinMonthVoteConfiguration.cs` — Unique index on (WinMonthNominationId, TeamMemberId)
- `AppDbContext.cs:43-45` — DbSets added for all three entities
- `AppDbContext.cs:89-91` — Configurations registered in OnModelCreating
- Migration `20260514110000_AddWinOfMonthTables.cs` — Creates all three tables, seeds achievements, includes Down migration

**Result: PASS**

---

## Gaps, Edge Cases, and Potential Issues

### Issue 1: WinMonth Auto-Close Timing (Medium)
**Location:** `WinOfMonthService.cs:34-37`
**Description:** `GetCurrentMonthAsync` auto-closes the month when `VotingEndsAt <= now`. However, this only triggers when a user calls `GetCurrentMonthAsync`. If no one accesses the endpoint after `VotingEndsAt`, the month stays in `Voting` status until someone accesses it. Awards are not granted until someone triggers the auto-close.
**Impact:** Delayed award distribution. Not a functional bug but could confuse users who expect awards at a specific time.
**Recommendation:** Consider a background job or scheduled task to auto-close expired months.

### Issue 2: WinMonth Generation Uses Current Month Only (Low)
**Location:** `WinOfMonthService.cs:175-179` and `230-235`
**Description:** Both `GenerateFromClosedWeeksAsync` and `TryAutoGenerateAsync` filter closed weeks by `w.WeekStart.Month == currentMonth && w.WeekStart.Year == currentYear`. If weeks span month boundaries (e.g., a week starting Jan 29 ending Feb 4), that week's winner may not be included in either month's contest depending on which month the `WeekStart` falls in.
**Impact:** Edge case — weekly winners near month boundaries might be excluded from the monthly contest.
**Recommendation:** Acceptable behavior as-is; the arch spec says "WeekStart falls within that month."

### Issue 3: No "Load More" Pagination in History (Low)
**Location:** `win-of-the-week-history.component.ts`
**Description:** The UX spec calls for "Load more" pagination or infinite scroll. The current implementation loads all history at once (default 52 weeks). The backend supports a `limit` parameter but the frontend does not use pagination.
**Impact:** Performance degradation if history grows very large. Currently acceptable for <52 weeks.
**Recommendation:** Add pagination when history exceeds ~20 entries.

### Issue 4: WinOfMonthService MinWeeklyWinners Constant Is 4, Not 2 (Informational)
**Location:** `WinOfMonthService.cs:14`
**Description:** The arch spec says "If fewer than 2 weekly winners exist, don't create" (section 5.2). The implementation uses `MinWeeklyWinners = 4`. This is actually consistent with the business rules table (section 10) which says "4+ closed weeks in a month" triggers auto-generation. The "2" in section 5.2 appears to be a documentation error; the implementation correctly uses 4.
**Impact:** None — implementation is correct per the business rules.

### Issue 5: Vote Removal in Win of the Month Has No Time Check (Low)
**Location:** `WinOfMonthService.cs:130-145`
**Description:** `RemoveVoteAsync` does not check if `VotingEndsAt` has passed. A user could theoretically remove their vote after the voting period ends (if they access the API directly).
**Impact:** Minor — the month would likely be auto-closed on next `GetCurrentMonthAsync` call, recalculating the winner. But it's an inconsistency with `VoteAsync` which does check the deadline.
**Recommendation:** Add `VotingEndsAt` check to `RemoveVoteAsync`.

### Issue 6: Weekly Achievement Uses Month Label for Dedup (Medium)
**Location:** `WinOfTheWeekService.cs:325-332`
**Description:** The weekly achievement deduplication uses `Note == monthLabel` (e.g., "May 2026"). If a user wins multiple weeks in the same month, only the first win would be awarded the achievement. The arch spec says "Awarded once per week win. No duplicate check needed (each week is unique)."
**Impact:** Users who win multiple weeks in the same month only get the achievement once. They still get the `PointAward` each time (since that has no dedup check).
**Recommendation:** Change dedup key to use week identifier (e.g., `weekStart.ToString()`) instead of month label, OR update the arch spec to clarify this is intentional.

### Issue 7: No Win of the Month History Component (Low)
**Location:** `win-of-the-month.component.ts:86-98`
**Description:** The UX spec mentions a "View all past winners" link for monthly history. The implementation shows only the last 3 past winners inline (`monthHistory().slice(0, 3)`). There is no dedicated monthly history page/component.
**Impact:** Users cannot browse the full monthly history. The `GET /api/v1/win-of-the-month/history` endpoint exists but no dedicated UI page uses it beyond the inline preview.
**Recommendation:** Add a dedicated monthly history view or expand the inline list with a "View all" link.

---

## Summary

| # | Criterion | Status |
|---|-----------|--------|
| AC-1 | Voting schedule visibility | **PASS** |
| AC-2 | Voting UI visible during voting phase | **PASS** |
| AC-3 | Win of the Week history | **PASS** |
| AC-4 | Win of the Month (aggregated voting) | **PASS** |
| AC-5 | Weekly achievement award | **PASS** |
| AC-6 | Monthly champion achievement + points | **PASS** |
| AC-7 | Voter achievement | **PASS** |
| AC-8 | Leaderboard WoW breakdown source | **PASS** |
| AC-9 | Fun Hub navigation tabs | **PASS** |
| AC-10 | Data model & migration | **PASS** |

---

## Overall Verdict: **PASS**

All critical acceptance criteria are satisfied. The implementation covers:
- Voting visibility fix (schedule bar, phase indicators, info banners)
- Win of the Week history with expandable detail
- Win of the Month aggregated voting with countdown, nominations, and winner announcement
- Full awards integration (weekly, monthly champion, voter achievements)
- Leaderboard breakdown with dedicated "wow" source
- Complete data model, EF configurations, and migration with achievement seeding

**Non-critical issues noted:** 7 items (2 Medium, 5 Low/Informational). None block the feature from being released. The most notable is Issue 6 (weekly achievement dedup using month label instead of week identifier), which should be reviewed with the product owner to confirm intended behavior.
