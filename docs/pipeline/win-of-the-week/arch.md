# Architecture: Win of the Week Feature

## Overview
A "Win of the Week" feature that allows team members to nominate wins (achievements, accomplishments) during the week, then on Friday voting opens to select the top win.

## Backend

### Domain Entities
Two new entities:

**WinNomination**
- `Id` (Guid, PK)
- `TeamMemberId` (Guid, FK -> TeamMember) — the person who *submitted* the nomination
- `NomineeMemberId` (Guid, FK -> TeamMember) — the person being nominated
- `Title` (string, max 200)
- `Description` (string, max 2000)
- `WeekStart` (DateOnly) — ISO week start (Monday)
- `CreatedAt` (DateTimeOffset)
- `VoteCount` (int) — denormalised count of votes (updated via Vote table)

**WinVote**
- `Id` (Guid, PK)
- `WinNominationId` (Guid, FK -> WinNomination)
- `TeamMemberId` (Guid, FK -> TeamMember) — who voted
- `VotedAt` (DateTimeOffset)
- Unique constraint on (WinNominationId, TeamMemberId) — one vote per nomination per person

### Enums / Status
- `WinWeekStatus` enum: `Nominating`, `Voting`, `Closed`

A helper entity or config **WinWeek** to track the current week cycle:
- `Id` (Guid)
- `WeekStart` (DateOnly)
- `Status` (WinWeekStatus)
- `WinnerNominationId` (Guid?, nullable FK -> WinNomination)
- `OpenedAt`, `ClosedAt` (DateTimeOffset)

### DTOs
- `WinNominationDto` — Id, Nominee (name + id), Submitter (name + id), Title, Description, VoteCount, CreatedAt
- `WinVoteDto` — Id, NominationId, VoterId, VotedAt
- `CreateNominationRequest` — NomineeMemberId, Title, Description
- `WinWeekDto` — Id, WeekStart, Status, Winner (nullable nomination), List<WinNominationDto>
- `CloseWeekRequest` — WinnerNominationId

### API Endpoints (`/api/v1/win-of-the-week`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/win-of-the-week/current` | Get current week (with nominations) |
| POST | `/api/v1/win-of-the-week/nominations` | Create a nomination (Mon-Thu only) |
| POST | `/api/v1/win-of-the-week/nominations/{id}/vote` | Vote for a nomination (Fri only) |
| DELETE | `/api/v1/win-of-the-week/nominations/{id}/vote` | Remove vote |
| POST | `/api/v1/win-of-the-week/close` | Close week and set winner (admin) |
| POST | `/api/v1/win-of-the-week/open-next` | Open next week's nomination period |

### Service Layer
**IWinOfTheWeekService** with:
- `GetCurrentWeekAsync() -> WinWeekDto`
- `CreateNominationAsync(memberId, request) -> WinNominationDto`
- `VoteAsync(memberId, nominationId) -> WinVoteDto`
- `RemoveVoteAsync(memberId, nominationId) -> bool`
- `CloseWeekAsync(memberId, request) -> WinWeekDto` (admin/team-lead only)
- `OpenNextWeekAsync(memberId) -> WinWeekDto` (admin/team-lead only)
- Auto-create current week if none exists (lazy init on GET)

### Business Rules
1. Nominations can only be made Mon 00:00 UTC - Thu 23:59:59 UTC
2. Voting opens Friday 00:00 UTC and closes Sunday 23:59:59 UTC
3. A team member can submit up to 3 nominations per week
4. A team member can vote for up to 3 nominations per week
5. Cannot vote for your own nomination
6. Winner is the nomination with the most votes when week is closed
7. The same person can be nominated multiple times in the same week (by different people)

### Migration
Add `WinNominations`, `WinVotes`, `WinWeeks` tables via EF migration.

## Frontend (Angular)

### Model
- `win-week.model.ts` — interfaces for WinWeek, WinNomination, WinVote

### Service
- `win-of-the-week.service.ts` — HTTP client for all endpoints

### Routes
- `/win-of-the-week` → new feature module (lazy-loaded)

### Components
- `WinOfTheWeekComponent` — main page showing:
  - Timer/phase indicator (Nominating / Voting / Closed)
  - Leaderboard-style list of nominations with vote buttons
  - "Submit a Win" button/dialog
  - Winner announcement banner when closed

### UI States
- **Nominating phase**: Show "Submit a Win" form, list nominations, no vote buttons yet
- **Voting phase**: Show vote buttons, hide submit form, show countdown
- **Closed phase**: Show winner with crown icon, archived list
- **Empty state**: "No wins nominated this week yet"
- **Loading/Error states**: Spinner + error snackbar

## Data Flow
1. User opens `/win-of-the-week` → GET current week (lazy-creates if needed)
2. During Mon-Thu: user submits nomination → POST nomination → refresh list
3. On Fri-Sun: voting buttons appear → POST vote → update vote count
4. Admin/Lead closes week → winner determined → displayed in UI
5. Next Monday: admin/lead opens next week → cycle repeats

## Integration
- No changes to existing entities or controllers
- Standard DI registration in Program.cs
- No new NuGet packages needed
