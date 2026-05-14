# Diagnosis: Win of the Week — Open Voting Early

## Root Cause

Win of the Week voting transitions from `Nominating` → `Voting` **automatically** based solely on the day of week. The gate is in `GetOrCreateCurrentWeekAsync()`:

- **File:** `src/TeamManager.Api/Application/Services/WinOfTheWeekService.cs`
- **Lines 362-368:** Auto-transition on access — `if (week.Status == WinWeekStatus.Nominating && dayOfWeek >= DayOfWeek.Friday)`
- **Lines 373-375:** New week creation — status set to `Voting` only if `today.DayOfWeek >= DayOfWeek.Friday`

There is **no manual "open voting" endpoint** for Win of the Week. By contrast, Win of the Month has `POST /api/v1/win-of-the-month/open` backed by `OpenVotingAsync()` in `WinOfMonthService.cs`.

## Fix Approach

Add a manual "open voting" capability for Win of the Week, mirroring the Win of the Month pattern:

1. Add `OpenVotingAsync(Guid memberId)` to `IWinOfTheWeekService`
2. Implement `OpenVotingAsync` in `WinOfTheWeekService` — transitions current week from `Nominating` to `Voting`, with guards:
   - Week must exist
   - Status must be `Nominating`
   - Must have at least one nomination
3. Add `POST /open-voting` endpoint to `WinOfTheWeekController` with `[Authorize(Roles = "TeamLead")]`
4. Add `openVoting()` HTTP method to the Angular frontend service
5. Add "Open Voting" button to the Angular component — visible during `Nominating` phase when nominations exist

## Files to Change

| File | Change |
|------|--------|
| `src/TeamManager.Api/Application/Services/Interfaces/IWinOfTheWeekService.cs` | Add `Task<WinWeekDto> OpenVotingAsync(Guid memberId)` |
| `src/TeamManager.Api/Application/Services/WinOfTheWeekService.cs` | Implement `OpenVotingAsync` |
| `src/TeamManager.Api/Presentation/Controllers/WinOfTheWeekController.cs` | Add `POST /open-voting` endpoint |
| `team-manager-ui/src/app/core/services/win-of-the-week.service.ts` | Add `openVoting()` method |
| `team-manager-ui/src/app/features/win-of-the-week/win-of-the-week.component.ts` | Add "Open Voting" button in admin actions section |

## Regression Risk Areas

1. **Auto-transition still fires on Friday:** The existing Friday auto-transition in `GetOrCreateCurrentWeekAsync` must remain intact — it should be a no-op if status is already `Voting`.
2. **Voting guard in `VoteAsync`:** Already checks `Status == Voting` (line 127) — no change needed, but verify it still works.
3. **CloseWeek guard:** Currently requires `Status == Voting` — should continue to work after manual open.
4. **Frontend schedule bar:** The visual schedule bar highlights Fri-Sun as voting days. When voting is opened early (e.g., Wednesday), the bar should still display correctly — the component uses `week.status` not day-of-week for rendering, so this should be fine.
5. **Win of the Month auto-generation:** Depends on closed weeks, not on when voting opened — no impact expected.
