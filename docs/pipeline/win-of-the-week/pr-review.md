# PR Review: Win of the Week Feature

## Overall
The feature adds a "Win of the Week" system with nomination, voting, and winner announcement cycles. The implementation follows the existing codebase patterns well.

## Files Modified
- `src/TeamManager.Api/Infrastructure/Data/AppDbContext.cs` — added 3 DbSets + 3 configs
- `src/TeamManager.Api/Program.cs` — added DI registration
- `team-manager-ui/src/app/app.routes.ts` — added lazy route

## Files Created
### Backend (11 files)
- `Domain/Enums/WinWeekStatus.cs`
- `Domain/Entities/WinNomination.cs`
- `Domain/Entities/WinVote.cs`
- `Domain/Entities/WinWeek.cs`
- `Infrastructure/Data/Configurations/WinNominationConfiguration.cs`
- `Infrastructure/Data/Configurations/WinVoteConfiguration.cs`
- `Infrastructure/Data/Configurations/WinWeekConfiguration.cs`
- `Application/DTOs/WinOfTheWeek/` (5 DTO files)
- `Application/Services/Interfaces/IWinOfTheWeekService.cs`
- `Application/Services/WinOfTheWeekService.cs`
- `Presentation/Controllers/WinOfTheWeekController.cs`

### Frontend (4 files)
- `core/models/win-week.model.ts`
- `core/services/win-of-the-week.service.ts`
- `features/win-of-the-week/win-of-the-week.routes.ts`
- `features/win-of-the-week/win-of-the-week.component.ts`

## Findings

### ✅ PASS — Good
1. **Entity relationships**: Proper FK configuration with cascade/restrict delete behaviors. Unique index on (WinNominationId, TeamMemberId) enforces one-vote-per-nomination business rule at DB level.
2. **Service pattern**: Follows existing `IService`/`Service` split, dependency injection via constructor.
3. **Controller pattern**: Follows existing `[ApiController]` / `[Route("api/v1/...")]` pattern with consistent error handling.
4. **Frontend**: Uses standalone components, Angular signals, inject pattern — matches existing codebase style.
5. **DTOs**: Uses records with `init` properties, consistent with existing DTOs.
6. **Business rules**: Nomination limits (3/person), vote limits (3/person), self-vote prevention all correctly implemented.

### ⚠️ BLOCK — Issues to address

**1. Critical: `VoteCount` denormalized field can drift**
The `VoteCount` on `WinNomination` is incremented/decremented in-memory alongside vote operations. If a `SaveChangesAsync` partially fails (e.g., the vote saves but the count update doesn't), the count will be wrong. 
**Fix**: Either (a) calculate `VoteCount` from `Votes.Count` in the query, or (b) use a raw SQL update to atomically increment the counter in the same transaction.

**2. Medium: `CloseWeekAsync` finds the wrong week**
`CloseWeekAsync` does `FirstOrDefaultAsync(w => w.Status == WinWeekStatus.Voting)` — it picks the first voting week, not necessarily the CURRENT week (based on WeekStart). If for any reason there are multiple voting weeks, this will close the wrong one.
**Fix**: Filter by `WeekStart == GetWeekStart(today)` to ensure we only close the current week.

**3. Medium: `OpenNextWeekAsync` week detection is fragile**
`OpenNextWeekAsync` checks `w.Status != WinWeekStatus.Closed` which will match ANY non-closed week, regardless of its date. If a previous week was accidentally left in Nominating status, this check will prevent opening a new week.
**Fix**: Filter by current week start instead, or check if the *current* week (by date) is closed.

**4. Low: `CreatedAtAction` returns wrong route**
In `CreateNomination`, the response uses `CreatedAtAction(nameof(GetCurrent), null, result)` but `GetCurrent` isn't a "get by ID" route, so no valid Location header is produced. 
**Fix**: Either return `Ok(result)` instead of `CreatedAtAction`, or create a `GetNominationById` endpoint.

**5. Low: Frontend uses inline styles inconsistently**
Some inline styles in the component template use `rgba(255,255,255,0.08)` directly while others reference computed values. Consider consolidating into a single style approach.

### 💡 Suggestions
- Add an EF migration file (the code creates entities but no migration has been generated)
- Consider adding `[Authorize]` attributes to controller endpoints once auth is fully wired
- The `GetCurrentMemberId()` fallback to `Guid.Empty` could create orphan data — consider rejecting requests when no valid member ID is found

## VERDICT: BLOCK
Issues 1, 2, and 3 should be addressed before merging.
