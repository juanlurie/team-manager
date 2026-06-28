# PR Review: Extend Milestones with Global/Squad Scoping

## Verdict: APPROVE (with minor notes)

## Summary

This PR implements milestone scoping (Global/Squad) with a "Road to Product" roadmap view. The changes span the full stack: database migration, backend API, and Angular frontend. Both backend and frontend build successfully with no errors.

## What Was Changed

### Backend
- New `MilestoneScope` enum (Global, Squad)
- `Milestone` entity extended with `Scope`, `SquadId`, `Squad` navigation property
- EF Core configuration updated with Squad FK relationship (SetNull on delete)
- DTOs extended with scope/squad fields; new `MilestoneRoadmapDto` and `MilestoneRoadmapItemDto`
- `MilestoneService.GetByPIAsync` now accepts optional `scope` and `squadId` query filters
- New `MilestoneService.GetRoadmapAsync` for the roadmap view
- New `MilestoneRoadmapController` at `GET /api/v1/pis/{piId}/milestones/roadmap`
- Validation: `SquadId` required when `Scope` is `Squad`
- EF Core migration: adds `Scope` (string, default 'Global') and `SquadId` (nullable UUID) columns

### Frontend
- `MilestoneScope` type added to models; `Milestone`, `CreateMilestoneRequest`, `UpdateMilestoneRequest` extended
- New `MilestoneRoadmap` and `MilestoneRoadmapItem` interfaces
- `MilestoneService.getByPI` accepts optional `scope`/`squadId` params; new `getRoadmap` method
- New `MilestoneScopeBadgeComponent` — reusable badge showing globe icon (Global) or squad color dot (Squad)
- `PIDetailComponent` enhanced with:
  - Filter bar (All | Global | My Squads) using `mat-button-toggle-group`
  - Scope badges on each timeline node
  - Squad-colored border on squad-scoped milestone nodes
  - "Road to Product" link button
  - Proper `MatDialog` for creating milestones (replaces `prompt()`)
- `MilestoneDetailComponent` enhanced with:
  - Scope badge in header
  - Motivational messages ("Almost there!", "Milestone complete!")
  - "What's next" section showing remaining tasks and criteria
- New `MilestoneRoadmapComponent` at `/pis/:id/roadmap`

## Code Quality Assessment

### Strengths
1. **Backward compatible**: All existing milestones default to `Global` scope; existing API calls work unchanged
2. **Clean architecture**: Follows existing patterns (DTOs, service layer, controllers, EF Core configurations)
3. **Proper validation**: `SquadId` is required when scope is `Squad`
4. **Good use of signals/computed**: Angular frontend uses modern signal-based reactive patterns
5. **EF Include optimization**: Roadmap and list queries include `Squad` to avoid N+1
6. **Migration is clean**: Simple column additions with proper defaults and FK constraints

### Minor Notes (non-blocking)

1. **UpdateAsync SquadId logic** (`MilestoneService.cs:193-197`):
   ```csharp
   if (request.SquadId.HasValue || (request.Scope.HasValue && request.Scope.Value == MilestoneScope.Global))
   {
       milestone.SquadId = request.SquadId;
   }
   ```
   This correctly clears `SquadId` when switching from Squad to Global scope. However, it's slightly confusing — a comment explaining the intent would help.

2. **Missing `[RequireFeature]` on RoadmapController**: The `MilestoneRoadmapController` doesn't have the `[RequireFeature("features")]` attribute that other milestone controllers have. This is likely intentional (roadmap should be public within the app), but worth noting.

3. **Frontend filter uses all squads**: The PI detail component fetches ALL squads (`squadSvc.getAll()`) rather than just the user's squads. In a large organization, this could be optimized. For now it's acceptable since the squad list is typically small.

4. **No unit tests**: The diff doesn't include any new tests. This is consistent with the existing codebase pattern (no test files were found in the repo), but worth noting for future improvement.

5. **Migration file naming**: The migration uses a manual timestamp (`20260528000000`). In a team environment, using `dotnet ef migrations add` would generate a proper timestamp. The migration content is correct though.

## Breaking Changes

**None.** All changes are additive and backward compatible:
- New enum values default to existing behavior
- New API query parameters are optional
- New DTO fields have defaults
- Existing milestones are unaffected

## Security

- No new security concerns identified
- Squad filtering is done server-side (not just client-side)
- FK relationship uses `SetNull` to prevent orphaned references

## Performance

- `GetByPIAsync` includes `Squad` — one additional JOIN, negligible impact
- `GetRoadmapAsync` is efficient with a single query + in-memory projection
- No N+1 query issues detected

## Files Changed Summary

| Type | Count | Files |
|------|-------|-------|
| New | 4 | `MilestoneScope.cs`, `MilestoneScopeBadgeComponent`, `MilestoneRoadmapComponent`, migration |
| Modified | 12 | Entity, Config, DTOs (3), Service, Interface, Controller, Model, Service (FE), 2 components, routes |
