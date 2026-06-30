# Meeting Planner - Architecture Document

## Overview
A meeting planner tool within TeamManager that enables managers to create available time slots (with location/format), which team members can claim, and facilitators can be assigned. Supports remote and on-site attendance, availability management, and slot filling.

## Data Model (Backend)

### Domain Entities

**MeetingSession** — a planning session (e.g. "Sprint Planning", "Team Sync").
```
Guid Id
string Title
string? Description
DateOnly Date
TimeSpan StartTime
TimeSpan EndTime
MeetingLocation Location  // enum: Remote, OnSite
MeetingStatus Status      // enum: Open, Filled, Cancelled
Guid CreatedByMemberId    // the manager who created it
DateTimeOffset CreatedAt
```

**MeetingSlot** — a bookable slot within a session (one manager slot, filled by one team member).
```
Guid Id
Guid MeetingSessionId
Guid? TeamMemberId        // the member who claimed this slot (nullable until filled)
string? Notes             // optional notes from the attedee
SlotType Type             // enum: TeamMember, Facilitator
DateTimeOffset? BookedAt  // when the slot was claimed
```

**MeetingSessionMember** — join table if needed; but slots are the main attendance mechanism.

Better approach: Keep it simple with two entities:
- `MeetingSession` (the manager-created window)
- `MeetingSlot` (each bookable slot within a session)

### Enums
```
MeetingLocation { Remote, OnSite, Hybrid }
MeetingStatus { Open, Filled, Cancelled }
SlotType { TeamMember, Facilitator }
```

### Entity Relationships
- MeetingSession has many MeetingSlots (1:N)
- MeetingSession.CreatedByMemberId → TeamMember.Id
- MeetingSlot.TeamMemberId → TeamMember.Id (nullable)

### DTOs

**MeetingSessionDto** — read model
```
Guid Id
string Title
string? Description
DateOnly Date
string StartTime  (HH:mm)
string EndTime    (HH:mm)
string Location   (enum string)
string Status     (enum string)
Guid CreatedByMemberId
string? CreatedByMemberName
List<MeetingSlotDto> Slots
DateTimeOffset CreatedAt
```

**MeetingSlotDto**
```
Guid Id
Guid MeetingSessionId
Guid? TeamMemberId
string? TeamMemberName
string? Notes
string SlotType
DateTimeOffset? BookedAt
```

**CreateSessionRequest**
```
string Title
string? Description
DateOnly Date
string StartTime
string EndTime
string Location
int TeamMemberSlotCount     // number of team member slots to create
int FacilitatorSlotCount    // number of facilitator slots to create
```

**UpdateSessionRequest** — same as create.

**BookSlotRequest**
```
Guid SlotId
string? Notes
```

### API Endpoints
```
GET    /api/v1/meeting-sessions                    — list all
GET    /api/v1/meeting-sessions/{id}               — get single with slots
POST   /api/v1/meeting-sessions                    — create (manager)
PUT    /api/v1/meeting-sessions/{id}               — update (manager)
DELETE /api/v1/meeting-sessions/{id}               — delete (manager)
PATCH  /api/v1/meeting-sessions/{id}/status        — change status
POST   /api/v1/meeting-sessions/{id}/slots/{slotId}/book   — claim a slot
DELETE /api/v1/meeting-sessions/{id}/slots/{slotId}/book   — unclaim a slot
```

## Backend Structure

Following existing patterns:
```
src/TeamManager.Api/
  Domain/
    Entities/
      MeetingSession.cs
      MeetingSlot.cs
    Enums/
      MeetingLocation.cs
      MeetingStatus.cs
      SlotType.cs
  Application/
    DTOs/MeetingSession/
      MeetingSessionDto.cs
      MeetingSlotDto.cs
      CreateSessionRequest.cs
      UpdateSessionRequest.cs
      BookSlotRequest.cs
    Services/
      Interfaces/
        IMeetingSessionService.cs
      MeetingSessionService.cs
  Presentation/
    Controllers/
      MeetingSessionsController.cs
  Infrastructure/
    Data/
      Configurations/
        MeetingSessionConfiguration.cs
        MeetingSlotConfiguration.cs
```

## Frontend Structure

### Angular Feature Module
```
team-manager-ui/src/app/features/meetings/
  meeting-planner/
    meeting-planner.component.ts      — main page with session list + create
    meeting-planner.component.html
    meeting-planner.component.scss
  meeting-detail/
    meeting-detail.component.ts       — single session detail with slots
    meeting-detail.component.html
    meeting-detail.component.scss
  meeting-form-dialog/
    meeting-form-dialog.component.ts  — create/edit dialog
    meeting-form-dialog.component.html
  meetings.routes.ts                  — route definitions
```

### Services
```
team-manager-ui/src/app/core/services/meeting-session.service.ts
```

### Models
```
team-manager-ui/src/app/core/models/meeting-session.model.ts
```

### Routing
```
path: 'meetings' → MeetingPlannerComponent (list)
path: 'meetings/:id' → MeetingDetailComponent (detail)
```

### Route Registration
Add to `app.routes.ts`:
```ts
{
  path: 'meetings',
  loadChildren: () => import('./features/meetings/meetings.routes').then(m => m.MEETING_ROUTES)
}
```

## Workflow

1. **Manager** navigates to /meetings, clicks "Create Session"
2. Fills in: title, date, time range, location (Remote/OnSite), number of team member slots, number of facilitator slots
3. System creates the MeetingSession + that many empty MeetingSlots
4. **Team members** see open sessions on the /meetings page
5. Each slot shows a "Book" button if unclaimed
6. Member clicks "Book" → POST slots/{id}/book → slot is claimed
7. Facilitator slots can only be booked by users with facilitator role (or any member, depending on business rules)
8. Manager can cancel/unclaim any slot, change status, edit session details
9. Each session shows a status: Open (has free slots), Filled (all slots claimed), Cancelled

## Key Design Decisions
- Slots are pre-created at session creation time (fixed capacity)
- A member can book at most one slot per session (enforced in service layer)
- Location is per-session, not per-slot (all slots in a session share the same location)
- Use existing TeamMember model for identity
- Follow same patterns as SprintMembers for member-slot relationship
