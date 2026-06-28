# QA Report: Connect Catalog to Meetings

## Summary: FAIL

---

## Build Verification

### .NET API (`src/TeamManager.Api/`) — ✅ PASS
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

### TypeScript UI (`team-manager-ui/`) — ✅ PASS
`npx tsc --noEmit` exits cleanly with no errors.

---

## Deployment State (Critial Finding)

### Migration NOT applied — ❌ FAIL

The migration `20260513203421_ConnectCatalogToMeetings.cs` exists in source but has **not been applied** to the production PostgreSQL database. The `MeetingSessions` table is missing:

| Missing Item | Expected |
|---|---|
| `SessionDefinitionSlotId` column (uuid?, nullable) | FK → `SessionDefinitionSlots.Id` |
| `SessionDefinitionId` column (uuid?, nullable) | FK → `SessionDefinitions.Id` |
| Unique filtered index on `SessionDefinitionSlotId` | `WHERE "SessionDefinitionSlotId" IS NOT NULL` |
| Index on `SessionDefinitionId` | Plain B-tree |
| FK constraint (SetNull) on `SessionDefinitionSlotId` | `ON DELETE SET NULL` |
| FK constraint (SetNull) on `SessionDefinitionId` | `ON DELETE SET NULL` |

**Applied migrations stop at** `20260513201226_AddSessionDefinitions` (43 migrations applied). The table `__EFMigrationsHistory` does **not** contain `20260513203421_ConnectCatalogToMeetings`.

**Docker build is stale.** The production API container (`team-manager-api-1`) was built from an older image that predates the bridging-logic changes and the migration. The dev API container (`tm-dev-api-1`, port 5002) references a database that lacks the `MeetingSessions` table entirely.

---

## API Smoke Test — ❌ FAIL (cannot complete)

### 1. Create session definition with mandatory participant — ✅ PASS
```
POST /api/v1/session-definitions
→ 201 Created, session returned with mandatory participant
```

### 2. Create slots — ✅ PASS
```
POST /api/v1/session-definitions/{id}/slots
→ 200 OK, slot with isConfirmed=false
```

### 3. Book mandatory participant — ⚠️ PARTIAL PASS
```
POST /api/v1/session-definitions/{id}/slots/{slotId}/book
→ 200 OK, isConfirmed=true
```
The slot's `IsConfirmed` correctly transitions to `true` when the mandatory participant books. The response correctly reflects the updated booking state.

### 4. Verify MeetingSession auto-created — ❌ FAIL
```
GET /api/v1/meeting-sessions
→ No MeetingSession with SessionDefinitionSlotId set (3 existing sessions all have null FK)
```

**Root cause:** The bridging logic in `SessionDefinitionService.SyncMeetingSession()` attempts to insert a `MeetingSession` row with `SessionDefinitionSlotId` populated, but the database column does not exist. On a current build this would throw `DbUpdateException` and return `400 Bad Request` (caught at `BookSlotAsync:229-236`). On the deployed stale image the bridging logic is absent entirely, so no MeetingSession is created and no error is raised.

### 5. Unbook participant — ❌ NOT TESTED
Cannot test teardown until the create path works.

### 6. Connected Meetings endpoint — ❌ FAIL
```
GET /api/v1/session-definitions/{id}/connected-meetings
→ 404 Not Found
```
The endpoint exists in source but is not present in the deployed image.

---

## Frontend Check — ✅ PASS (partial)

| Route | HTTP Status |
|---|---|
| `GET /` (redirects to `/meetings`) | 200 |
| `GET /catalog/:id` | 200 |

The Angular app renders without runtime errors for these routes. However, the UI components for the catalog badge (`meeting-planner.component.ts`), origin banner (`meeting-detail.component.ts`), and connected meeting links (`session-catalog-detail.component.ts`) could not be verified via curl alone. The TypeScript build passes, which confirms the code compiles, but runtime rendering in a browser was not tested.

---

## Edge Case: UpdateAsync Slot Recalculation — ❌ CANNOT VERIFY

The fix referenced in the review (`SessionDefinitionService.cs:61-92`) adds `.Include(s => s.Slots).ThenInclude(sl => sl.Bookings)` and iterates all slots when participants change. The code looks correct in source, but cannot be tested against a running instance because:

- The production API runs old code
- The dev API's DB lacks the `MeetingSessions` table

---

## Concerns and Observations

### 1. Migration deployment gap (HIGH)
The migration must be applied before the bridging logic can function. Ensure the Docker image is rebuilt with the latest source *and* the `migrate` service runs `dotnet TeamManager.Api.dll --migrate` as part of the deployment pipeline. Currently `docker-compose up` will start the old `team-manager-api:prod` image, and the `migrate` service will apply only migrations that exist in that old image.

### 2. Potential EF Core navigation fixup bug (MEDIUM)
In `BookSlotAsync` (`SessionDefinitionService.cs:224-228`):

```csharp
db.Set<SessionDefinitionBooking>().Add(booking);
var wasConfirmed = slot.IsConfirmed;
UpdateSlotConfirmation(slot, session.Participants);
```

`UpdateSlotConfirmation` reads `slot.Bookings` to compute `IsConfirmed`. However, EF Core does **not** trigger navigation-property fixup immediately after `DbSet.Add()`. The new booking is tracked by the context but may not yet be reflected in `slot.Bookings`. Fixup occurs during `DetectChanges` (called by `SaveChangesAsync`), which is too late.

**Suggested fix:** Add `db.ChangeTracker.DetectChanges()` before the `wasConfirmed` line, or manually add the booking to `slot.Bookings`:

```csharp
slot.Bookings.Add(booking);
```

This issue is speculative (could not be tested against a current build) and should be verified after the migration is applied. If the current build works without this fix on a rebuilt image, this can be downgraded to LOW.

### 3. Dev and production environments out of sync (MEDIUM)
- Production DB has `MeetingSessions`, `SessionDefinitions`, etc. but is missing the FK columns.
- Dev DB (`team_manager_dev`) is missing both `MeetingSessions` and all session-definition tables.
- The dev API (port 5002) cannot serve session-definition endpoints because the tables do not exist.

Consistent environment setup is needed for reliable QA.

### 4. Bridging logic not testable end-to-end
Without a fully migrated database and a current Docker build, the core feature (auto-create MeetingSession on confirmation, auto-delete on unconfirmation) cannot be validated. This should be re-tested after:

1. Rebuilding the Docker image with current source
2. Running `--migrate` to apply `20260513203421_ConnectCatalogToMeetings`
3. Repeating the full smoke test cycle

### 5. Code correctness (source review)
Ignoring deployment issues, the source code appears well-structured:
- `SyncMeetingSession` handles both create and delete paths
- `ResolveMeetingLocation` follows the documented convention
- Race-condition guard via `DbUpdateException` catch and unique filtered index
- `DeleteSlotAsync` and `DeleteAsync` clean up connected meetings before deletion
- `UpdateSlotAsync` propagates date/time/location changes to confirmed meetings
- DTOs and frontend models include all new catalog-origin fields
- `PopulateConnectedMeetingsAsync` enriches slot DTOs with connected meeting info
