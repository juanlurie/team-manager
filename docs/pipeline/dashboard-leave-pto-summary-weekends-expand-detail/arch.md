# Architecture: Dashboard Leave / PTO Summary with Weekends & Expandable Detail

## 1. Feature Summary

Replace the flat "On Leave" section on the sprint dashboard with an expandable **Leave & PTO Summary** card that:

- Shows summary stats (collapsed state): **members on leave today**, **total calendar leave days** (including weekends), **total working leave days**.
- Includes weekends in the date range — the summary shows calendar-day coverage, not just working-day counts.
- Expands to show a **per-member detail breakdown**: each member on leave during the sprint, grouped optionally by leave type, with their individual records showing start/end dates, working days, and calendar days.

---

## 2. Backend Changes

### 2.1 New DTO — `DashboardLeaveSummaryDto`

**File:** `src/TeamManager.Api/Application/DTOs/Dashboard/DashboardLeaveSummaryDto.cs`

```csharp
namespace TeamManager.Api.Application.DTOs.Dashboard;

public record DashboardLeaveSummaryDto
{
    public int MembersOnLeaveToday { get; init; }
    public int MembersOnLeaveTotal { get; init; }
    public decimal TotalWorkingDays { get; init; }
    public decimal TotalCalendarDays { get; init; }
    public List<LeaveTypeSummaryDto> ByType { get; init; } = [];
    public List<MemberLeaveDetailDto> Members { get; init; } = [];
}

public record LeaveTypeSummaryDto
{
    public string Type { get; init; } = string.Empty;
    public int RecordCount { get; init; }
    public decimal WorkingDays { get; init; }
    public decimal CalendarDays { get; init; }
}

public record MemberLeaveDetailDto
{
    public Guid TeamMemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public int RecordCount { get; init; }
    public decimal TotalWorkingDays { get; init; }
    public decimal TotalCalendarDays { get; init; }
    public List<DetailedLeaveRecordDto> Records { get; init; } = [];
}

public record DetailedLeaveRecordDto
{
    public Guid Id { get; init; }
    public string Type { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public decimal WorkingDays { get; init; }   // existing DaysCount
    public decimal CalendarDays { get; init; }  // EndDate - StartDate + 1 (inclusive)
    public string? Notes { get; init; }
}
```

### 2.2 New Interface Method

**File:** `src/TeamManager.Api/Application/Services/Interfaces/IDashboardService.cs`

Add to existing interface:

```csharp
Task<DashboardLeaveSummaryDto?> GetLeaveSummaryAsync(Guid sprintId);
```

### 2.3 New Service Method

**File:** `src/TeamManager.Api/Application/Services/DashboardService.cs`

Add method and helper:

```csharp
public async Task<DashboardLeaveSummaryDto?> GetLeaveSummaryAsync(Guid sprintId)
{
    var sprint = await db.Sprints.FindAsync(sprintId);
    if (sprint is null) return null;

    var memberIds = await db.SprintMembers
        .Where(sm => sm.SprintId == sprintId)
        .Select(sm => sm.TeamMemberId)
        .ToListAsync();

    if (memberIds.Count == 0)
        return new DashboardLeaveSummaryDto();

    var today = DateOnly.FromDateTime(DateTime.UtcNow);

    var records = await db.LeaveRecords
        .Include(l => l.TeamMember)
        .Where(l =>
            memberIds.Contains(l.TeamMemberId) &&
            l.StartDate <= sprint.EndDate &&
            l.EndDate >= sprint.StartDate)
        .OrderBy(l => l.TeamMember.LastName)
        .ThenBy(l => l.TeamMember.FirstName)
        .ThenBy(l => l.StartDate)
        .ToListAsync();

    var membersOnLeaveToday = records
        .Where(l => l.StartDate <= today && l.EndDate >= today)
        .Select(l => l.TeamMemberId)
        .Distinct()
        .Count();

    var byType = records
        .GroupBy(l => l.Type)
        .Select(g => new LeaveTypeSummaryDto
        {
            Type = g.Key.ToString(),
            RecordCount = g.Count(),
            WorkingDays = g.Sum(l => l.DaysCount),
            CalendarDays = g.Sum(l => CalendarDaysBetween(l.StartDate, l.EndDate))
        })
        .ToList();

    var members = records
        .GroupBy(l => l.TeamMemberId)
        .Select(g =>
        {
            var first = g.First();
            return new MemberLeaveDetailDto
            {
                TeamMemberId = g.Key,
                MemberName = $"{first.TeamMember.FirstName} {first.TeamMember.LastName}",
                RecordCount = g.Count(),
                TotalWorkingDays = g.Sum(l => l.DaysCount),
                TotalCalendarDays = g.Sum(l => CalendarDaysBetween(l.StartDate, l.EndDate)),
                Records = g.Select(l => new DetailedLeaveRecordDto
                {
                    Id = l.Id,
                    Type = l.Type.ToString(),
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    WorkingDays = l.DaysCount,
                    CalendarDays = CalendarDaysBetween(l.StartDate, l.EndDate),
                    Notes = l.Notes
                }).ToList()
            };
        })
        .OrderBy(m => m.MemberName)
        .ToList();

    return new DashboardLeaveSummaryDto
    {
        MembersOnLeaveToday = membersOnLeaveToday,
        MembersOnLeaveTotal = members.Count,
        TotalWorkingDays = records.Sum(l => l.DaysCount),
        TotalCalendarDays = records.Sum(l => CalendarDaysBetween(l.StartDate, l.EndDate)),
        ByType = byType,
        Members = members
    };
}

private static decimal CalendarDaysBetween(DateOnly start, DateOnly end)
{
    return end.DayNumber - start.DayNumber + 1;
}
```

**Calendar days calculation:** `end.DayNumber - start.DayNumber + 1` gives the inclusive count of calendar days between two `DateOnly` values. This includes all days (weekdays + weekends). This is a pure C# operation with no timezone concerns.

### 2.4 New API Endpoint

**File:** `src/TeamManager.Api/Presentation/Controllers/DashboardController.cs`

Add:

```csharp
[HttpGet("sprint/{sprintId:guid}/leave-summary")]
public async Task<IActionResult> GetLeaveSummary(Guid sprintId)
{
    var result = await service.GetLeaveSummaryAsync(sprintId);
    return result is null ? NotFound() : Ok(result);
}
```

### 2.5 Backend File Summary

| Action | File Path |
|---|---|
| **NEW** | `src/TeamManager.Api/Application/DTOs/Dashboard/DashboardLeaveSummaryDto.cs` |
| **MODIFY** | `src/TeamManager.Api/Application/Services/Interfaces/IDashboardService.cs` |
| **MODIFY** | `src/TeamManager.Api/Application/Services/DashboardService.cs` |
| **MODIFY** | `src/TeamManager.Api/Presentation/Controllers/DashboardController.cs` |

---

## 3. Frontend Changes

### 3.1 New Model Types

**File:** `team-manager-ui/src/app/core/models/dashboard.model.ts`

Append:

```typescript
export interface DashboardLeaveSummary {
  membersOnLeaveToday: number;
  membersOnLeaveTotal: number;
  totalWorkingDays: number;
  totalCalendarDays: number;
  byType: LeaveTypeSummary[];
  members: MemberLeaveDetail[];
}

export interface LeaveTypeSummary {
  type: string;
  recordCount: number;
  workingDays: number;
  calendarDays: number;
}

export interface MemberLeaveDetail {
  teamMemberId: string;
  memberName: string;
  recordCount: number;
  totalWorkingDays: number;
  totalCalendarDays: number;
  records: DetailedLeaveRecord[];
}

export interface DetailedLeaveRecord {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  calendarDays: number;
  notes: string | null;
}
```

### 3.2 New Dashboard Service Method

**File:** `team-manager-ui/src/app/core/services/dashboard.service.ts`

Add:

```typescript
getLeaveSummary(sprintId: string): Observable<DashboardLeaveSummary> {
  return this.http.get<DashboardLeaveSummary>(`${API_BASE}/dashboard/sprint/${sprintId}/leave-summary`);
}
```

### 3.3 New Component — `LeaveSummaryCardComponent`

**File:** `team-manager-ui/src/app/features/dashboard/leave-summary-card/leave-summary-card.component.ts`

Standalone Angular component with:

**State:**
- `leaveSummary` — input `Signal<DashboardLeaveSummary | null>`
- `expanded` — internal signal (boolean), toggled by click

**Template structure (collapsed):**
```
┌──────────────────────────────────────────────┐
│ 🏖 Leave & PTO Summary          ▼ expand icon │
│ X on leave today · Y total · Z calendar days │
└──────────────────────────────────────────────┘
```

**Template structure (expanded):**
```
┌──────────────────────────────────────────────┐
│ 🏖 Leave & PTO Summary          ▲ collapse    │
│ X on leave today · Y total · Z calendar days │
│                                              │
│ By Type:                                     │
│   Annual: 5 records · 12d working · 16d cal  │
│   Sick:   2 records · 3d working · 4d cal    │
│                                              │
│ Team Members:                                │
│ ┌─ Alice Smith (3 records, 8d working) ────┐ │
│ │ Annual  10 Jan – 12 Jan  3d work  4d cal  │ │
│ │ Sick    15 Jan – 15 Jan  1d work  1d cal  │ │
│ │ Other   20 Jan – 22 Jan  2d work  3d cal  │ │
│ └───────────────────────────────────────────┘ │
│ ┌─ Bob Jones (1 record, 2d working) ───────┐ │
│ │ Annual  5 Jan – 8 Jan   2d work  4d cal   │ │
│ └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Interaction:**
- Click the header bar or the chevron icon to toggle `expanded`
- CSS transition on max-height for smooth expand/collapse (or `*ngIf` — simple toggle is fine)

**Styling:** Follow existing pattern from the "On Leave" section — use the same purple-ish color scheme (`#ce93d8`, `rgba(206,147,216,0.06)` background).

### 3.4 Modify Sprint Dashboard Component

**File:** `team-manager-ui/src/app/features/dashboard/sprint-dashboard/sprint-dashboard.component.ts`

Changes:

1. **Add import** for the new component + model types:
   ```typescript
   import { LeaveSummaryCardComponent } from '../leave-summary-card/leave-summary-card.component';
   import { DashboardLeaveSummary } from '../../../core/models/dashboard.model';
   ```

2. **Add import** to component's `imports` array:
   ```typescript
   imports: [..., LeaveSummaryCardComponent]
   ```

3. **Add signal:**
   ```typescript
   leaveSummary = signal<DashboardLeaveSummary | null>(null);
   ```

4. **Add to `load()` method** — fetch alongside other data:
   ```typescript
   leaveSummary: this.dashSvc.getLeaveSummary(sprint.id),
   ```
   And in the forkJoin subscription:
   ```typescript
   this.leaveSummary.set(res['leaveSummary'] ?? null);
   ```

5. **Replace the existing "On Leave" section** (lines 279-306) with the new component:
   ```html
   <!-- Leave & PTO Summary -->
   @if (leaveSummary()) {
     <app-leave-summary-card [leaveSummary]="leaveSummary()!" style="display:block;margin-bottom:28px" />
   }
   ```

6. The old `leaveWindow`, `leaveByDay`, and `namesOf` can be **removed** (they are no longer used) — though `leaveWindow` is still populated in `load()`, we can keep the request for backward compatibility or remove it entirely. Since we now have `leaveSummary`, the old `leaveWindow`/`leaveByDay` logic is superseded.

### 3.5 Frontend File Summary

| Action | File Path |
|---|---|
| **MODIFY** | `team-manager-ui/src/app/core/models/dashboard.model.ts` |
| **MODIFY** | `team-manager-ui/src/app/core/services/dashboard.service.ts` |
| **NEW** | `team-manager-ui/src/app/features/dashboard/leave-summary-card/leave-summary-card.component.ts` |
| **MODIFY** | `team-manager-ui/src/app/features/dashboard/sprint-dashboard/sprint-dashboard.component.ts` |

---

## 4. Data Flow Diagram

```
┌──────────────┐     GET /api/v1/dashboard/sprint/{id}/leave-summary
│  Angular      │ ──────────────────────────────────────────────────► ┌──────────────────┐
│  Sprint       │                                                     │ DashboardController│
│  Dashboard    │                                                     │  GetLeaveSummary() │
│  Component    │ ◄────────────────────────────────────────────────── │                   │
│               │     JSON: DashboardLeaveSummaryDto                  └──────┬───────────┘
│  ┌─────────┐  │                                                           │
│  │ Leave    │  │                                                          ▼
│  │ Summary  │  │                                                  ┌──────────────────┐
│  │ Card     │  │                                                  │  DashboardService │
│  │ Component│  │                                                  │  GetLeaveSummary  │
│  └─────────┘  │                                                  │  Async()          │
└──────────────┘                                                       │
                                                                       │
                                                                       ▼
                                                                ┌──────────────────┐
                                                                │    AppDbContext   │
                                                                │  (EF Core)        │
                                                                │                   │
                                                                │  ┌─────────────┐  │
                                                                │  │ LeaveRecords │  │
                                                                │  │ TeamMembers  │  │
                                                                │  │ SprintMembers│  │
                                                                │  │ Sprints      │  │
                                                                │  └─────────────┘  │
                                                                └──────────────────┘

Data transformation path:
  DB rows ─► Group by TeamMemberId ─► Compute CalendarDays ─► Build DTO tree ─► JSON
```

---

## 5. Component Tree

```
AppComponent
└── SprintDashboardComponent
    ├── CurrentSprintCardComponent
    ├── Stat pills (inline)
    ├── Sprint progress (inline)
    ├── Discussion points (inline)
    ├── Retro actions (inline)
    ├── PI Progress (inline)
    ├── Celebrations (inline)
    ├── LeaveSummaryCardComponent     ◄── NEW / REPLACES old inline "On Leave"
    ├── Blockers section (inline)
    └── (MVP section...)
```

The `LeaveSummaryCardComponent` is a **child presentational component** of `SprintDashboardComponent`. It receives `leaveSummary` as an input and manages its own expand/collapse state internally.

---

## 6. API Contract

### `GET /api/v1/dashboard/sprint/{sprintId}/leave-summary`

**Response 200:**

```json
{
  "membersOnLeaveToday": 3,
  "membersOnLeaveTotal": 8,
  "totalWorkingDays": 24.5,
  "totalCalendarDays": 34,
  "byType": [
    {
      "type": "Annual",
      "recordCount": 5,
      "workingDays": 12.0,
      "calendarDays": 16
    },
    {
      "type": "Sick",
      "recordCount": 2,
      "workingDays": 3.0,
      "calendarDays": 4
    }
  ],
  "members": [
    {
      "teamMemberId": "guid-1",
      "memberName": "Alice Smith",
      "recordCount": 3,
      "totalWorkingDays": 8.0,
      "totalCalendarDays": 11,
      "records": [
        {
          "id": "guid-1a",
          "type": "Annual",
          "startDate": "2026-05-10",
          "endDate": "2026-05-12",
          "workingDays": 3.0,
          "calendarDays": 3,
          "notes": null
        },
        {
          "id": "guid-1b",
          "type": "Annual",
          "startDate": "2026-05-18",
          "endDate": "2026-05-21",
          "workingDays": 4.0,
          "calendarDays": 4,
          "notes": "Conference"
        }
      ]
    }
  ]
}
```

**Response 404** — sprint not found:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231",
  "title": "Not Found",
  "status": 404
}
```

**Notes:**
- `totalCalendarDays` and per-record `calendarDays` are computed as `EndDate - StartDate + 1` (inclusive of both endpoints, includes weekends).
- `workingDays` is the existing `DaysCount` from the DB (working days only).
- If the sprint has no members or no leave records, the response is `{ membersOnLeaveToday: 0, membersOnLeaveTotal: 0, totalWorkingDays: 0, totalCalendarDays: 0, byType: [], members: [] }` (not 404).
- 404 only returned when the sprintId does not exist.

---

## 7. Calendar Days Computation Logic

**Formula:** `CalendarDays = EndDate.DayNumber - StartDate.DayNumber + 1`

`DateOnly.DayNumber` returns the number of days since `0001-01-01` (proleptic Gregorian). The difference gives the exact count of calendar days between two dates. Adding 1 makes it inclusive.

Example:
| Start | End | Working Days (DaysCount) | Calendar Days | Why |
|-------|-----|--------------------------|---------------|-----|
| Fri 9 May | Mon 12 May | 2 | 4 | Fri–Sat–Sun–Mon = 4 calendar days, 2 working days |
| Mon 12 May | Wed 14 May | 3 | 3 | All weekdays, same count |
| Fri 9 May | Fri 9 May | 1 | 1 | Single day |

This logic is computed at the service layer in C#, not in the database, because `DaysCount` is already a stored value. The calendar days are derived purely from `StartDate` and `EndDate`.

---

## 8. Migration / Data Concerns

- **No database migration needed.** The `DaysCount` column remains unchanged (working days only). Calendar days are computed on-the-fly in C# using the formula above.
- **No seed data changes.**
- **Existing API consumers** (if any) are unaffected — this is a new endpoint and a new component. Old `GET /leave-records` still works the same way.
