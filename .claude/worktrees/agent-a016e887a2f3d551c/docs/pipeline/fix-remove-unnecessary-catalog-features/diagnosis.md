# Diagnosis: Remove Unnecessary Catalog Feature

## Root Cause
The Session Catalog (`SessionDefinition`/`SessionDefinitionSlot`/`SessionDefinitionParticipant`/`SessionDefinitionBooking`) and MeetingSeries features are **highly overlapping** — both manage participants, slots, confirmation logic, and auto-create `MeetingSession` records. The catalog uses a "book a slot" workflow while MeetingSeries uses an "availability matrix + claim" workflow. With the new bulk availability flow (`/my-meeting-series` → set availability for all open sessions), the catalog is redundant and adds unnecessary complexity.

## Fix Approach
Remove the entire Session Catalog feature since MeetingSeries now fully covers the meeting planning and availability needs. The catalog is NOT used by:
- Bulk availability flow (uses MeetingSeries entirely)
- My Meetings flow (uses MeetingSeries entirely)
- My Meeting Series flow (uses MeetingSeries entirely)

The only cross-feature references are display-only:
- Meeting Planner shows a "From Catalog" badge (can be removed)
- Meeting Detail shows an "origin banner" for catalog meetings (can be removed)

## Files to Change

### Backend — Remove
- `Domain/Entities/SessionDefinition.cs`
- `Domain/Entities/SessionDefinitionSlot.cs`
- `Domain/Entities/SessionDefinitionParticipant.cs`
- `Domain/Entities/SessionDefinitionBooking.cs`
- `Application/DTOs/SessionDefinition/` (entire directory — 6 files)
- `Application/Services/SessionDefinitionService.cs`
- `Application/Services/Interfaces/ISessionDefinitionService.cs`
- `Presentation/Controllers/SessionDefinitionsController.cs`
- `Infrastructure/Data/Configurations/SessionDefinitionConfiguration.cs`
- `Infrastructure/Data/Configurations/SessionDefinitionSlotConfiguration.cs`
- `Infrastructure/Data/Configurations/SessionDefinitionParticipantConfiguration.cs`
- `Infrastructure/Data/Configurations/SessionDefinitionBookingConfiguration.cs`

### Backend — Modify
- `Infrastructure/Data/AppDbContext.cs` — Remove DbSet properties and OnModelCreating registrations
- `Domain/Entities/MeetingSession.cs` — Remove `SessionDefinitionSlotId` and `SessionDefinitionId` FK properties
- `Presentation/Controllers/MeetingSessionsController.cs` — Remove any catalog-related endpoints

### Frontend — Remove
- `features/session-catalog/` (entire directory — 6 files)
- `shared/components/booking-grid/` (entire directory — used only by catalog)
- `core/models/session-definition.model.ts`
- `core/services/session-definition.service.ts`

### Frontend — Modify
- `app/app.routes.ts` — Remove `/catalog` route
- `app/app.component.ts` — Remove "Catalog" nav item from sidebar and mobile nav

## Regression Risk Areas
1. **Existing MeetingSessions** linked to catalog slots will have orphaned FK values — these should be set to null or the columns dropped
2. **Database migrations** — need a new migration to drop the 4 catalog tables and remove FK columns from MeetingSessions
3. **MeetingSessionsController** — verify no endpoints reference SessionDefinition data
4. **Navigation** — ensure no broken links remain in the UI
