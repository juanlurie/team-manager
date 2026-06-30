# Architecture: Meeting Planner & Catalog Rework

## Overview

Rethink the meeting planner and catalog to support a new three-step workflow for large teams where small subsets need to join individual sessions (e.g., performance reviews with line manager and senior manager).

## Current State

The system already has two separate features:
1. **Meeting Planner (MeetingSessions)** — ad-hoc one-off meetings with bookable slots. Works for Step 1.
2. **Session Catalog (SessionDefinitions)** — reusable templates with participants, proposed slots, and a booking-to-confirmation flow. This partially covers Steps 2–3 but mixes "slot proposal" with "participant definition" in the same entity.

## The Problem

The existing Session Catalog defines slots as part of the definition. The new requirement separates:
- **Step 1**: A "Meeting Series" (senior manager's availability windows — slots with dates/times/locations/lengths)
- **Step 2**: Individual "Meeting Items" within a series, each with mandatory/optional participants but **no times assigned yet**
- **Step 3**: Participants declare availability on the series' slots for each meeting item; slots are confirmed when all mandatory participants align

## Proposed Data Model

### New/Modified Entities

#### `MeetingSeries` (NEW)
Replaces the concept of "step 1 plan". A series is a container for a set of availability slots.

| Field | Type | Notes |
|-------|------|-------|
| Id | Guid (PK) | |
| Title | string | e.g. "Performance Reviews Q2 2026" |
| Description | string? | |
| CreatedByMemberId | Guid (FK→TeamMembers) | The senior manager |
| IsActive | bool | |
| CreatedAt | DateTimeOffset | |

#### `MeetingSeriesSlot` (NEW, replaces some of SessionDefinitionSlot)
A time window the senior manager is available.

| Field | Type | Notes |
|-------|------|-------|
| Id | Guid (PK) | |
| MeetingSeriesId | Guid (FK→MeetingSeries) | |
| Date | DateTime | |
| StartTime | TimeSpan | |
| EndTime | TimeSpan | |
| LocationId | Guid? (FK→SlotLocations) | |
| SortOrder | int | |

#### `MeetingSeriesItem` (NEW, replaces SessionDefinition concept)
An individual meeting that needs to happen within the series (e.g., "Performance Review: Alice & Bob").

| Field | Type | Notes |
|-------|------|-------|
| Id | Guid (PK) | |
| MeetingSeriesId | Guid (FK→MeetingSeries) | |
| Title | string | |
| Description | string? | |
| DurationMinutes | int? | Length needed for this item (may differ from slot length) |
| ConfirmedSlotId | Guid? (FK→MeetingSeriesSlot) | Set when confirmed |
| IsConfirmed | bool | |
| CreatedAt | DateTimeOffset | |

#### `MeetingSeriesItemParticipant` (NEW, replaces SessionDefinitionParticipant)
Links a person to a meeting item.

| Field | Type | Notes |
|-------|------|-------|
| Id | Guid (PK) | |
| MeetingSeriesItemId | Guid (FK→MeetingSeriesItem) | |
| TeamMemberId | Guid (FK→TeamMembers) | |
| Role | string (Mandatory/Optional) | |

#### `MeetingSeriesItemAvailability` (NEW, replaces SessionDefinitionBooking)
A participant's declaration that a particular series slot works for them for a particular meeting item.

| Field | Type | Notes |
|-------|------|-------|
| Id | Guid (PK) | |
| MeetingSeriesItemId | Guid (FK→MeetingSeriesItem) | |
| MeetingSeriesSlotId | Guid (FK→MeetingSeriesSlot) | |
| TeamMemberId | Guid (FK→TeamMembers) | |
| Notes | string? | |
| CreatedAt | DateTimeOffset | |
| *Unique index*: (MeetingSeriesItemId, MeetingSeriesSlotId, TeamMemberId) | |

### Relationships

```
MeetingSeries 1──* MeetingSeriesSlot
MeetingSeries 1──* MeetingSeriesItem
MeetingSeriesItem 1──* MeetingSeriesItemParticipant
MeetingSeriesItem 1──* MeetingSeriesItemAvailability
MeetingSeriesSlot 1──* MeetingSeriesItemAvailability
MeetingSeriesItem *──1 MeetingSeriesSlot (ConfirmedSlotId, nullable)
```

### Confirmation Logic

When a slot is confirmed for a meeting item:
- All mandatory participants for that item have created an availability record for that slot
- The item's `ConfirmedSlotId` is set to the slot
- The item's `IsConfirmed` is set to true
- A `MeetingSession` is auto-created (reusing existing MeetingSession model) linked back to the item
  - Title = meeting item title
  - Date/Time = from the confirmed slot
  - Location = from the slot's location
  - Slots = one per participant (all TeamMember type)
  - CreatedByMemberId = series creator

When a mandatory participant removes their availability:
- If the item was confirmed, it becomes unconfirmed
- The connected MeetingSession is deleted

## API Endpoints

### `api/v1/meeting-series` (NEW controller)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List all series |
| GET | `/{id}` | Get series with slots, items, participants, availabilities |
| POST | `/` | Create series |
| PUT | `/{id}` | Update series metadata |
| DELETE | `/{id}` | Delete series (cascade) |

### `api/v1/meeting-series/{seriesId}/slots` (NEW)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List slots for series |
| POST | `/` | Create slots for series |
| PUT | `/{slotId}` | Update a slot |
| DELETE | `/{slotId}` | Delete a slot |

### `api/v1/meeting-series/{seriesId}/items` (NEW)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List meeting items for series (with participants) |
| POST | `/` | Create a meeting item with participants |
| PUT | `/{itemId}` | Update item (title, participants) |
| DELETE | `/{itemId}` | Delete item |

### `api/v1/meeting-series/{seriesId}/items/{itemId}/availability` (NEW)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List availabilities for this item |
| POST | `/` | Add availability (slotId + teamMemberId) |
| DELETE | `/{availabilityId}` | Remove availability |

### Optional: Reuse existing `SessionDefinitions` endpoints if retrofitting

Rather than creating entirely new controllers, we can **extend** the existing `SessionDefinitions` controller:

- `SessionDefinition` → becomes the "Meeting Series" (step 1)
- `SessionDefinitionSlot` → remains the "series slots" (step 1)
- `SessionDefinitionParticipant` → becomes `MeetingSeriesItemParticipant` — but we need the concept of "items within a series", so we add a new entity `SessionDefinitionItem` or reuse `SessionDefinition` with a parent relationship.

**Recommended approach**: Since the semantics differ significantly from the current catalog (which defines one session template → slots → bookings), create **new entities and a new controller** (`MeetingSeriesController`) to avoid breaking existing functionality. The old catalog code remains untouched.

## Service Layer

### New Services

- `IMeetingSeriesService` / `MeetingSeriesService` — orchestrates CRUD for series, slots, items, participants, availabilities
- Confirmation logic as a private method within the service
- Auto-creation/deletion of MeetingSession when slots are confirmed/unconfirmed

### Reused Services

- `IMeetingSessionService` — unchanged, used to create the actual meeting when a slot is confirmed

## Frontend Changes

### New Pages/Components

| Route | Component | Description |
|-------|-----------|-------------|
| `/meeting-series` | `MeetingSeriesListComponent` | List all series with progress |
| `/meeting-series/create` | `MeetingSeriesCreateComponent` | Create series, add slots (reuse booking-grid) |
| `/meeting-series/:id` | `MeetingSeriesDetailComponent` | View series with items, slots, confirmation status |
| `/meeting-series/:id/slots` | `MeetingSeriesSlotsComponent` | Manage slots for series (reuse booking-grid) |
| `/meeting-series/:id/items` | `MeetingSeriesItemsComponent` | List items, create new items with participant picker |
| `/meeting-series/:id/items/create` | `MeetingSeriesItemCreateComponent` | Create item with mandatory/optional participants |
| `/meeting-series/:id/items/:itemId` | `MeetingSeriesItemDetailComponent` | View item, availability grid for each participant |
| `/meeting-series/:id/items/:itemId/availability` | `MeetingSeriesItemAvailabilityComponent` | Current user's availability selection for this item |

### New Routes

```
/meeting-series (lazy-loaded feature module)
```

### New Frontend Models/Services

- `meeting-series.model.ts` — interfaces for all new entities
- `meeting-series.service.ts` — API service for all new endpoints

### Navigation Changes

- Add "Meeting Series" link in the main navigation
- Update sidebar if applicable

## Database Migrations

New migration creating tables:
- `MeetingSeries`
- `MeetingSeriesSlots`
- `MeetingSeriesItems`
- `MeetingSeriesItemParticipants`
- `MeetingSeriesItemAvailabilities`

Plus foreign keys and unique indexes.

## No-Impact Strategy

The existing `MeetingSessions` and `SessionDefinitions` tables, services, controllers, and UI remain **completely untouched** unless we choose to link them. The new MeetingSeries flow creates MeetingSessions (reusing that model) when items are confirmed, which is a one-way dependency.

## Summary of Changes

| Layer | Changes |
|-------|---------|
| Domain | 5 new entity classes |
| Application | New DTOs, new service interface + implementation |
| Infrastructure | New EF configs, new migration |
| Presentation | New controller |
| Frontend | New feature module with ~8 components, new model + service |
| Existing code | Untouched (backward compatible) |
