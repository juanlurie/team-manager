# Architecture: Leaderboard Member Points History

## 1. Problem Statement

Clicking a team member on the leaderboard currently opens `TeamMemberFormComponent` which is an edit form. Users expect to see a detailed breakdown of how that member earned their points — a chronological list of all point awards with dates, reasons, and sources.

## 2. Current Architecture

### Frontend
- `leaderboard.component.ts` — Displays podium and rankings. `openMember()` opens `TeamMemberFormComponent` dialog for editing.
- `TeamMemberFormComponent` — Full member edit form (name, role, crafts, etc.)
- `LeaderboardService` — Has `getMemberStats()` which returns aggregated stats but not individual point history.

### Backend
- `LeaderboardController` — Has `GET /api/v1/leaderboard/member/{memberId}` returning aggregated `LeaderboardEntryDto`
- `LeaderboardService.GetMemberStatsAsync()` — Returns same aggregated data as leaderboard entry
- `PointAward` entity — Has `Id`, `TeamMemberId`, `Points`, `Reason`, `AwardedAt`
- No endpoint exists to fetch individual point award history for a member

## 3. Proposed Changes

### Backend: New Endpoint
**File:** `LeaderboardController.cs`
- Add `GET /api/v1/leaderboard/member/{memberId}/history`
- Returns `PointAwardHistoryDto[]` — list of all point awards with:
  - `id`, `points`, `reason`, `awardedAt`, `source` (derived from reason pattern or "manual")

**File:** `ILeaderboardService.cs` + `LeaderboardService.cs`
- Add `GetPointHistoryAsync(Guid memberId)` method
- Query `PointAwards` for the member, ordered by `AwardedAt` descending
- Also include achievement points and sprint points as history entries

### Frontend: New Dialog Component
**File:** `member-points-history.component.ts` (new)
- Dialog component showing chronological point history
- Header: member name, avatar, total points
- List of entries: date, source icon, reason, points (+/-)
- Grouped by source type: badges, sprints, wins, bonus awards
- Uses same color scheme as leaderboard breakdown chips

### Frontend: Leaderboard Component Update
**File:** `leaderboard.component.ts`
- Change `openMember()` to open `MemberPointsHistoryComponent` instead of `TeamMemberFormComponent`
- Pass member data and point history to dialog
- Remove `TeamMemberFormComponent` import from leaderboard

### Frontend: Service Update
**File:** `leaderboard.service.ts`
- Add `getMemberHistory(memberId: string)` method

## 4. Data Flow

1. User clicks member on leaderboard
2. `openMember()` fetches member history via `getMemberHistory()`
3. Opens `MemberPointsHistoryComponent` dialog with member + history data
4. Dialog displays chronological list of point sources
5. Close returns to leaderboard (no refresh needed — read-only view)

## 5. Edge Cases

- **No points yet**: Show "No points earned yet" empty state
- **Long history**: Scrollable list with sticky header
- **Date formatting**: Relative dates ("2 days ago") for recent, full dates for older
- **Source detection**: Derive source from reason patterns (e.g., "Win of the Week" → wow source)

## 6. File-Level Change Summary

| File | Change |
|------|--------|
| `LeaderboardController.cs` | Add GET /member/{id}/history endpoint |
| `ILeaderboardService.cs` | Add GetPointHistoryAsync method |
| `LeaderboardService.cs` | Implement GetPointHistoryAsync |
| `leaderboard.service.ts` | Add getMemberHistory() method |
| `leaderboard.component.ts` | Change openMember() to use new dialog |
| `member-points-history.component.ts` | New dialog component |
