# Architecture: Win of the Week — Voting Visibility, History, Win of the Month, and Awards

## 1. Problem Analysis

### 1.1 Why the User Can't Vote

The user reports: *"it only lets me nominate but I can't vote anywhere."*

**Root cause:** The voting UI is gated entirely by `WinWeek.Status === 'Voting'` (`win-of-the-week.component.ts:139`). The status auto-transitions from `Nominating` to `Voting` only on Friday (`WinOfTheWeekService.cs:239`):

```csharp
if (week.Status == WinWeekStatus.Nominating && dayOfWeek >= DayOfWeek.Friday)
{
    week.Status = WinWeekStatus.Voting;
}
```

This means:
- **Mon–Thu**: Status = `Nominating` → no vote buttons render at all
- **Fri–Sun**: Status = `Voting` → vote buttons appear
- **After close**: Status = `Closed` → vote buttons disappear

The user is likely accessing the page Mon–Thu and sees only the nomination form with no indication that voting exists or when it opens. There is no countdown, no schedule display, and no way to see past weeks to observe the voting phase in action.

**Contributing UX issues:**
1. No visible schedule/timeline showing when voting opens
2. No history of past weeks to see the full cycle
3. Vote buttons completely disappear during `Nominating` phase with no hint they'll appear later
4. The `userVotesRemaining` field exists in the DTO but is only shown when status is `Voting` (`component.ts:79-83`)

### 1.2 Missing Capabilities

| Gap | Impact |
|-----|--------|
| No winner history | Users can't see past winners, reduces engagement |
| No voting schedule visibility | Users don't know when to come back to vote |
| No "big picture" voting event | Weekly wins are forgotten; no aggregation |
| No leaderboard integration for WoW winners | Winning has no lasting impact on the gamification system |

---

## 2. Feature Design

### 2.1 Win of the Week History

A read-only view showing all past `Closed` weeks with their winners, displayed as a scrollable timeline/grid. Each entry shows:
- Week date range
- Winner name, title, and description
- Final vote count
- Link to view all nominations from that week (expandable)

**Access:** New tab in the Fun Hub nav bar: "History" alongside "Win of the Week", "Leaderboard", "Spin Wheel".

### 2.2 Win of the Month (Aggregated Voting Event)

A periodic event that takes all weekly winners from the past ~4 weeks and presents them for a new round of voting. The winner of this event is the "Win of the Month" champion.

**Lifecycle:**
1. **Auto-created** when 4+ closed weeks exist with no existing active WinMonth
2. **Voting phase** lasts 5 days (configurable)
3. **Winner selected** by highest vote count
4. **Awards granted** to winner (achievement + leaderboard points)

**Future extensibility:** Same pattern supports "Win of the Quarter" (aggregates monthly winners).

### 2.3 Awards Integration

When a Win of the Month winner is declared:
1. **Achievement awarded**: `win-of-month-champion` achievement (pre-seeded in DB)
2. **Leaderboard points**: Bonus points added via `PointAward` with reason "Win of the Month Champion — {Month Year}"
3. **Weekly win achievement**: Each weekly winner also gets a smaller achievement `win-of-the-week` (awarded at week close)

---

## 3. Data Model Changes

### 3.1 New Entity: WinMonth

```csharp
public class WinMonth
{
    public Guid Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public WinMonthStatus Status { get; set; } = WinMonthStatus.Voting;
    public Guid? WinnerNominationId { get; set; }
    public DateTimeOffset OpenedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset VotingEndsAt { get; set; }

    public WinMonthNomination? Winner { get; set; }
    public ICollection<WinMonthNomination> Nominations { get; set; } = [];
}
```

### 3.2 New Entity: WinMonthNomination

Represents a weekly winner entered into the monthly contest.

```csharp
public class WinMonthNomination
{
    public Guid Id { get; set; }
    public Guid WinMonthId { get; set; }
    public Guid SourceWinWeekId { get; set; }      // FK to the weekly win this came from
    public Guid NomineeMemberId { get; set; }       // the weekly winner
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int VoteCount { get; set; }              // denormalized for display

    public WinMonth WinMonth { get; set; } = null!;
    public WinWeek SourceWinWeek { get; set; } = null!;
    public TeamMember Nominee { get; set; } = null!;
    public ICollection<WinMonthVote> Votes { get; set; } = [];
}
```

### 3.3 New Entity: WinMonthVote

```csharp
public class WinMonthVote
{
    public Guid Id { get; set; }
    public Guid WinMonthNominationId { get; set; }
    public Guid TeamMemberId { get; set; }
    public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.UtcNow;

    public WinMonthNomination Nomination { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
```

### 3.4 New Enum: WinMonthStatus

```csharp
public enum WinMonthStatus
{
    Voting,
    Closed
}
```

### 3.5 Existing Entity Changes

**WinWeek** — no changes needed. The `Status = Closed` and `WinnerNominationId` already capture what we need.

**Achievement** — seed new achievement records (data-only, no schema change):

| Key | Name | Description | Icon | Category | Points |
|-----|------|-------------|------|----------|--------|
| `win-of-the-week` | Weekly Champion | Won Win of the Week | `emoji_events` | `wow` | 10 |
| `win-of-month-champion` | Monthly Champion | Won Win of the Month | `workspace_premium` | `wow` | 50 |
| `win-of-month-voter` | Monthly Voter | Voted in Win of the Month | `how_to_vote` | `wow` | 5 |

### 3.6 EF Configurations

```csharp
// WinMonthConfiguration
builder.HasKey(m => m.Id);
builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");
builder.HasIndex(m => new { m.Year, m.Month }).IsUnique();
builder.Property(m => m.Status).HasConversion<string>().HasMaxLength(20);
builder.HasOne(m => m.Winner).WithMany().HasForeignKey(m => m.WinnerNominationId).OnDelete(DeleteBehavior.SetNull);

// WinMonthNominationConfiguration
builder.HasKey(n => n.Id);
builder.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");
builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
builder.Property(n => n.Description).HasMaxLength(2000);
builder.HasOne(n => n.WinMonth).WithMany(m => m.Nominations).HasForeignKey(n => n.WinMonthId).OnDelete(DeleteBehavior.Cascade);
builder.HasOne(n => n.SourceWinWeek).WithMany().HasForeignKey(n => n.SourceWinWeekId).OnDelete(DeleteBehavior.Restrict);
builder.HasOne(n => n.Nominee).WithMany().HasForeignKey(n => n.NomineeMemberId).OnDelete(DeleteBehavior.Restrict);
builder.HasIndex(n => new { n.WinMonthId, n.NomineeMemberId }).IsUnique(); // can't nominate same person twice in same month

// WinMonthVoteConfiguration
builder.HasKey(v => v.Id);
builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");
builder.HasIndex(v => new { v.WinMonthNominationId, v.TeamMemberId }).IsUnique();
builder.HasOne(v => v.Nomination).WithMany(n => n.Votes).HasForeignKey(v => v.WinMonthNominationId).OnDelete(DeleteBehavior.Cascade);
builder.HasOne(v => v.TeamMember).WithMany().HasForeignKey(v => v.TeamMemberId).OnDelete(DeleteBehavior.Restrict);
```

---

## 4. API Endpoints

### 4.1 Win of the Week History (extend existing controller)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/win-of-the-week/history` | List all closed weeks with winners (paginated, newest first) |
| GET | `/api/v1/win-of-the-week/weeks/{weekId}` | Get full details of a specific past week (all nominations + vote counts) |

### 4.2 Win of the Month (new controller)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/win-of-the-month/current` | Get current active month contest (or null) |
| GET | `/api/v1/win-of-the-month/history` | List past month contests with winners |
| POST | `/api/v1/win-of-the-month/nominations/{nominationId}/vote` | Vote for a monthly nomination |
| DELETE | `/api/v1/win-of-the-month/nominations/{nominationId}/vote` | Remove vote |
| POST | `/api/v1/win-of-the-month/close` | Close the month and declare winner (admin) |
| POST | `/api/v1/win-of-the-month/generate` | Manually trigger generation from closed weeks (admin) |

### 4.3 DTOs

**WinWeekHistoryDto**
```csharp
public record WinWeekHistoryDto
{
    public Guid Id { get; init; }
    public DateOnly WeekStart { get; init; }
    public DateOnly WeekEnd { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public string? WinnerDescription { get; init; }
    public int WinnerVoteCount { get; init; }
    public DateTimeOffset ClosedAt { get; init; }
}
```

**WinWeekDetailDto** (for expanded view)
```csharp
public record WinWeekDetailDto
{
    public Guid Id { get; init; }
    public DateOnly WeekStart { get; init; }
    public DateOnly WeekEnd { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public List<WinNominationDto> AllNominations { get; init; } = [];
}
```

**WinMonthDto**
```csharp
public record WinMonthDto
{
    public Guid Id { get; init; }
    public int Year { get; init; }
    public int Month { get; init; }
    public string Status { get; init; }
    public string MonthName { get; init; }           // "May 2026"
    public DateTimeOffset VotingEndsAt { get; init; }
    public Guid? WinnerNominationId { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public Guid CurrentMemberId { get; init; }
    public int UserVotesRemaining { get; init; }
    public bool HasUserVoted { get; init; }          // voted in this month at all
    public List<WinMonthNominationDto> Nominations { get; init; } = [];
}
```

**WinMonthNominationDto**
```csharp
public record WinMonthNominationDto
{
    public Guid Id { get; init; }
    public Guid SourceWinWeekId { get; init; }
    public string NomineeName { get; init; }
    public string Title { get; init; }
    public string? Description { get; init; }
    public int VoteCount { get; init; }
    public bool HasVoted { get; init; }
    public DateOnly SourceWeekStart { get; init; }   // "Week of May 5"
}
```

**WinMonthHistoryDto**
```csharp
public record WinMonthHistoryDto
{
    public Guid Id { get; init; }
    public int Year { get; init; }
    public int Month { get; init; }
    public string MonthName { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public int WinnerVoteCount { get; init; }
    public DateTimeOffset ClosedAt { get; init; }
}
```

---

## 5. Service Layer

### 5.1 IWinOfTheWeekService Extensions

```csharp
Task<IReadOnlyList<WinWeekHistoryDto>> GetHistoryAsync(int? year = null, int limit = 52);
Task<WinWeekDetailDto> GetWeekDetailAsync(Guid weekId);
```

**GetHistoryAsync:**
- Query `WinWeeks` where `Status = Closed`
- Order by `WeekStart DESC`
- Optionally filter by year
- Join to `WinNomination` (winner) to get name, title, vote count
- Return limited set (default 52 weeks = 1 year)

**GetWeekDetailAsync:**
- Load specific week with all nominations
- Include vote counts per nomination
- Used for expandable detail view in history

### 5.2 New Service: IWinOfMonthService

```csharp
Task<WinMonthDto?> GetCurrentMonthAsync(Guid memberId);
Task<IReadOnlyList<WinMonthHistoryDto>> GetHistoryAsync(int? year = null);
Task<WinMonthVoteDto> VoteAsync(Guid memberId, Guid nominationId);
Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId);
Task<WinMonthDto> CloseMonthAsync(Guid memberId);
Task<WinMonthDto> GenerateFromClosedWeeksAsync(Guid memberId);
```

**GenerateFromClosedWeeksAsync:**
1. Find the most recent month that doesn't have a `WinMonth` record
2. Query `WinWeeks` where `Status = Closed` and `WeekStart` falls within that month
3. For each closed week with a `WinnerNominationId`, create a `WinMonthNomination`
4. If fewer than 2 weekly winners exist, don't create (not enough to vote on)
5. Set `VotingEndsAt` = now + 5 days
6. Return the new `WinMonthDto`

**Auto-generation trigger:** Called in `GetCurrentMonthAsync` if no active month exists and enough closed weeks are available. This ensures the month contest appears without manual admin action.

**VoteAsync:**
- Max 3 votes per person per month (same as weekly)
- Cannot vote for own nomination (weekly winner can't vote for their own entry)
- Check `VotingEndsAt` has not passed

**CloseMonthAsync:**
- Set status to `Closed`
- Pick nomination with highest votes as winner
- **Award achievement**: `win-of-month-champion` to the winner
- **Award points**: 50 bonus points via `PointAward`
- **Award voter achievement**: `win-of-month-voter` to all voters (5 points each)

### 5.3 CloseWeekAsync Enhancement

When a weekly win is closed, also award the weekly achievement:
- Award `win-of-the-week` achievement to the weekly winner (10 points)
- Check if this triggers WinMonth generation (4+ closed weeks in current month)

---

## 6. Frontend Architecture

### 6.1 Routing

Update `fun.routes.ts`:

```typescript
{
  path: '',
  component: FunHubComponent,
  children: [
    { path: '', redirectTo: 'win-of-the-week', pathMatch: 'full' },
    {
      path: 'win-of-the-week',
      loadChildren: () => import('../win-of-the-week/win-of-the-week.routes').then(m => m.WIN_OF_THE_WEEK_ROUTES)
    },
    {
      path: 'win-of-the-week/history',
      loadComponent: () => import('../win-of-the-week-history/win-of-the-week-history.component').then(m => m.WinOfTheWeekHistoryComponent)
    },
    {
      path: 'win-of-the-month',
      loadChildren: () => import('../win-of-the-month/win-of-the-month.routes').then(m => m.WIN_OF_THE_MONTH_ROUTES)
    },
    {
      path: 'leaderboard',
      loadComponent: () => import('../leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
    },
    {
      path: 'wheel',
      loadChildren: () => import('../wheel/wheel.routes').then(m => m.WHEEL_ROUTES)
    }
  ]
}
```

### 6.2 Fun Hub Nav Update

Add two new tabs to `fun-hub.component.ts`:

```html
<a class="hub-tab" routerLink="win-of-the-week" routerLinkActive="active">Win of the Week</a>
<a class="hub-tab" routerLink="win-of-the-week/history" routerLinkActive="active">History</a>
<a class="hub-tab" routerLink="win-of-the-month" routerLinkActive="active">Win of the Month</a>
<a class="hub-tab" routerLink="leaderboard" routerLinkActive="active">Leaderboard</a>
<a class="hub-tab" routerLink="wheel" routerLinkActive="active">Spin Wheel</a>
```

### 6.3 New Components

#### WinOfTheWeekHistoryComponent
- **Template**: Grid/timeline of past winners
- **Data**: `GET /api/v1/win-of-the-week/history`
- **Features**:
  - Year filter dropdown
  - Each card: winner avatar, name, title, week date, vote count
  - Click to expand → shows all nominations from that week
  - "Load more" pagination (infinite scroll or button)
- **Empty state**: "No winners yet — be the first to win!"

#### WinOfTheMonthComponent
- **Template**: Similar to WinOfTheWeekComponent but for monthly contest
- **Data**: `GET /api/v1/win-of-the-month/current`
- **Features**:
  - Header: "Win of the Month — {Month Year}"
  - Voting countdown timer (days/hours remaining)
  - List of nominations (weekly winners) with vote buttons
  - Each nomination shows source week date
  - Winner banner when closed
  - Link to month history
- **States**: Voting, Closed, No active month ("Next month's contest starts when we have enough weekly winners")

#### WinOfTheMonthHistoryComponent (inline or separate)
- Accessible via link from WinOfTheMonthComponent
- Shows past monthly winners

### 6.4 Updated Components

#### WinOfTheWeekComponent Enhancements
1. **Add voting schedule indicator**: Show a small timeline bar under the header:
   ```
   Mon ──── Tue ──── Wed ──── Thu ──── Fri ──── Sat ──── Sun
   [  NOMINATIONS OPEN  ] [     VOTING OPEN     ]
   ```
   Highlight the current day.

2. **Add link to history**: Small "View past winners" link in the header area.

3. **Add link to Win of the Month**: If an active month exists, show a banner:
   ```
   🏆 Win of the Month voting is open! Vote for your favorite weekly winner →
   ```

4. **Show upcoming voting info during nominating phase**:
   ```
   Voting opens on Friday. You have 3 votes to use.
   ```

### 6.5 New Services

**win-of-the-week-history.service.ts**
```typescript
getHistory(year?: number): Observable<WinWeekHistory[]>;
getWeekDetail(weekId: string): Observable<WinWeekDetail>;
```

**win-of-the-month.service.ts**
```typescript
getCurrentMonth(): Observable<WinMonth | null>;
getMonthHistory(year?: number): Observable<WinMonthHistory[]>;
vote(nominationId: string): Observable<WinMonthVote>;
removeVote(nominationId: string): Observable<void>;
closeMonth(): Observable<WinMonth>;
generateFromWeeks(): Observable<WinMonth>;
```

### 6.6 Model Updates

**win-week.model.ts** — add new interfaces:
```typescript
export interface WinWeekHistory {
  id: string;
  weekStart: string;
  weekEnd: string;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  winnerDescription: string | null;
  winnerVoteCount: number;
  closedAt: string;
}

export interface WinWeekDetail {
  id: string;
  weekStart: string;
  weekEnd: string;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  allNominations: WinNomination[];
}

export interface WinMonth {
  id: string;
  year: number;
  month: number;
  status: 'Voting' | 'Closed';
  monthName: string;
  votingEndsAt: string;
  winnerNominationId: string | null;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  currentMemberId: string;
  userVotesRemaining: number;
  hasUserVoted: boolean;
  nominations: WinMonthNomination[];
}

export interface WinMonthNomination {
  id: string;
  sourceWinWeekId: string;
  nomineeName: string;
  title: string;
  description: string | null;
  voteCount: number;
  hasVoted: boolean;
  sourceWeekStart: string;
}

export interface WinMonthHistory {
  id: string;
  year: number;
  month: number;
  monthName: string;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  winnerVoteCount: number;
  closedAt: string;
}
```

---

## 7. Awards & Leaderboard Integration

### 7.1 Achievement Seeding Migration

Create a migration that seeds the WoW-related achievements if they don't exist:

```csharp
var achievements = new[]
{
    new Achievement { Key = "win-of-the-week", Name = "Weekly Champion", Description = "Won Win of the Week", Icon = "emoji_events", Category = "wow", Points = 10 },
    new Achievement { Key = "win-of-month-champion", Name = "Monthly Champion", Description = "Won Win of the Month", Icon = "workspace_premium", Category = "wow", Points = 50 },
    new Achievement { Key = "win-of-month-voter", Name = "Monthly Voter", Description = "Participated in Win of the Month voting", Icon = "how_to_vote", Category = "wow", Points = 5 },
};
```

### 7.2 Award Flow

```
Weekly Close
  └─> Award "win-of-the-week" to winner (10 pts)
  └─> Check: 4+ closed weeks this month?
       └─> Yes: Auto-generate WinMonth

Monthly Close
  └─> Award "win-of-month-champion" to winner (50 pts)
  └─> Award "win-of-month-voter" to all voters (5 pts each, if not already awarded for this month)
```

### 7.3 Leaderboard Breakdown Update

The leaderboard currently shows breakdown by source: `badge`, `sprint`, `bonus`. The WoW achievements will appear under `badge` source with category `wow`. No code changes needed to `LeaderboardService` — it already groups achievements by category.

To make WoW more visible, add a dedicated breakdown source. Update `LeaderboardService.BuildEntry`:

```csharp
// WoW-specific points (sum of all wow-category achievements)
var wowPoints = m.Achievements
    .Where(a => a.Achievement.Category == "wow")
    .Sum(a => a.Achievement.Points);
if (wowPoints > 0)
    breakdown.Add(new PointBreakdownItem("wow", "Win of the Week", wowPoints, ...));
```

And add to `SOURCE_COLORS` in the leaderboard component:
```typescript
wow: { bg: 'rgba(255,215,0,0.15)', text: '#FFD700' },
```

### 7.4 Duplicate Prevention

- `win-of-the-week`: Awarded once per week win. No duplicate check needed (each week is unique).
- `win-of-month-champion`: Awarded once per month win. No duplicate check needed.
- `win-of-month-voter`: Awarded once per month per voter. Check if member already has this achievement for the specific month before awarding (use `Note` field to store month identifier: `"May 2026"`).

---

## 8. Migration Plan

### Migration: AddWinOfMonthTables

1. Create `WinMonths` table
2. Create `WinMonthNominations` table
3. Create `WinMonthVotes` table
4. Seed WoW achievements into `Achievements` table
5. Add `VoteCount` computed column or ensure it's derived correctly in queries

```sql
-- Conceptual (EF Core handles actual generation)
CREATE TABLE "WinMonths" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Year" integer NOT NULL,
    "Month" integer NOT NULL,
    "Status" varchar(20) NOT NULL DEFAULT 'Voting',
    "WinnerNominationId" uuid,
    "OpenedAt" timestamptz NOT NULL DEFAULT now(),
    "ClosedAt" timestamptz,
    "VotingEndsAt" timestamptz NOT NULL,
    UNIQUE ("Year", "Month")
);

CREATE TABLE "WinMonthNominations" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "WinMonthId" uuid NOT NULL REFERENCES "WinMonths"("Id") ON DELETE CASCADE,
    "SourceWinWeekId" uuid NOT NULL REFERENCES "WinWeeks"("Id") ON DELETE RESTRICT,
    "NomineeMemberId" uuid NOT NULL REFERENCES "TeamMembers"("Id") ON DELETE RESTRICT,
    "Title" varchar(200) NOT NULL,
    "Description" varchar(2000),
    UNIQUE ("WinMonthId", "NomineeMemberId")
);

CREATE TABLE "WinMonthVotes" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "WinMonthNominationId" uuid NOT NULL REFERENCES "WinMonthNominations"("Id") ON DELETE CASCADE,
    "TeamMemberId" uuid NOT NULL REFERENCES "TeamMembers"("Id") ON DELETE RESTRICT,
    "VotedAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("WinMonthNominationId", "TeamMemberId")
);
```

---

## 9. Phased Implementation Plan

### Phase 1: Voting Visibility Fix + History (Week 1)

**Goal:** Fix the "can't vote" confusion and add winner history.

| Task | Files | Effort |
|------|-------|--------|
| Add voting schedule indicator to WoW component | `win-of-the-week.component.ts` | 2h |
| Add "View past winners" link | `win-of-the-week.component.ts` | 1h |
| Backend: `GetHistoryAsync` endpoint | `WinOfTheWeekController.cs`, `WinOfTheWeekService.cs` | 3h |
| Backend: `GetWeekDetailAsync` endpoint | `WinOfTheWeekController.cs`, `WinOfTheWeekService.cs` | 2h |
| Frontend: `WinOfTheWeekHistoryComponent` | New component + service + routes | 4h |
| Frontend: Fun Hub nav update (History tab) | `fun-hub.component.ts`, `fun.routes.ts` | 1h |
| Tests + QA | | 2h |

**Total Phase 1: ~15h**

### Phase 2: Win of the Month Core (Week 2)

**Goal:** Full Win of the Month voting system.

| Task | Files | Effort |
|------|-------|--------|
| DB Migration: WinMonth tables + achievement seeding | New migration | 2h |
| Domain entities + configurations | `WinMonth.cs`, `WinMonthNomination.cs`, `WinMonthVote.cs`, configs | 3h |
| DTOs | `WinMonthDto.cs`, `WinMonthNominationDto.cs`, etc. | 1h |
| Service: `IWinOfMonthService` + implementation | `WinOfMonthService.cs` | 5h |
| Controller: `WinOfMonthController` | `WinOfMonthController.cs` | 2h |
| Frontend: Service + models | `win-of-the-month.service.ts`, model updates | 2h |
| Frontend: `WinOfTheMonthComponent` | New component + routes | 5h |
| Frontend: Fun Hub nav update (Win of the Month tab) | `fun-hub.component.ts`, `fun.routes.ts` | 1h |
| Tests + QA | | 3h |

**Total Phase 2: ~24h**

### Phase 3: Awards Integration + Polish (Week 3)

**Goal:** Connect WoW wins to leaderboard/achievements.

| Task | Files | Effort |
|------|-------|--------|
| Enhance `CloseWeekAsync` to award weekly achievement | `WinOfTheWeekService.cs` | 2h |
| Enhance `CloseMonthAsync` to award monthly achievements + voter awards | `WinOfMonthService.cs` | 3h |
| Leaderboard: Add "wow" breakdown source | `LeaderboardService.cs`, `leaderboard.component.ts` | 2h |
| Frontend: Cross-promotion banners (WoW → WoM, WoM → History) | `win-of-the-week.component.ts`, `win-of-the-month.component.ts` | 2h |
| Frontend: Month history view | Inline or component | 2h |
| Tests + QA | | 3h |

**Total Phase 3: ~14h**

### Phase 4: Win of the Quarter (Future)

Same pattern as Win of the Month, aggregating monthly winners. Defer until there are 3+ months of data. No schema changes needed — just a `WinQuarter` entity following the same pattern.

---

## 10. Business Rules Summary

| Rule | Weekly | Monthly |
|------|--------|---------|
| Nominations | Mon-Thu auto | Auto from weekly winners |
| Voting | Fri-Sun | 5 days from generation |
| Max votes per person | 3 | 3 |
| Can vote for own entry | No | No (weekly winner can't vote for themselves) |
| Winner selection | Most votes at close | Most votes at close |
| Achievement on win | `win-of-the-week` (10 pts) | `win-of-month-champion` (50 pts) |
| Voter achievement | None | `win-of-month-voter` (5 pts) |
| Auto-generation | On first access if no week exists | When 4+ closed weeks in a month |

---

## 11. File Change Summary

### New Files

| File | Purpose |
|------|---------|
| `src/.../Domain/Entities/WinMonth.cs` | Monthly contest entity |
| `src/.../Domain/Entities/WinMonthNomination.cs` | Monthly nomination entity |
| `src/.../Domain/Entities/WinMonthVote.cs` | Monthly vote entity |
| `src/.../Domain/Enums/WinMonthStatus.cs` | Monthly status enum |
| `src/.../Infrastructure/Data/Configurations/WinMonthConfiguration.cs` | EF config |
| `src/.../Infrastructure/Data/Configurations/WinMonthNominationConfiguration.cs` | EF config |
| `src/.../Infrastructure/Data/Configurations/WinMonthVoteConfiguration.cs` | EF config |
| `src/.../Application/DTOs/WinOfTheWeek/WinWeekHistoryDto.cs` | History DTO |
| `src/.../Application/DTOs/WinOfTheWeek/WinWeekDetailDto.cs` | Detail DTO |
| `src/.../Application/DTOs/WinOfTheMonth/WinMonthDto.cs` | Month DTO |
| `src/.../Application/DTOs/WinOfTheMonth/WinMonthNominationDto.cs` | Month nomination DTO |
| `src/.../Application/DTOs/WinOfTheMonth/WinMonthVoteDto.cs` | Month vote DTO |
| `src/.../Application/DTOs/WinOfTheMonth/WinMonthHistoryDto.cs` | Month history DTO |
| `src/.../Application/Services/WinOfMonthService.cs` | Month service |
| `src/.../Application/Services/Interfaces/IWinOfMonthService.cs` | Month service interface |
| `src/.../Presentation/Controllers/WinOfMonthController.cs` | Month controller |
| `src/.../Migrations/YYYYMMDD_AddWinOfMonthTables.cs` | EF migration |
| `team-manager-ui/.../models/win-month.model.ts` | Frontend models |
| `team-manager-ui/.../services/win-of-the-month.service.ts` | Frontend service |
| `team-manager-ui/.../services/win-of-the-week-history.service.ts` | History service |
| `team-manager-ui/.../features/win-of-the-week-history/win-of-the-week-history.component.ts` | History component |
| `team-manager-ui/.../features/win-of-the-week-history/win-of-the-week-history.routes.ts` | History routes |
| `team-manager-ui/.../features/win-of-the-month/win-of-the-month.component.ts` | Month component |
| `team-manager-ui/.../features/win-of-the-month/win-of-the-month.routes.ts` | Month routes |

### Modified Files

| File | Change |
|------|--------|
| `src/.../Application/Services/WinOfTheWeekService.cs` | Add `GetHistoryAsync`, `GetWeekDetailAsync`, award achievement on close |
| `src/.../Application/Services/Interfaces/IWinOfTheWeekService.cs` | Add new method signatures |
| `src/.../Presentation/Controllers/WinOfTheWeekController.cs` | Add history + detail endpoints |
| `src/.../Application/Services/LeaderboardService.cs` | Add "wow" breakdown source |
| `src/.../Infrastructure/Data/AppDbContext.cs` | Add `DbSet<WinMonth>`, `DbSet<WinMonthNomination>`, `DbSet<WinMonthVote>` |
| `team-manager-ui/.../features/win-of-the-week/win-of-the-week.component.ts` | Add schedule indicator, history link, WoM banner |
| `team-manager-ui/.../features/fun/fun-hub.component.ts` | Add History + Win of the Month tabs |
| `team-manager-ui/.../features/fun/fun.routes.ts` | Add child routes for history + month |
| `team-manager-ui/.../models/win-week.model.ts` | Add history + detail interfaces |

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auto-generating WinMonth creates duplicate | Medium | Unique constraint on `(Year, Month)` + check before creation |
| Weekly winner already has `win-of-the-week` achievement | Low | Idempotent award: check existing before inserting |
| Voter award duplicates for same month | Low | Check `MemberAchievement` with matching `Note` (month string) |
| Month generation with < 2 nominees | Low | Guard: only generate if 2+ weekly winners exist |
| Voting after `VotingEndsAt` | Medium | Server-side check in `VoteAsync`, not just UI |
| Performance: history endpoint loads all weeks | Low | Pagination with `limit` parameter, default 52 |
| Frontend tab overflow on mobile | Low | Fun Hub tabs already use `overflow-x: auto` |
