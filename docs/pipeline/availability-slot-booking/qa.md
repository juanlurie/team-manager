# QA Verification Report — Availability Slot Booking

**Date:** 2026-05-14
**QA Engineer:** QA
**Verdict:** PASS

---

## Backend Acceptance Criteria

### AC1: `MeetingSeriesSlotClaim` entity exists with correct fields
**PASS**

File: `src/TeamManager.Api/Domain/Entities/MeetingSeriesSlotClaim.cs`

All required fields present:
- `Id` (Guid, PK)
- `MeetingSeriesId` (Guid, FK)
- `MeetingSeriesSlotId` (Guid, FK)
- `MeetingSeriesItemId` (Guid, FK)
- `ClaimedAt` (DateTimeOffset)
- `ClaimedByMemberId` (Guid, FK)

Navigation properties: `MeetingSeries`, `MeetingSeriesSlot`, `MeetingSeriesItem`, `ClaimedByMember`

### AC2: Unique constraint on `(MeetingSeriesId, MeetingSeriesSlotId)`
**PASS**

File: `src/TeamManager.Api/Infrastructure/Data/Configurations/MeetingSeriesSlotClaimConfiguration.cs:35-37`

```csharp
builder.HasIndex(c => new { c.MeetingSeriesId, c.MeetingSeriesSlotId })
    .IsUnique()
    .HasDatabaseName("UQ_SlotClaim_Series_Slot");
```

### AC3: EF migration creates table with proper FKs and unique constraint
**PASS**

File: `src/TeamManager.Api/Migrations/20260514051847_AddMeetingSeriesSlotClaim.cs`

Migration creates `MeetingSeriesSlotClaims` table with:
- All columns with correct types
- FK to `MeetingSeriesItems` (Cascade)
- FK to `MeetingSeriesSlots` (Restrict)
- FK to `MeetingSeries` (Cascade)
- FK to `TeamMembers` (Restrict)
- Unique index `UQ_SlotClaim_Series_Slot` on `(MeetingSeriesId, MeetingSeriesSlotId)`

### AC4: `GET /api/v1/meeting-series/{seriesId}/bulk-availability` endpoint
**PASS**

File: `src/TeamManager.Api/Presentation/Controllers/MeetingSeriesController.cs:181-193`

Endpoint returns `BulkAvailabilityResponse` with items and slots including claim status. Resolves memberId from JWT claims.

### AC5: `POST /api/v1/meeting-series/{seriesId}/bulk-availability` endpoint
**PASS**

File: `src/TeamManager.Api/Presentation/Controllers/MeetingSeriesController.cs:195-218`

Accepts `BulkAvailabilityRequest`, validates item/slot membership, performs full replacement (delete removed, add new), runs confirmation checks. Handles `DbUpdateException` for 409 Conflict.

### AC6: `POST /api/v1/meeting-series/items/{itemId}/unconfirm` endpoint
**PASS**

File: `src/TeamManager.Api/Presentation/Controllers/MeetingSeriesController.cs:113-118`

Calls `service.UnconfirmItemAsync(itemId)`, returns updated series or 404.

### AC7: `CheckAndConfirmItemAsync` checks slot claims before confirming
**PASS**

File: `src/TeamManager.Api/Application/Services/MeetingSeriesService.cs:547-617`

Algorithm:
1. Loads existing claims for the series
2. Iterates slots ordered by date/time
3. Checks if all mandatory participants are available
4. Checks if slot is already claimed:
   - No claim: confirm item, create claim, create session
   - Claim by same item: no-op
   - Claim by different item: skip to next slot

### AC8: `CheckAndUnconfirmItemAsync` deletes slot claims when unconfirming
**PASS**

File: `src/TeamManager.Api/Application/Services/MeetingSeriesService.cs:620-671`

When mandatory participant condition no longer holds:
- Sets `IsConfirmed = false`, `ConfirmedSlotId = null`
- Deletes the `SlotClaim` for the item
- Deletes the associated `MeetingSession`

### AC9: Slot deletion rejects if slot is claimed (returns 409)
**PASS**

File: `src/TeamManager.Api/Application/Services/MeetingSeriesService.cs:175-179`

```csharp
var claim = await db.Set<MeetingSeriesSlotClaim>()
    .FirstOrDefaultAsync(c => c.MeetingSeriesId == seriesId && c.MeetingSeriesSlotId == slotId);
if (claim is not null)
{
    throw new InvalidOperationException("Cannot delete a slot that is claimed by a confirmed item.");
}
```

Controller catches and returns 409 Conflict.

### AC10: Item deletion cascades to delete claims and sessions
**PASS**

File: `src/TeamManager.Api/Application/Services/MeetingSeriesService.cs:264-279`

```csharp
if (item.IsConfirmed && item.ConfirmedSlotId.HasValue)
{
    var claim = await db.Set<MeetingSeriesSlotClaim>()
        .FirstOrDefaultAsync(c => c.MeetingSeriesItemId == itemId);
    if (claim is not null) db.Set<MeetingSeriesSlotClaim>().Remove(claim);

    var session = await db.Set<MeetingSession>()
        .FirstOrDefaultAsync(ms => ms.MeetingSeriesItemId == itemId);
    if (session is not null) db.Set<MeetingSession>().Remove(session);
}
```

### AC11: `MeetingSeriesSlotDto` has `IsClaimed` and `ClaimedByItemId` fields
**PASS**

File: `src/TeamManager.Api/Application/DTOs/MeetingSeries/MeetingSeriesSlotDto.cs`

```csharp
public bool IsClaimed { get; init; }
public Guid? ClaimedByItemId { get; init; }
```

### AC12: Bulk availability uses full replacement semantics
**PASS**

File: `src/TeamManager.Api/Application/Services/MeetingSeriesService.cs:462-496`

Computes `toDelete` (existing but not in request) and `toInsert` (in request but not existing) using HashSet diff.

### AC13: Transactional boundary — single SaveChanges for bulk operations
**PASS**

File: `src/TeamManager.Api/Application/Services/MeetingSeriesService.cs:492-510`

`SubmitBulkAvailabilityAsync` performs all availability changes, runs confirmation checks, then calls `SaveChangesAsync()` once at the end. `CheckAndConfirmItemAsync` and `CheckAndUnconfirmItemAsync` no longer call `SaveChangesAsync` internally.

---

## Frontend Acceptance Criteria

### AC1: New route `/meeting-series/:id/availability` exists
**PASS**

File: `team-manager-ui/src/app/features/meeting-series/meeting-series.routes.ts:16-19`

```typescript
{
  path: ':id/availability',
  loadComponent: () => import('./bulk-availability.component').then(m => m.BulkAvailabilityComponent)
}
```

### AC2: `BulkAvailabilityComponent` renders availability matrix
**PASS**

File: `team-manager-ui/src/app/features/meeting-series/bulk-availability.component.ts:66-126`

Renders a `<table class="matrix">` with items as rows and slots as columns.

### AC3: Matrix shows checkboxes for availability selection
**PASS**

File: `bulk-availability.component.ts:116-118`

```html
<span class="checkbox" [class.checked]="isSelected(item.itemId, slot.slotId)">
  @if (isSelected(item.itemId, slot.slotId)) { &check; }
</span>
```

### AC4: Claimed slots show lock indicator and are disabled
**PASS**

File: `bulk-availability.component.ts:102-119`

- Cells with `slot.isClaimed && !isClaimedByItem(...)` get `.claimed` class (amber background, lock icon, `cursor: not-allowed`)
- Click handler: `(click)="!slot.isClaimed && toggleSlot(...)"` — disabled for claimed slots
- Lock icon shown with tooltip

### AC5: Save button sends bulk availability request
**PASS**

File: `bulk-availability.component.ts:387-422`

`save()` method collects selections into `BulkAvailabilityRequest` and calls `svc.submitBulkAvailability()`.

### AC6: Conflict handling shows error banner on 409 response
**PASS**

File: `bulk-availability.component.ts:48-57, 410-412`

```typescript
if (err.status === 409) {
  this.conflictError.set(true);
  this.load(data.seriesId);
}
```

Conflict banner rendered at `bulk-availability.component.ts:48-57`.

### AC7: "Set My Availability" button added to series detail page
**PASS**

File: `team-manager-ui/src/app/features/meeting-series/meeting-series-detail.component.ts:136-140`

```html
<div class="section availability-action">
  <button mat-raised-button color="primary" [routerLink]="['/meeting-series', s.id, 'availability']">
    <mat-icon>event_available</mat-icon> Set My Availability
  </button>
</div>
```

### AC8: "My Meetings" page exists at `/my-meetings`
**PASS**

File: `team-manager-ui/src/app/app.routes.ts:68-71`

```typescript
{
  path: 'my-meetings',
  loadComponent: () => import('./features/meeting-series/my-meetings.component').then(m => m.MyMeetingsComponent)
}
```

Component at `team-manager-ui/src/app/features/meeting-series/my-meetings.component.ts`.

### AC9: Model interfaces match backend DTOs
**PASS**

File: `team-manager-ui/src/app/core/models/meeting-series.model.ts:116-159`

- `MyMeetingItem` matches backend anonymous type
- `BulkAvailabilityItem` matches `BulkAvailabilityItemDto`
- `BulkAvailabilitySlot` matches `BulkAvailabilitySlotDto`
- `BulkAvailabilityResponse` matches `BulkAvailabilityResponse`
- `BulkAvailabilityRequest` matches `BulkAvailabilityRequest`

---

## Build Verification

### Backend compiles without errors
**PASS**

```
dotnet build: Build succeeded. 0 Error(s).
```

### Frontend compiles without errors
**PASS**

```
ng build: Output location: /opt/services/team-manager/team-manager-ui/dist/team-manager-ui
```

(Only SCSS deprecation warnings unrelated to this feature.)

---

## Verdict: PASS

All 22 acceptance criteria verified. The implementation meets the requirements from the architecture and UX design documents.
