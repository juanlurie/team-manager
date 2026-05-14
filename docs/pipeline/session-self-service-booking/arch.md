# Session Self-Service Booking — Architecture Document

## Overview

A four-step flow for defining sessions that need to be filled, creating time slots for them, and letting team members self-select availability via a calendar grid. Reuses the existing calendar grid pattern from the meeting planner's quick-create dialog.

---

## 1. New Domain Entities

### SessionDefinition — a catalog item (no time info)
```
Guid Id
string Name                          max 200
string? Description                  max 2000
Guid CreatedByMemberId
bool IsActive                        default true
DateTimeOffset CreatedAt

→ TeamMember CreatedBy (navigation)
→ ICollection<SessionDefinitionParticipant> Participants
→ ICollection<SessionDefinitionSlot> Slots
```

### SessionDefinitionParticipant — join table with role
```
Guid Id
Guid SessionDefinitionId
Guid TeamMemberId
ParticipantRole Role   // enum: Mandatory, Optional

→ SessionDefinition SessionDefinition (navigation)
→ TeamMember TeamMember (navigation)
```

### SessionDefinitionSlot — a concrete time window created by the lead
```
Guid Id
Guid SessionDefinitionId
DateOnly Date
TimeSpan StartTime
TimeSpan EndTime
Guid? LocationId                      FK → SlotLocation.Id (nullable)
bool IsConfirmed                      true when all mandatory participants have booked this slot

→ SessionDefinition SessionDefinition (navigation)
→ SlotLocation? Location (navigation)
→ ICollection<SessionDefinitionBooking> Bookings
```

### SessionDefinitionBooking — a team member's booking on a slot
```
Guid Id
Guid SessionDefinitionSlotId
Guid TeamMemberId
string? Notes                        max 500
DateTimeOffset BookedAt

→ SessionDefinitionSlot Slot (navigation)
→ TeamMember TeamMember (navigation)
```

### New Enum
```
ParticipantRole { Mandatory, Optional }
```

### Entity Relationships
- SessionDefinition 1:N SessionDefinitionParticipant (cascade delete)
- SessionDefinition 1:N SessionDefinitionSlot (cascade delete)
- SessionDefinitionSlot 1:N SessionDefinitionBooking (cascade delete)
- SessionDefinition.CreatedByMemberId → TeamMember.Id (restrict)
- SessionDefinitionParticipant.TeamMemberId → TeamMember.Id (restrict)
- SessionDefinitionSlot.LocationId → SlotLocation.Id (set null)
- SessionDefinitionBooking.TeamMemberId → TeamMember.Id (restrict)
- Unique constraint on (SessionDefinitionSlotId, TeamMemberId) in SessionDefinitionBooking — one booking per person per slot

### Why not reuse MeetingSession/MeetingSlot?

Catalog items have no date/time/location/type/status — they are purely a name + participant list. MeetingSession requires date, startTime, endTime, location, type, and status. Forcing a catalog item into MeetingSession would require all those fields to be nullable/meaningless. Keeping separate entities avoids breaking existing meeting planner functionality and keeps the two concepts cleanly separated.

---

## 2. API Endpoints

All under `api/v1/session-definitions` following the existing `MeetingSessionsController` pattern.

```
### Session Catalog CRUD
GET    /api/v1/session-definitions                        → list all catalog items
GET    /api/v1/session-definitions/{id}                    → single item with participants + slots + bookings
POST   /api/v1/session-definitions                         → create (with participant list)
PUT    /api/v1/session-definitions/{id}                    → update (name, description, participants)
DELETE /api/v1/session-definitions/{id}                    → delete

### Slot Management (nested under session-definition)
POST   /api/v1/session-definitions/{id}/slots              → batch-create slots ({date, startTime, endTime, locationId}[])
GET    /api/v1/session-definitions/{id}/slots              → list slots for a catalog item
PUT    /api/v1/session-definitions/{id}/slots/{slotId}     → update a single slot
DELETE /api/v1/session-definitions/{id}/slots/{slotId}     → delete a slot

### Self-Service Booking
POST   /api/v1/session-definitions/{id}/slots/{slotId}/book    → book current user into slot
DELETE /api/v1/session-definitions/{id}/slots/{slotId}/book    → unbook current user from slot
```

### Backend Structure

```
src/TeamManager.Api/
  Domain/
    Entities/
      SessionDefinition.cs
      SessionDefinitionParticipant.cs
      SessionDefinitionSlot.cs
      SessionDefinitionBooking.cs
    Enums/
      ParticipantRole.cs
  Application/
    DTOs/SessionDefinition/
      SessionDefinitionDto.cs
      SessionDefinitionParticipantDto.cs
      SessionDefinitionSlotDto.cs
      SessionDefinitionBookingDto.cs
      CreateSessionDefinitionRequest.cs
      UpdateSessionDefinitionRequest.cs
      CreateSessionSlotsRequest.cs
      UpdateSessionSlotRequest.cs
      BookSessionSlotRequest.cs
    Services/
      Interfaces/
        ISessionDefinitionService.cs
      SessionDefinitionService.cs
  Presentation/
    Controllers/
      SessionDefinitionsController.cs
  Infrastructure/
    Data/
      Configurations/
        SessionDefinitionConfiguration.cs
        SessionDefinitionParticipantConfiguration.cs
        SessionDefinitionSlotConfiguration.cs
        SessionDefinitionBookingConfiguration.cs
```

### DTOs

**SessionDefinitionDto**
```
Guid Id
string Name
string? Description
Guid CreatedByMemberId
string? CreatedByMemberName
bool IsActive
DateTimeOffset CreatedAt
List<SessionDefinitionParticipantDto> Participants
List<SessionDefinitionSlotDto> Slots
```

**SessionDefinitionParticipantDto**
```
Guid Id
Guid TeamMemberId
string? TeamMemberName
string Role    // "Mandatory" | "Optional"
```

**SessionDefinitionSlotDto**
```
Guid Id
Guid SessionDefinitionId
string Date
string StartTime
string EndTime
Guid? LocationId
string? LocationName
string? LocationColor
bool IsConfirmed
int BookingCount
int MandatoryCount                // total mandatory participants for the parent definition
List<SessionDefinitionBookingDto> Bookings
```

**SessionDefinitionBookingDto**
```
Guid Id
Guid SessionDefinitionSlotId
Guid TeamMemberId
string? TeamMemberName
string? Notes
DateTimeOffset BookedAt
```

**CreateSessionDefinitionRequest**
```
string Name
string? Description
List<ParticipantDefinition> Participants
```

**ParticipantDefinition**
```
Guid TeamMemberId
string Role    // "Mandatory" | "Optional"
```

**CreateSessionSlotsRequest**
```
List<SlotTimeDefinition> Slots
```

**SlotTimeDefinition**
```
string Date         // yyyy-MM-dd
string StartTime    // HH:mm
string EndTime      // HH:mm
Guid? LocationId
```

**BookSessionSlotRequest**
```
string? Notes
```

### Auto-Fill Logic (in SessionDefinitionService)

After every booking mutation (book/unbook):

```
For the affected SessionDefinitionSlot:
  1. Get all mandatory ParticipantRole TeamMemberIds for the parent SessionDefinition
  2. Get all booked TeamMemberIds for this slot
  3. If mandatory set is a subset of booked set → slot.IsConfirmed = true
  4. Else → slot.IsConfirmed = false
  5. SaveChanges
```

This runs synchronously in the service method so the response always returns up-to-date `IsConfirmed` state.

---

## 3. Frontend Routes & Components

### New Routes

```
/catalog                        → SessionCatalogComponent (list)
/catalog/create                 → SessionCatalogCreateComponent (create form)
/catalog/:id                    → SessionCatalogDetailComponent (detail with participants + slot overview)
/catalog/:id/slots              → SessionCatalogSlotsComponent (lead slot creation — grid)
/catalog/:id/book               → SessionCatalogBookingComponent (self-service booking — grid)
```

Registered in `app.routes.ts`:
```ts
{
  path: 'catalog',
  loadChildren: () => import('./features/session-catalog/session-catalog.routes').then(m => m.SESSION_CATALOG_ROUTES)
}
```

### Component Tree

```
team-manager-ui/src/app/features/session-catalog/
  session-catalog.component.ts            — list page with create button
  session-catalog-create.component.ts     — form: name, description, multi-select for mandatory + optional participants
  session-catalog-detail.component.ts     — detail: participant lists, existing slots summary, nav to slots/book
  session-catalog-slots.component.ts      — lead creates time windows on a calendar grid
  session-catalog-booking.component.ts    — team member books/unbooks themselves on existing slots
  session-catalog.routes.ts
```

### New Model

```
team-manager-ui/src/app/core/models/session-definition.model.ts
```

Interfaces:
- `SessionDefinition` — maps 1:1 to SessionDefinitionDto
- `SessionDefinitionParticipant` — maps 1:1 to SessionDefinitionParticipantDto
- `SessionDefinitionSlot` — maps 1:1 to SessionDefinitionSlotDto
- `SessionDefinitionBooking` — maps 1:1 to SessionDefinitionBookingDto
- `CreateSessionDefinitionRequest` — write DTO
- `CreateSessionSlotsRequest` — write DTO
- `BookSessionSlotRequest` — write DTO

### New Service

```
team-manager-ui/src/app/core/services/session-definition.service.ts
```

Methods (following `meeting-session.service.ts` pattern):
```ts
getAll(): Observable<SessionDefinition[]>
getById(id: string): Observable<SessionDefinition>
create(request: CreateSessionDefinitionRequest): Observable<SessionDefinition>
update(id: string, request: UpdateSessionDefinitionRequest): Observable<SessionDefinition>
delete(id: string): Observable<void>
createSlots(id: string, request: CreateSessionSlotsRequest): Observable<SessionDefinition>
bookSlot(sessionId: string, slotId: string, request: BookSessionSlotRequest): Observable<SessionDefinition>
unbookSlot(sessionId: string, slotId: string): Observable<SessionDefinition>
```

Base URL: `${API_BASE}/session-definitions`

---

## 4. Data Flow

### Step 1 — Lead creates a catalog item
```
UI: /catalog/create
  → Lead enters name + description + selects mandatory + optional participants from multi-select
  → POST /api/v1/session-definitions  { name, description, participants }
  → Backend creates SessionDefinition + SessionDefinitionParticipant records
  → Returns SessionDefinitionDto
  → Redirect to /catalog/:id
```

### Step 2 — Lead creates time slots
```
UI: /catalog/:id/slots
  → Lead sees calendar grid (same visual as meeting-form-dialog)
  → Lead picks a location, clicks time cells to define windows
  → POST /api/v1/session-definitions/{id}/slots  { slots: [{date, startTime, endTime, locationId}] }
  → Backend creates SessionDefinitionSlot records (IsConfirmed = false)
  → Returns updated SessionDefinitionDto
  → Grid re-renders showing created slots
```

### Step 3 — Team member self-service books
```
UI: /catalog/:id/book
  → Member sees calendar grid with pre-existing slots (colored blocks per location)
  → Each slot shows: time, location, booking count / mandatory count
  → Member clicks an available slot → POST .../slots/{slotId}/book { notes? }
  → Backend creates SessionDefinitionBooking, runs auto-fill check
  → Returns updated SessionDefinitionDto
  → Grid updates: slot shows member's name + updated count; IsConfirmed badge toggles if met
  → Member clicks their booked slot → DELETE .../slots/{slotId}/book → removed, auto-fill re-checked
```

### Step 4 — Auto-fill confirmation
```
Triggered automatically in service layer after each book/unbook:
  - Gather mandatory participant IDs for the SessionDefinition
  - Gather booked participant IDs for the SessionDefinitionSlot
  - If all mandatory are present → slot.IsConfirmed = true
  - If a booking is removed and mandatory no longer met → slot.IsConfirmed = false
  - Confirmed status is returned in the DTO so UI can show a "Confirmed ✓" badge
```

---

## 5. Calendar Grid Reuse Strategy

### Shared Component: BookingGridComponent

Extract the inline calendar grid from `meeting-form-dialog/meeting-form-dialog.component.ts` into a shared component:

```
team-manager-ui/src/app/shared/components/booking-grid/
  booking-grid.component.ts
```

The existing dialog has ~120 lines of grid logic (week navigation, day headers, time rows, clickable cells, location selection, summary counts) that is adapted for the catalog flow.

### Component API

```ts
interface BookingGridProps {
  // Mode
  mode: 'create' | 'book' | 'view';

  // Data
  locations: SlotLocation[];                    // for color-coding
  existingSlots: SessionDefinitionSlot[];        // pre-populated slots (for book/view mode)

  // State (signals)
  weekOffset: WritableSignal<number>;

  // Events
  cellToggled: (date: string, startTime: string, endTime: string) => void;
  slotClicked: (slotId: string) => void;
  weekChanged: (newOffset: number) => void;
}

// The component handles:
// - Week navigation (offset)
// - Rendering day columns (Mon-Fri) and time rows
// - Color-coding cells by location
// - Three interaction modes
```

### Mode Behaviors

| Mode | Cell Interaction | Visual |
|------|-----------------|--------|
| `create` | Click empty cell → assign as new slot with selected location | Selected cells highlighted with location color; summary counts |
| `book` | Click existing slot → book/unbook current user | Existing slots shown as blocks; my bookings highlighted; free slots show "Book" affordance |
| `view` | Read-only | Slots shown with booking counts + confirmed status; no interaction |

### Consumers

1. **`meeting-form-dialog/meeting-form-dialog.component.ts`** (existing, refactored)
   - Uses mode `'create'` to select slots during quick-create
   - After extraction, imports `BookingGridComponent` instead of inline grid

2. **`session-catalog-slots/session-catalog-slots.component.ts`** (new)
   - Uses mode `'create'` — lead picks location and clicks cells to define time windows
   - On save, sends batch: `POST /api/v1/session-definitions/{id}/slots`

3. **`session-catalog-booking/session-catalog-booking.component.ts`** (new)
   - Uses mode `'book'` — shows existing slots from `SessionDefinitionDto.Slots`
   - Clicking an unbooked slot → `POST .../slots/{id}/book`
   - Clicking a slot where `booking.teamMemberId === currentMemberId` → `DELETE`

### States for Booking Component

Each grid cell / slot block shows:
```
Slot state            | Visual
----------------------|-----------------------------------
Available (empty)     | Empty cell, clickable
Partially booked      | Cell shows booking count / mandatory count, clickable
Fully booked          | "Confirmed ✓" badge, not clickable (all mandatory present)
My booking            | Cell highlighted (member color), shows "You", click to unbook
```

This follows the same slot-state visual pattern used in `meeting-detail.component.ts` (slot-card with `.slot-booked` / `.slot-mine` CSS classes).
