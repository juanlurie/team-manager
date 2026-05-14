# Review: Win of Week Voting, History & Awards — Round 2

**Status: APPROVED**

All 4 BLOCK issues from Round 1 have been verified as correctly fixed. Build succeeds with 0 warnings, 0 errors.

---

## BLOCK Issue Verification

### BLOCK #1: No authorization on admin endpoints — ✅ FIXED

- `WinOfTheWeekController.cs:1` — `using Microsoft.AspNetCore.Authorization;` added
- `WinOfTheWeekController.cs:65` — `[Authorize(Roles = "TeamLead")]` on `CloseWeek`
- `WinOfTheWeekController.cs:85` — `[Authorize(Roles = "TeamLead")]` on `OpenNextWeek`
- `WinOfMonthController.cs:1` — `using Microsoft.AspNetCore.Authorization;` added
- `WinOfMonthController.cs:56` — `[Authorize(Roles = "TeamLead")]` on `CloseMonth`
- `WinOfMonthController.cs:72` — `[Authorize(Roles = "TeamLead")]` on `Generate`

### BLOCK #2: `GetWeekDetailAsync` always returns `HasVoted = false` — ✅ FIXED

- `IWinOfTheWeekService.cs:14` — signature changed to `GetWeekDetailAsync(Guid weekId, Guid memberId)`
- `WinOfTheWeekController.cs:113` — passes `GetCurrentMemberId()` to the service
- `WinOfTheWeekService.cs:288-291` — queries `db.WinVotes` filtered by `memberId`
- `WinOfTheWeekService.cs:314` — `HasVoted = userVoteIds.Contains(n.Id)` correctly computed

### BLOCK #3: `MinWeeklyWinners` mismatch (backend=2, UI=4) — ✅ FIXED

- `WinOfMonthService.cs:14` — constant changed from `2` to `4`

### BLOCK #4: N+1 query in `GetHistoryAsync` — ✅ FIXED

- `WinOfTheWeekService.cs:232-242` — Query 1: fetches all closed weeks
- `WinOfTheWeekService.cs:247-251` — Query 2: batch-fetches all winners with `WHERE Id IN (winnerIds)`
- `WinOfTheWeekService.cs:253` — dictionary lookup eliminates per-week queries
- Reduced from 53 queries to 2

---

## Remaining Suggestions (not blocking)

1. **`WinOfMonthService.GetHistoryAsync` still has N+1** — `WinOfMonthService.cs:57-62` loops through months and fires a separate query per winner nomination. Less severe (max 12/year), but the same batch-fetch pattern should be applied.

2. **`SaveChangesAsync` per-voter in award loop** — `WinOfMonthService.cs:315-318` calls `SaveChangesAsync` inside the voter foreach. Batch the inserts and save once.

3. **Denormalized `VoteCount` can drift** — `WinMonthNomination.VoteCount` is manually incremented/decremented. Winner selection in `CloseMonthInternalAsync` should use `n.Votes.Count` as the source of truth.

4. **`GetCurrentMemberId` dev fallback** — Both controllers fall back to the first active member when JWT is unavailable. Should log a warning or require auth in production.

5. **Weekly achievement dedup granularity** — `WinOfTheWeekService.cs:326-327` deduplicates by month label ("May 2026"). If a member wins twice in the same month, only the first is recorded. Confirm this is intentional.
