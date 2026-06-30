# Diagnosis: WoW Voting Fix + Meeting Types Removal + Fun Hub

## Bug Description
1. Can't vote for win of the week nominations
2. Remove meeting types (unused)
3. Move fun stuff (wheel, leaderboard, win of the week) to a hub

## Root Cause

### Issue 1: Win of the Week Voting
**File:** `team-manager-ui/src/app/features/win-of-the-week/win-of-the-week.component.ts:222`
**Reason:** `currentUserId` is initialized as `''` and never set. The voting UI checks `nom.teamMemberId !== currentUserId` to determine if the user can vote on a nomination. Since `currentUserId` is always empty, this check always passes (allowing voting on own nominations), but more importantly, the component has no way to properly identify the current user for vote state management.

The `WinWeek` DTO from the backend doesn't include the current user's ID. The component needs to either:
- Get the current user ID from the response
- Get it from a user/auth service
- Use the `currentWeek()` response which should include user context

**Fix:** The `WinWeekDto` backend response should include `currentMemberId` or the frontend should derive it from the nominations (check which nominations belong to current user by matching `teamMemberId`). Actually, the simplest fix is to get the current user from the `TeamMemberService` or auth service. But since the app uses a fallback to the first active member when no auth claim exists, we should get the current member ID from the backend response.

**Better Fix:** Add `currentMemberId` to the `WinWeekDto` response from the backend, and use it in the frontend component.

### Issue 2: Meeting Types Unused
**File:** `team-manager-ui/src/app/features/session-types/session-types.component.ts`
**Route:** `/session-types`
**Nav:** Currently in `SECONDARY_NAV` in `app.component.ts`

Meeting types (`SessionType` entity) are referenced in the meeting planner for session type selection, but the `meeting-planner.component.ts` doesn't actually use them — it uses the hardcoded `MeetingLocation` enum (Remote/OnSite/Hybrid) instead. The `SessionType` feature is dead code.

**Fix:** Remove `/session-types` from navigation. Keep the route for backward compatibility but make it inaccessible from the UI.

### Issue 3: Fun Hub
Currently in navigation:
- **Win of the Week** (`/win-of-the-week`) — PRIMARY_NAV
- **Leaderboard** (`/leaderboard`) — SECONDARY_NAV + MORE_NAV
- **Spin Wheel** (`/wheel`) — SECONDARY_NAV + MORE_NAV

These should be consolidated under a "Fun" hub similar to the Meetings hub pattern.

## Fix Approach

### 1. Fix WoW Voting
- Add `currentMemberId` to `WinWeekDto` backend
- Update `WinWeek` frontend model
- Set `currentUserId` in `WinOfTheWeekComponent` from the API response

### 2. Remove Meeting Types from Nav
- Remove `/session-types` from `SECONDARY_NAV` in `app.component.ts`
- Keep route registered for backward compatibility

### 3. Create Fun Hub
- Create `fun-hub.component.ts` with tabs: Win of the Week, Leaderboard, Spin Wheel
- Update `app.routes.ts` to nest these under `/fun`
- Add redirects for backward compatibility:
  - `/win-of-the-week` → `/fun/win-of-the-week`
  - `/leaderboard` → `/fun/leaderboard`
  - `/wheel` → `/fun/wheel`
- Update navigation to single "Fun" entry

## Files to Change

| File | Change |
|------|--------|
| `src/.../DTOs/WinOfTheWeek/WinWeekDto.cs` | Add `CurrentMemberId` property |
| `src/.../WinOfTheWeekService.cs` | Include `CurrentMemberId` in DTO |
| `team-manager-ui/.../models/win-week.model.ts` | Add `currentMemberId` field |
| `team-manager-ui/.../win-of-the-week.component.ts` | Set `currentUserId` from API response |
| `team-manager-ui/.../app.component.ts` | Remove session-types, replace 3 fun entries with 1 |
| `team-manager-ui/.../app.routes.ts` | Add fun hub routes + redirects |
| `team-manager-ui/.../fun-hub.component.ts` | **NEW** — Fun hub with tabs |
| `team-manager-ui/.../fun.routes.ts` | **NEW** — Fun hub child routes |

## Regression Risk Areas

- **Low:** Adding `currentMemberId` to WinWeekDto is additive, non-breaking
- **Low:** Removing session-types from nav only affects discoverability, route stays
- **Low:** Fun hub uses same pattern as meetings hub, redirects preserve bookmarks
- **Medium:** Moving win-of-the-week route changes URL — redirects handle this
