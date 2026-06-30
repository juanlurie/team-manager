# Architecture: Extend Milestones with Global/Squad Scoping

## Feature Request

Extend milestones so they are linked either globally or to specific squads. The purpose is to motivate the team with the progress made but still show what the future needs to get to the final product.

## Current State

Milestones are currently scoped only to PIs (Program Increments). The data model:

- `Milestone` has a required `PIId` FK to `PI`
- `Milestone` has `Title`, `Description`, `TargetDate`, `Status` (Upcoming/InProgress/Done), `Position`
- `Milestone` has a collection of `MilestoneCriterion` (checklist items)
- `WorkItem` has an optional `MilestoneId` FK linking work to milestones
- Progress is auto-calculated based on completed work items

Squads are cross-cutting team groupings:
- `Squad` has `Name`, `Color`, and a collection of `SquadMember`
- `SquadMember` is a join table between `Squad` and `TeamMember`

## Design Decisions

### 1. Scope Type Pattern

Add a `ScopeType` property to `Milestone` with values:
- `Global` — visible to all team members, represents overall product milestones
- `Squad` — scoped to a specific squad, represents squad-specific milestones

This is implemented as:
- New enum `MilestoneScope` (Global, Squad) stored as string in DB
- New optional `SquadId` FK on `Milestone` (null when scope is Global)
- Validation: when `Scope` is `Squad`, `SquadId` must be non-null

### 2. Motivation & Progress Display

To motivate the team and show future work:

- **Progress bar** on each milestone showing completion percentage (already exists, enhanced)
- **Visual distinction** between global and squad-scoped milestones in the UI
- **Milestone timeline** in PI detail shows both global and squad milestones with clear labeling
- **"Road to Product" view** — a new component showing all milestones across a PI with their status, giving a bird's-eye view of how close the team is to the final product
- **Completion celebration** — visual indicator when a milestone reaches Done status

### 3. Filtering & Access

- Global milestones appear for all users
- Squad-scoped milestones appear only for members of that squad
- In PI detail, users see: all global milestones + their squad's milestones
- A toggle/filter allows viewing "All", "Global Only", or "My Squads"

## Data Model Changes

### New Enum

```csharp
// Domain/Enums/MilestoneScope.cs
public enum MilestoneScope
{
    Global,
    Squad
}
```

### Modified Entity: Milestone

```csharp
// Domain/Entities/Milestone.cs (additions)
public MilestoneScope Scope { get; set; } = MilestoneScope.Global;
public Guid? SquadId { get; set; }
public Squad? Squad { get; set; }
```

### EF Core Configuration

```csharp
// Infrastructure/Data/Configurations/MilestoneConfiguration.cs (additions)
builder.Property(m => m.Scope).HasConversion<string>().HasDefaultValue("Global");
builder.Property(m => m.SquadId).IsRequired(false);
builder.HasOne(m => m.Squad).WithMany().HasForeignKey(m => m.SquadId).OnDelete(DeleteBehavior.SetNull);
```

### DTO Changes

```csharp
// Application/DTOs/Milestones/CreateMilestoneRequest.cs (additions)
public MilestoneScope Scope { get; set; } = MilestoneScope.Global;
public Guid? SquadId { get; set; }

// Application/DTOs/Milestones/MilestoneDto.cs (additions)
public MilestoneScope Scope { get; set; }
public Guid? SquadId { get; set; }
public string? SquadName { get; set; }  // Denormalized for display
```

## API Changes

### Modified Endpoints

#### `POST /api/v1/pis/{piId}/milestones`
- Request body now accepts optional `scope` (default "Global") and `squadId`
- Validation: if scope is "Squad", squadId is required and must exist

#### `PUT /api/v1/milestones/{id}`
- Request body now accepts optional `scope` and `squadId`
- Same validation rules

#### `GET /api/v1/pis/{piId}/milestones`
- New query parameter: `?scope=Global|Squad|All` (default: All for team leads, filtered for members)
- New query parameter: `?squadId={guid}` to filter by specific squad
- For non-team-lead users: automatically filters to Global + their squads' milestones

### New Endpoints

#### `GET /api/v1/pis/{piId}/milestones/roadmap`
- Returns a roadmap view: all milestones for a PI ordered by target date
- Includes progress summary, status distribution, and "days until target"
- Designed for the "Road to Product" visualization

Response:
```json
{
  "piId": "...",
  "piName": "...",
  "totalMilestones": 10,
  "completedMilestones": 4,
  "inProgressMilestones": 2,
  "upcomingMilestones": 4,
  "overallProgressPercent": 40,
  "milestones": [
    {
      "id": "...",
      "title": "...",
      "scope": "Global",
      "squadName": null,
      "status": "Done",
      "targetDate": "2025-03-01",
      "progressPercent": 100,
      "daysUntilTarget": -30,
      "criteriaTotal": 5,
      "criteriaCompleted": 5
    }
  ]
}
```

## Frontend Changes

### Modified Components

#### `pi-detail.component.ts`
- Milestone timeline now shows scope indicator (globe icon for Global, squad icon for Squad)
- Squad-scoped milestones show the squad name/color badge
- Add filter bar: "All" | "Global" | "My Squads"
- Only shows relevant milestones based on user's squad membership

#### `milestone-detail.component.ts`
- Shows scope badge in header
- Shows squad info when scope is Squad

### New Components

#### `milestone-roadmap.component.ts`
- New route: `/pis/{piId}/roadmap`
- Visual timeline/roadmap showing all milestones in chronological order
- Progress indicators, status colors, and "Road to Product" header
- Shows overall PI progress percentage prominently
- Groups milestones by status (Done, In Progress, Upcoming)

#### `milestone-scope-badge.component.ts`
- Reusable badge component showing scope type
- Globe icon + "Global" text for global milestones
- Squad color dot + squad name for squad-scoped milestones

### Model Changes

```typescript
// milestone.model.ts (additions)
export type MilestoneScope = 'Global' | 'Squad';

export interface Milestone {
  // ... existing fields
  scope: MilestoneScope;
  squadId?: string;
  squadName?: string;
}

export interface MilestoneRoadmap {
  piId: string;
  piName: string;
  totalMilestones: number;
  completedMilestones: number;
  inProgressMilestones: number;
  upcomingMilestones: number;
  overallProgressPercent: number;
  milestones: MilestoneRoadmapItem[];
}

export interface MilestoneRoadmapItem {
  id: string;
  title: string;
  scope: MilestoneScope;
  squadName?: string;
  status: MilestoneStatus;
  targetDate?: string;
  progressPercent: number;
  daysUntilTarget: number;
  criteriaTotal: number;
  criteriaCompleted: number;
}
```

### Service Changes

```typescript
// milestone.service.ts (additions)
getRoadmap(piId: string): Observable<MilestoneRoadmap>
getByPI(piId: string, scope?: string, squadId?: string): Observable<Milestone[]>
```

## Migration Strategy

### EF Core Migration

Create a new migration that:
1. Adds `Scope` column to `Milestones` table (string, default 'Global')
2. Adds `SquadId` column to `Milestones` table (nullable UUID)
3. Adds foreign key constraint from `Milestones.SquadId` to `Squads.Id` with `SET NULL` on delete
4. Sets all existing milestones to `Scope = 'Global'` (backward compatible)

### Backward Compatibility

- All existing milestones automatically become `Global` scope
- Existing API calls without `scope` parameter default to `Global`
- Existing frontend continues to work (Global milestones are visible to all)
- New `scope` and `squadId` fields are optional in create/update requests

## Files to Create or Modify

### Backend
1. **NEW** `src/TeamManager.Api/Domain/Enums/MilestoneScope.cs` — New enum
2. **MODIFY** `src/TeamManager.Api/Domain/Entities/Milestone.cs` — Add Scope, SquadId, Squad
3. **MODIFY** `src/TeamManager.Api/Infrastructure/Data/Configurations/MilestoneConfiguration.cs` — Add configuration
4. **MODIFY** `src/TeamManager.Api/Application/DTOs/Milestones/CreateMilestoneRequest.cs` — Add fields
5. **MODIFY** `src/TeamManager.Api/Application/DTOs/Milestones/UpdateMilestoneRequest.cs` — Add fields
6. **MODIFY** `src/TeamManager.Api/Application/DTOs/Milestones/MilestoneDto.cs` — Add fields
7. **MODIFY** `src/TeamManager.Api/Application/Services/MilestoneService.cs` — Add roadmap endpoint, squad filtering
8. **MODIFY** `src/TeamManager.Api/Application/Services/Interfaces/IMilestoneService.cs` — Add interface methods
9. **MODIFY** `src/TeamManager.Api/Presentation/Controllers/MilestonesController.cs` — Add roadmap endpoint, query params
10. **NEW** EF Core migration file

### Frontend
11. **MODIFY** `team-manager-ui/src/app/core/models/milestone.model.ts` — Add types
12. **MODIFY** `team-manager-ui/src/app/core/services/milestone.service.ts` — Add methods
13. **MODIFY** `team-manager-ui/src/app/features/pi-detail/pi-detail.component.ts` — Add filtering, scope badges
14. **MODIFY** `team-manager-ui/src/app/features/pi-detail/pi-detail.component.html` — Update template
15. **MODIFY** `team-manager-ui/src/app/features/milestones/milestone-detail.component.ts` — Show scope
16. **MODIFY** `team-manager-ui/src/app/features/milestones/milestone-detail.component.html` — Update template
17. **NEW** `team-manager-ui/src/app/features/milestones/milestone-roadmap.component.ts` — Roadmap view
18. **NEW** `team-manager-ui/src/app/features/milestones/milestone-roadmap.component.html` — Roadmap template
19. **NEW** `team-manager-ui/src/app/shared/components/milestone-scope-badge.component.ts` — Badge component
20. **MODIFY** `team-manager-ui/src/app/app.routes.ts` — Add roadmap route
