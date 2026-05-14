# Connect Catalog to Meetings — Architecture Document

## Overview

When a `SessionDefinitionSlot` reaches `IsConfirmed = true` (all mandatory participants have booked), the system automatically creates a `MeetingSession` in the meeting planner domain. Each confirmed slot becomes its own `MeetingSession` so it appears as a real planned meeting. The two domains remain separate but are linked via foreign key references for traceability.

The flow builds on the existing auto-fill logic in `SessionDefinitionService` — when a booking or unbooking changes `IsConfirmed`, the bridging logic fires synchronously to create, update, or tear down the corresponding `MeetingSession`.

---

## Key Design Decisions

### 1. One confirmed Slot → one MeetingSession

A `SessionDefinition` can have multiple time windows. Each window that fills up should become its own `MeetingSession` in the planner. This avoids the complexity of merging multiple slots into a single session with disjoint dates/times/locations.

| Concept | Maps to |
|---|---|
| SessionDefinition | Parent catalog item (no time) |
| SessionDefinitionSlot | A specific time window (date, start, end, location) |
| SessionDefinitionSlot (confirmed) | Auto-creates 1 MeetingSession |
| SessionDefinitionBooking (per participant on confirmed slot) | Auto-creates 1 MeetingSlot (with TeamMemberId assigned) |

### 2. Foreign keys on MeetingSession (add, not modify)

Add two nullable FK columns to `MeetingSession`. The existing entities are not structurally changed — only new FKs are added.

```
MeetingSession.SessionDefinitionSlotId → SessionDefinitionSlot.Id (nullable, unique)
MeetingSession.SessionDefinitionId     → SessionDefinition.Id     (nullable)
```

`SessionDefinitionSlotId` has a unique constraint — one slot can create at most one MeetingSession.

### 3. Meeting planner shows catalog origin

The `MeetingSession` DTO gains two new fields (`sessionDefinitionId`, `sessionDefinitionName`) so the UI can display a "From Catalog" badge and link back to the catalog item.

### 4. Status flows both directions

| Trigger | Action |
|---|---|
| Slot transitions false → true | Create MeetingSession (status = Filled) + MeetingSlots for each booking |
| Slot transitions true → false (unbooking causes mandatory not met) | Delete the MeetingSession (cascade deletes MeetingSlots) |
| Slot deleted while confirmed | Delete the associated MeetingSession |
| SessionDefinition deleted | Associated confirmed slots' MeetingSessions are deleted |

### 5. No new linking entities

The FK on `MeetingSession` is sufficient. No bridge table or new domain entity is needed.

---

## Entity Changes

### MeetingSession — two new nullable FK columns

```
(Existing fields...)

Guid? SessionDefinitionSlotId     NEW — FK → SessionDefinitionSlot.Id (unique, nullable)
Guid? SessionDefinitionId         NEW — FK → SessionDefinition.Id     (nullable)

→ SessionDefinitionSlot? SessionDefinitionSlot  (navigation, NEW)
→ SessionDefinition? SessionDefinition          (navigation, NEW)
```

**Unique constraint:** `SessionDefinitionSlotId` must be unique (non-null values only — filtered unique index in PostgreSQL).

### SessionDefinition — no changes

No new fields. The relationship is navigable from `MeetingSession.SessionDefinitionId`.

### SessionDefinitionSlot — no changes

No new fields. The relationship is navigable from `MeetingSession.SessionDefinitionSlotId`.

---

## Auto-Create / Bridging Logic

### Trigger point

The bridging logic runs in `SessionDefinitionService` immediately after `UpdateSlotConfirmation()` in both `BookSlotAsync` and `UnbookSlotAsync`. It is synchronous so the response always returns up-to-date state.

### Pseudocode

```
After every booking mutation (book/unbook):

For the affected SessionDefinitionSlot:
  1. Run existing auto-fill logic → slot.IsConfirmed updated
  2. If slot.IsConfirmed changed to TRUE:
     a. Check if a MeetingSession already exists for this slot (SessionDefinitionSlotId)
     b. If not, create:
        MeetingSession session = new()
        {
            Title = slot.SessionDefinition.Name,
            Description = slot.SessionDefinition.Description,
            Date = slot.Date,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            Location = ResolveMeetingLocation(slot.Location),   // see below
            Type = MeetingType.Discussion,                      // default; configurable later
            Status = MeetingStatus.Filled,                      // all mandatory slots assigned
            CreatedByMemberId = slot.SessionDefinition.CreatedByMemberId,
            SessionDefinitionSlotId = slot.Id,
            SessionDefinitionId = slot.SessionDefinitionId,
            Slots = slot.Bookings.Select(b => new MeetingSlot
            {
                TeamMemberId = b.TeamMemberId,
                Notes = b.Notes,
                Type = SlotType.TeamMember,
                Date = slot.Date,
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                LocationId = slot.LocationId,
                BookedAt = DateTimeOffset.UtcNow
            }).ToList()
        }
        db.MeetingSessions.Add(session)
  3. If slot.IsConfirmed changed to FALSE (was true, now false):
     a. Find the associated MeetingSession by SessionDefinitionSlotId
     b. Delete it (cascade deletes its MeetingSlots)
  4. SaveChanges
```

### Location resolution helper

`SessionDefinitionSlot.LocationId` references a `SlotLocation`. `MeetingSession.Location` is a `MeetingLocation` enum (Remote/OnSite/Hybrid). Since there's no automatic mapping, use a convention:

| SlotLocation name (case-insensitive) | MeetingLocation |
|---|---|
| Contains "remote" | Remote |
| Contains "onsite" or "on-site" | OnSite |
| Contains "hybrid" | Hybrid |
| Anything else | OnSite (default) |

This is a simple `ResolveMeetingLocation(SlotLocation?)` helper. Can be refined later with a configuration field.

### Edge case: multiple Book/Unbook in same slot

The check `if MeetingSession already exists for this slot` prevents duplicate creation. The unique constraint on `SessionDefinitionSlotId` enforces this at the DB level.

---

## API Endpoint Changes

### Existing endpoints — no changes

All existing `api/v1/session-definitions/*` and `api/v1/meeting-sessions/*` endpoints remain unchanged. The auto-creation/teardown is transparent to the catalog API consumers.

### MeetingSession DTO — new fields

Add to `MeetingSessionDto`:

```csharp
public Guid? SessionDefinitionSlotId { get; init; }
public Guid? SessionDefinitionId { get; init; }
public string? SessionDefinitionName { get; init; }
```

Add to `MeetingSessionDto` in `MeetingSessionService.ToDto`:

```csharp
SessionDefinitionSlotId = s.SessionDefinitionSlotId,
SessionDefinitionId = s.SessionDefinitionId,
SessionDefinitionName = s.SessionDefinition?.Name
```

The `GetAllAsync` and `GetByIdAsync` queries need an additional `.Include(s => s.SessionDefinition)` to populate the name.

### New endpoint (optional but recommended)

```
GET /api/v1/session-definitions/{id}/connected-meeting
```

Returns the linked `MeetingSessionDto` if any slot on this definition has been confirmed and turned into a meeting, otherwise 404. Useful for the catalog detail UI to show a "View Meeting" link.

---

## Frontend Changes

### MeetingSession model — new fields

Add to `team-manager-ui/src/app/core/models/meeting-session.model.ts`:

```typescript
export interface MeetingSession {
  // ...existing fields...
  sessionDefinitionSlotId: string | null;
  sessionDefinitionId: string | null;
  sessionDefinitionName: string | null;
}
```

### Meeting planner list — catalog badge

In `meeting-planner.component.ts`, when a session has `sessionDefinitionName`, show a badge:

```html
@if (session.sessionDefinitionName) {
  <span class="catalog-badge">📋 {{ session.sessionDefinitionName }}</span>
}
```

The badge links to `/catalog/:sessionDefinitionId`.

### Meeting detail — catalog link

In `meeting-detail.component.ts`, show a banner or info line:

```
This meeting was created from the catalog session "Sprint Planning".
[View in Catalog →]
```

### Catalog detail — connected meeting link

In `session-catalog-detail.component.ts`, show a "View Meeting" link when any slot is confirmed and has a connected `MeetingSession`. Fetch via the new `GET .../connected-meeting` endpoint or check the slot DTO.

### Slot DTO — connected meeting info (optional)

Add to `SessionDefinitionSlotDto`:

```csharp
public Guid? ConnectedMeetingSessionId { get; init; }
public string? ConnectedMeetingSessionTitle { get; init; }
```

This lets the catalog UI show a "Meeting Created ✓" badge per confirmed slot.

---

## Migration Plan

### Step 1 — Add FKs to MeetingSession

New migration adding:

```csharp
migrationBuilder.AddColumn<Guid?>(
    name: "SessionDefinitionSlotId",
    table: "MeetingSessions",
    type: "uuid",
    nullable: true);

migrationBuilder.AddColumn<Guid?>(
    name: "SessionDefinitionId",
    table: "MeetingSessions",
    type: "uuid",
    nullable: true);

migrationBuilder.CreateIndex(
    name: "IX_MeetingSessions_SessionDefinitionSlotId",
    table: "MeetingSessions",
    column: "SessionDefinitionSlotId",
    unique: true,
    filter: "\"SessionDefinitionSlotId\" IS NOT NULL");

migrationBuilder.CreateIndex(
    name: "IX_MeetingSessions_SessionDefinitionId",
    table: "MeetingSessions",
    column: "SessionDefinitionId");

migrationBuilder.AddForeignKey(
    name: "FK_MeetingSessions_SessionDefinitions_SessionDefinitionId",
    table: "MeetingSessions",
    column: "SessionDefinitionId",
    principalTable: "SessionDefinitions",
    principalColumn: "Id",
    onDelete: ReferentialAction.SetNull);

migrationBuilder.AddForeignKey(
    name: "FK_MeetingSessions_SessionDefinitionSlots_SessionDefinitionSlotId",
    table: "MeetingSessions",
    column: "SessionDefinitionSlotId",
    principalTable: "SessionDefinitionSlots",
    principalColumn: "Id",
    onDelete: ReferentialAction.SetNull);
```

### Step 2 — Add bridging logic

Modify `SessionDefinitionService.BookSlotAsync` and `UnbookSlotAsync` to call a new private method `SyncMeetingSession(slot, participants)` after `UpdateSlotConfirmation`.

Inject `IMeetingSessionService` (or use `AppDbContext` directly) to create/delete MeetingSessions.

### Step 3 — Update DTOs and queries

- Add new fields to `MeetingSessionDto`
- Add `.Include(s => s.SessionDefinition)` in getAll/getById for the meeting planner
- Add navigation properties to `MeetingSession` entity

### Step 4 — Frontend model + UI changes

- Update `MeetingSession` interface
- Add catalog badge to meeting planner list
- Add catalog link to meeting detail page
- Add connected meeting link to catalog detail page

### Step 5 — New endpoint (optional)

Add `GET /api/v1/session-definitions/{id}/connected-meeting` to `SessionDefinitionsController`.

---

## Edge Cases

### Unbooking after confirmation

If a mandatory participant unbooks and the slot falls below the mandatory threshold:
- `IsConfirmed` flips to `false`
- The bridging logic deletes the associated `MeetingSession` (and its `MeetingSlots`)
- The meeting disappears from the planner

This is correct behavior — the meeting is no longer viable. The lead is notified to find an alternative slot.

### Slot deletion while confirmed

When `DELETE /api/v1/session-definitions/{id}/slots/{slotId}` is called:
- If the slot is confirmed, the associated `MeetingSession` must also be deleted
- Add a check in `SessionDefinitionService.DeleteSlotAsync`:
  ```csharp
  var meetingSession = await db.Set<MeetingSession>()
      .FirstOrDefaultAsync(ms => ms.SessionDefinitionSlotId == slotId);
  if (meetingSession is not null)
      db.Set<MeetingSession>().Remove(meetingSession);
  ```
- The FK on `MeetingSession` uses `SetNull` on delete, but we explicitly clean up to avoid orphaned sessions

### SessionDefinition deletion while confirmed slots exist

When `DELETE /api/v1/session-definitions/{id}` is called:
- Cascade will delete all slots and bookings
- Before deleting, find and delete all `MeetingSession` records referencing any of this definition's slots
- Add in `SessionDefinitionService.DeleteAsync`:
  ```csharp
  var slotIds = item.Slots.Select(s => s.Id).ToHashSet();
  var meetings = await db.Set<MeetingSession>()
      .Where(ms => ms.SessionDefinitionSlotId != null && slotIds.Contains(ms.SessionDefinitionSlotId.Value))
      .ToListAsync();
  db.Set<MeetingSession>().RemoveRange(meetings);
  ```

### Multiple mandatory participants unbook partially

If one of several mandatory participants unbooks, `IsConfirmed` flips to `false`. The `MeetingSession` is deleted. The remaining bookings still exist on the slot. When another mandatory participant books (or the same one rebooks), `IsConfirmed` flips to `true` again and a new `MeetingSession` is recreated. This is safe because the old one was fully deleted.

### Lead edits a confirmed slot's date/time

If the lead calls `PUT .../slots/{slotId}` on a confirmed slot:
- The `MeetingSession`'s date/time/location should be updated to match
- Add logic in `SessionDefinitionService.UpdateSlotAsync`:
  ```csharp
  if (slot.IsConfirmed)
  {
      var meeting = await db.Set<MeetingSession>()
          .FirstOrDefaultAsync(ms => ms.SessionDefinitionSlotId == slotId);
      if (meeting is not null)
      {
          meeting.Date = slot.Date;
          meeting.StartTime = slot.StartTime;
          meeting.EndTime = slot.EndTime;
          meeting.Location = ResolveMeetingLocation(slot.Location);
          // Also update child MeetingSlots' date/time
          foreach (var ms in meeting.Slots)
          {
              ms.Date = slot.Date;
              ms.StartTime = slot.StartTime;
              ms.EndTime = slot.EndTime;
          }
      }
  }
  ```

### Booking notes update

`SessionDefinitionBooking.Notes` is copied to `MeetingSlot.Notes` at creation time. If a participant updates their notes after confirmation, those changes are not synced to the `MeetingSlot`. This is acceptable — notes on the catalog side are pre-meeting logistics, notes on the meeting side are post-creation. If syncing is needed later, a `LastSyncedAt` field can be added.

---

## File Change Summary

| Action | File Path |
|---|---|
| MODIFY | `src/TeamManager.Api/Domain/Entities/MeetingSession.cs` — add two FK properties + nav properties |
| MODIFY | `src/TeamManager.Api/Infrastructure/Data/Configurations/MeetingSessionConfiguration.cs` — configure new FKs |
| MODIFY | `src/TeamManager.Api/Application/DTOs/MeetingSession/MeetingSessionDto.cs` — add catalog origin fields |
| MODIFY | `src/TeamManager.Api/Application/Services/SessionDefinitionService.cs` — add bridging logic in BookSlotAsync, UnbookSlotAsync, DeleteSlotAsync, UpdateSlotAsync |
| MODIFY | `src/TeamManager.Api/Application/Services/MeetingSessionService.cs` — include SessionDefinition in queries |
| MODIFY | `src/TeamManager.Api/Presentation/Controllers/SessionDefinitionsController.cs` — optional new endpoint |
| NEW (migration) | `src/TeamManager.Api/Migrations/{timestamp}_ConnectCatalogToMeetings.cs` |
| MODIFY | `team-manager-ui/src/app/core/models/meeting-session.model.ts` — add catalog fields |
| MODIFY | `team-manager-ui/src/app/features/meetings/meeting-planner/meeting-planner.component.ts` — catalog badge |
| MODIFY | `team-manager-ui/src/app/features/meetings/meeting-detail/meeting-detail.component.ts` — catalog link |
| MODIFY | `team-manager-ui/src/app/features/session-catalog/session-catalog-detail.component.ts` — view meeting link |
