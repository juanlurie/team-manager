# Availability Slot Booking — Architecture Document

**Date:** 2026-05-14
**Status:** Draft
**Author:** Architect

---

## 1. Problem Statement

This feature addresses two distinct but related problems in the Meeting Series scheduling workflow:

### 1.1 Problem A: Bulk Availability Selection

Currently, a participant declares availability one item at a time via `POST /api/v1/meeting-series/items/{itemId}/availability`. In a series with N items and M slots, a participant must make up to N×M individual API calls to express all their availability preferences. This is tedious and error-prone.

**Desired behavior:** A participant should be able to select all slots they are available for across all items in a series in a single action — a "bulk declare" operation.

### 1.2 Problem B: Slot Mutual Exclusion (Booking Lock)

Currently, multiple items within the same series can be confirmed for the same slot. The confirmation logic in `CheckAndConfirmItemAsync` (MeetingSeriesService.cs:329) iterates through an item's availabilities and picks the first slot where all mandatory participants are available. It does **not** check whether another item in the same series has already claimed that slot.

**Desired behavior:** When an item is confirmed for a slot, that slot becomes unavailable (locked) for all other unconfirmed items in the same series. No two items in the same series may be confirmed for the same slot.

---

## 2. Proposed Solution

### 2.1 Bulk Availability Selection

Introduce a new endpoint that accepts a batch of availability declarations for a single team member across multiple items and slots within a series. The endpoint will:

1. Accept a list of `(itemId, slotId)` tuples representing the participant's availability.
2. Upsert `MeetingSeriesItemAvailability` records — creating new ones and removing any existing records not in the submitted set (full replacement semantics for the participant within that series).
3. After applying all changes, run the confirmation check for every affected item.

**Why full replacement semantics?** It simplifies the UI mental model — the user sees a matrix of items × slots, checks the boxes they are available for, and submits. The backend treats the submission as the authoritative set of that participant's availability for the entire series.

### 2.2 Slot Mutual Exclusion

Introduce a `SlotClaim` entity that tracks which item has claimed (been confirmed for) which slot within a series. The confirmation logic will be modified to:

1. Before confirming an item for a slot, check if a `SlotClaim` already exists for that slot within the series.
2. If a claim exists and belongs to a different item, skip that slot and try the next available slot.
3. If a claim exists and belongs to the same item (re-confirmation), allow it.
4. When confirming, create a `SlotClaim` record.
5. When unconfirming, delete the `SlotClaim` record.

Additionally, add a database-level unique constraint on `(MeetingSeriesId, MeetingSeriesSlotId)` in the `SlotClaim` table to enforce mutual exclusion at the persistence layer as a safety net.

**Why a separate entity rather than a flag on the slot?** A slot is a definition of a possible time — it is not "used up" in an absolute sense. The claim is scoped to the series and represents a logical lock between an item and a slot. A separate entity makes the relationship explicit, queryable, and auditable.

---

## 3. Data Model Changes

### 3.1 New Entity: `MeetingSeriesSlotClaim`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `Id` | `Guid` | PK | Unique identifier |
| `MeetingSeriesId` | `Guid` | FK, Not Null | The series this claim belongs to |
| `MeetingSeriesSlotId` | `Guid` | FK, Not Null | The slot being claimed |
| `MeetingSeriesItemId` | `Guid` | FK, Not Null | The item that claimed this slot |
| `ClaimedAt` | `DateTimeOffset` | Not Null | When the claim was created |
| `ClaimedByMemberId` | `Guid` | FK, Not Null | The user who triggered the confirmation |

**Unique constraint:** `UQ_SlotClaim_Series_Slot` on `(MeetingSeriesId, MeetingSeriesSlotId)` — ensures a slot can only be claimed once per series.

**Navigation properties:**
- `MeetingSeries` — the parent series
- `MeetingSeriesSlot` — the claimed slot
- `MeetingSeriesItem` — the claiming item
- `ClaimedByMember` — the `TeamMember` who triggered confirmation

### 3.2 Existing Entity: `MeetingSeriesSlot` — No changes required

The slot entity itself does not need modification. The claim relationship is managed through the new `SlotClaim` entity.

### 3.3 Existing Entity: `MeetingSeriesItem` — No changes required

`IsConfirmed` and `ConfirmedSlotId` remain as the item-level confirmation state. The `SlotClaim` entity provides the series-level mutual exclusion enforcement.

### 3.4 Existing Entity: `MeetingSeriesItemAvailability` — No changes required

The availability entity remains unchanged. Bulk operations work by creating/deleting multiple availability records in a single transaction.

### 3.5 Entity Relationship Diagram (new relationships)

```
MeetingSeries ──┬── MeetingSeriesSlot
                ├── MeetingSeriesItem ── MeetingSeriesItemAvailability
                │                       ── MeetingSeriesItemParticipant
                └── MeetingSeriesSlotClaim ──> MeetingSeriesSlot (FK)
                                             ──> MeetingSeriesItem (FK)
                                             ──> TeamMember (FK)
```

Unique constraint: `(MeetingSeriesId, MeetingSeriesSlotId)` on `MeetingSeriesSlotClaim`.

---

## 4. API Changes

### 4.1 New Endpoint: Bulk Declare Availability

```
POST /api/v1/meeting-series/{seriesId}/members/{memberId}/bulk-availability
```

**Request body:**

```json
{
  "availabilities": [
    {
      "itemId": "guid-1",
      "slotId": "slot-a"
    },
    {
      "itemId": "guid-1",
      "slotId": "slot-b"
    },
    {
      "itemId": "guid-2",
      "slotId": "slot-a"
    }
  ]
}
```

**Validation rules:**
- All `itemId`s must belong to the specified `seriesId`.
- All `slotId`s must belong to the specified `seriesId`.
- `memberId` must be a participant of each referenced item.
- Duplicate `(itemId, slotId)` tuples in the request are deduplicated.

**Response:** `200 OK` with the updated `MeetingSeriesDto` (same shape as existing `GetById` response).

**Behavior:**
1. Load all existing availabilities for the given `memberId` across all items in the series.
2. Compute the set difference: records to delete (existing but not in request) and records to insert (in request but not existing).
3. Execute deletes and inserts within a single transaction.
4. For each affected item, run the confirmation check (which now includes slot exclusivity logic).
5. Return the updated series state.

### 4.2 New Endpoint: Get Bulk Availability Matrix

```
GET /api/v1/meeting-series/{seriesId}/members/{memberId}/bulk-availability
```

**Response:**

```json
{
  "seriesId": "guid-series",
  "memberId": "guid-member",
  "memberName": "Jane Doe",
  "items": [
    {
      "itemId": "guid-1",
      "itemTitle": "Sprint Review",
      "availableSlotIds": ["slot-a", "slot-b"]
    },
    {
      "itemId": "guid-2",
      "itemTitle": "Retrospective",
      "availableSlotIds": ["slot-a"]
    }
  ],
  "slots": [
    {
      "slotId": "slot-a",
      "date": "2026-05-20",
      "startTime": "09:00",
      "endTime": "10:00",
      "isClaimed": true,
      "claimedByItemId": "guid-1"
    },
    {
      "slotId": "slot-b",
      "date": "2026-05-21",
      "startTime": "14:00",
      "endTime": "15:00",
      "isClaimed": false,
      "claimedByItemId": null
    }
  ]
}
```

**Purpose:** Provides the frontend with the data needed to render an availability matrix (items as rows, slots as columns) with checkboxes, showing which slots the user has selected and which slots are already claimed by confirmed items.

### 4.3 Modified Endpoint: Add Item Availability (existing)

```
POST /api/v1/meeting-series/items/{itemId}/availability
```

**No breaking changes.** The existing single-item availability endpoint continues to work. The confirmation logic it triggers will now include slot exclusivity checks.

### 4.4 New Endpoint: Unconfirm Item (explicit)

```
POST /api/v1/meeting-series/items/{itemId}/unconfirm
```

**Request body:** Empty (or `{}`).

**Response:** `200 OK` with the updated `MeetingSeriesDto`.

**Behavior:**
1. Set `item.IsConfirmed = false` and `item.ConfirmedSlotId = null`.
2. Delete the associated `MeetingSession` if one exists.
3. Delete the `SlotClaim` for this item.
4. Return the updated series.

**Rationale:** Currently unconfirmation only happens as a side effect of removing an availability record. An explicit endpoint gives users (and the frontend) a clear way to undo a confirmation without needing to manipulate availability records.

### 4.5 Modified DTO: `MeetingSeriesSlotDto`

Add two fields to the slot DTO returned in series responses:

```csharp
public bool IsClaimed { get; set; }
public Guid? ClaimedByItemId { get; set; }
```

These fields allow the frontend to visually indicate which slots are locked without requiring a separate API call.

---

## 5. Business Logic Changes

### 5.1 Modified Confirmation Logic (`CheckAndConfirmItemAsync`)

The current algorithm:

```
For each slot the item has availabilities for:
  If all mandatory participants have declared availability for this slot:
    Confirm the item with this slot
    Create MeetingSession
    Break
```

The new algorithm:

```
For each slot the item has availabilities for, ordered by slot date/time:
  If all mandatory participants have declared availability for this slot:
    Check if a SlotClaim exists for (seriesId, slotId):
      If no claim exists:
        Confirm the item with this slot
        Create SlotClaim(seriesId, slotId, itemId, claimedByMemberId)
        Create MeetingSession
        Break
      If claim exists and claim.ItemId == this item's Id:
        // Already confirmed for this slot — no-op
        Break
      If claim exists and claim.ItemId != this item's Id:
        // Slot is taken by another item — skip to next slot
        Continue
```

**Key change:** The slot claim check is inserted between the availability check and the confirmation action.

### 5.2 Modified Unconfirmation Logic (`CheckAndUnconfirmItemAsync`)

The current algorithm only checks if the mandatory participant condition still holds. The new algorithm adds:

```
If the item is being unconfirmed (IsConfirmed → false):
  Delete the SlotClaim for (seriesId, item.ConfirmedSlotId)
  Delete the associated MeetingSession
```

### 5.3 Cascading Re-evaluation After Unconfirmation

When an item is unconfirmed and releases its slot claim, other unconfirmed items in the series may now be eligible for confirmation on that slot. Two approaches:

**Approach A (recommended): Lazy re-evaluation**
- Do not automatically re-evaluate other items.
- The released slot becomes available in the availability matrix.
- When a participant next adds or modifies availability (including via the bulk endpoint), the confirmation check runs for affected items and may claim the newly freed slot.

**Approach B: Eager re-evaluation**
- After unconfirming an item, scan all unconfirmed items in the series and run the confirmation check for each.
- The first item (by creation order or priority) that has all mandatory participants available for the freed slot gets confirmed.

**Recommendation:** Approach A. Eager re-evaluation introduces non-determinism (which item gets the slot?) and can surprise users. Lazy re-evaluation keeps the system predictable — a slot is only claimed when a participant actively declares availability that triggers confirmation.

### 5.4 Bulk Availability Confirmation Flow

When the bulk availability endpoint processes a request:

```
1. Load all items in the series that are referenced in the request.
2. For each referenced item:
   a. Update availability records (delete removed, add new).
   b. If the item is already confirmed, skip (confirmation is stable).
   c. Run CheckAndConfirmItemAsync(itemId).
3. Commit transaction.
```

**Important:** Items are processed in the order they appear in the request. If two items in the same request could both claim the same slot, the first one processed wins. The request body ordering is the tiebreaker.

### 5.5 Transaction Boundaries

All operations within the bulk availability endpoint must execute within a single database transaction. This ensures:
- Availability deletions and insertions are atomic.
- Slot claims are created atomically with confirmations.
- No race condition allows two items to claim the same slot.

The unique constraint on `SlotClaim(MeetingSeriesId, MeetingSeriesSlotId)` provides a final safety net against concurrent confirmation attempts.

---

## 6. Edge Cases

### 6.1 Confirmed Item is Unconfirmed — Slot Release

**Scenario:** Item A is confirmed for Slot 1. User unconfirms Item A.

**Behavior:**
- `SlotClaim` for (series, Slot 1) is deleted.
- `MeetingSession` for Item A is deleted.
- Item A's `IsConfirmed` is set to `false`, `ConfirmedSlotId` to `null`.
- Slot 1 is now available for other items.
- No automatic re-confirmation of other items (lazy re-evaluation).

### 6.2 Confirmed Item's Availability is Removed

**Scenario:** Item A is confirmed for Slot 1. A mandatory participant removes their availability for Slot 1.

**Behavior:**
- `CheckAndUnconfirmItemAsync` detects that the mandatory participant condition no longer holds.
- Item A is unconfirmed (same as 6.1).
- `SlotClaim` is deleted.
- `MeetingSession` is deleted.

### 6.3 Slot is Deleted from the Series

**Scenario:** Slot 1 is deleted while Item A is confirmed for it.

**Behavior:**
- The deletion endpoint for slots should check if any `SlotClaim` references the slot.
- If a claim exists, either:
  - **Option A (recommended):** Reject the deletion with a `409 Conflict` and a message indicating the slot is in use by a confirmed item.
  - **Option B:** Cascade-delete the claim, unconfirm the item, and delete the `MeetingSession`. This is destructive and should require explicit user confirmation.

### 6.4 Item is Deleted from the Series

**Scenario:** Item A is deleted while it is confirmed for Slot 1.

**Behavior:**
- The deletion endpoint for items should cascade-delete the `SlotClaim` and `MeetingSession`.
- This is similar to the unconfirmation flow but triggered by item deletion.

### 6.5 Participant is Removed from a Confirmed Item

**Scenario:** A mandatory participant is removed from Item A, which is confirmed for Slot 1.

**Behavior:**
- Re-run the confirmation check. If the remaining mandatory participants still all have availability for Slot 1, the item stays confirmed.
- If not, unconfirm the item and release the slot claim.

### 6.6 Concurrent Bulk Availability Submissions

**Scenario:** Two users submit bulk availability for the same series at the same time, and both submissions could trigger confirmation of different items for the same slot.

**Behavior:**
- The unique constraint on `SlotClaim(MeetingSeriesId, MeetingSeriesSlotId)` prevents both from succeeding.
- The first transaction to commit wins. The second transaction will receive a unique constraint violation.
- The service should catch this exception and either:
  - Retry the confirmation logic (the losing item will pick the next available slot).
  - Return a `409 Conflict` to the caller with details about which slot was claimed.

**Recommendation:** Retry once with a fresh read of the series state. If the retry also fails, return a `409 Conflict`.

### 6.7 Bulk Availability with No Changes

**Scenario:** User submits a bulk availability request that is identical to their current state.

**Behavior:**
- The diff computation finds zero records to insert and zero to delete.
- No confirmation checks are triggered.
- Return the current series state with a `200 OK`.

### 6.8 All Slots Become Claimed

**Scenario:** A series has 3 slots and 3 items. Each item gets confirmed for a different slot. A 4th item is added.

**Behavior:**
- The 4th item cannot be confirmed because no slots are available.
- It remains in an unconfirmed state.
- The frontend should visually indicate that no slots are available for this item.
- If a slot becomes available (via unconfirmation), the 4th item may be confirmed on the next availability change.

### 6.9 Mandatory vs Optional Participants

**Scenario:** An item has 2 mandatory and 3 optional participants. All 2 mandatory participants are available for Slot 1, but only 1 of 3 optional participants is available.

**Behavior:**
- The item is confirmed for Slot 1. Optional participant availability does not affect confirmation.
- This is the existing behavior and remains unchanged.

### 6.10 Item Has No Mandatory Participants

**Scenario:** An item has only optional participants.

**Behavior:**
- The item cannot be confirmed (existing behavior, unchanged).
- The `CheckAndConfirmItemAsync` method returns early if `mandatoryParticipantIds.Count == 0`.

---

## 7. Migration Strategy

### 7.1 EF Core Migration

A single migration will be created to add the `MeetingSeriesSlotClaim` table:

```
Migration name: AddMeetingSeriesSlotClaim
```

**Up migration:**
1. Create `MeetingSeriesSlotClaim` table with columns: `Id`, `MeetingSeriesId`, `MeetingSeriesSlotId`, `MeetingSeriesItemId`, `ClaimedAt`, `ClaimedByMemberId`.
2. Add foreign key constraints to `MeetingSeries`, `MeetingSeriesSlot`, `MeetingSeriesItem`, and `TeamMember`.
3. Add unique index on `(MeetingSeriesId, MeetingSeriesSlotId)`.
4. Add regular indexes on `MeetingSeriesItemId` and `ClaimedByMemberId` for query performance.

**Down migration:**
1. Drop the `MeetingSeriesSlotClaim` table.

### 7.2 Backfilling Existing Data

If there are already confirmed items in production, the migration should include a data seed step:

```
For each MeetingSeriesItem where IsConfirmed = true AND ConfirmedSlotId IS NOT NULL:
  Insert a MeetingSeriesSlotClaim record:
    MeetingSeriesId = item.MeetingSeriesId
    MeetingSeriesSlotId = item.ConfirmedSlotId
    MeetingSeriesItemId = item.Id
    ClaimedAt = item.CreatedAt (or current time)
    ClaimedByMemberId = item.MeetingSeries.CreatedByMemberId
```

This ensures the mutual exclusion constraint is respected for existing confirmed items from the moment the migration is applied.

**Migration execution order:**
1. Create the table (no data yet).
2. Run the backfill script as part of the same migration (within the same transaction).
3. Add the unique constraint after the backfill completes.

This ordering is critical — adding the unique constraint before the backfill would fail if two existing items are confirmed for the same slot (a data integrity issue that should be surfaced as an error).

### 7.3 Handling Pre-existing Conflicts

If the backfill detects that two items in the same series are confirmed for the same slot:

- **Option A (recommended):** Abort the migration and log an error. The data must be manually corrected before the migration can proceed.
- **Option B:** Keep only the claim for the item with the earliest `CreatedAt` timestamp and log a warning for the others.

**Recommendation:** Option A. Silent data loss is unacceptable. The migration should fail loudly if pre-existing conflicts are found.

### 7.4 Deployment Sequence

1. Deploy the backend with the new migration (table created, data backfilled, constraints applied).
2. Deploy the new API endpoints.
3. Deploy the frontend with the bulk availability UI.

The new endpoints are additive — they do not modify existing endpoint contracts. The frontend can be deployed independently after the backend is live.

---

## 8. Risks and Trade-offs

### 8.1 Risk: Race Conditions in Confirmation

**Description:** Two concurrent requests could both see a slot as unclaimed and attempt to claim it simultaneously.

**Mitigation:** The unique constraint on `SlotClaim(MeetingSeriesId, MeetingSeriesSlotId)` provides a hard guarantee at the database level. The application layer should handle constraint violation exceptions gracefully (retry or return 409).

**Residual risk:** Low. PostgreSQL's unique constraint enforcement is reliable under concurrent access.

### 8.2 Risk: Deadlocks Under High Concurrency

**Description:** Multiple concurrent bulk availability requests for the same series could cause database deadlocks if they lock rows in different orders.

**Mitigation:** Process items in a deterministic order (e.g., by `ItemId` ascending) within the bulk endpoint. Use a single transaction with appropriate isolation level (Read Committed is sufficient given the unique constraint).

**Residual risk:** Low. The transaction scope is narrow (availability upserts + confirmation checks), reducing the window for deadlocks.

### 8.3 Trade-off: Lazy vs Eager Re-evaluation

**Decision:** Lazy re-evaluation (Section 5.3, Approach A).

**Trade-off:**
- **Pro:** Predictable behavior. Users control when items get confirmed. No surprise confirmations.
- **Con:** A freed slot may sit unused until a participant makes another availability change.

**Alternative:** Eager re-evaluation would automatically fill freed slots but introduces non-determinism and potential user confusion.

### 8.4 Trade-off: Full Replacement vs Incremental Bulk Availability

**Decision:** Full replacement semantics for the bulk endpoint.

**Trade-off:**
- **Pro:** Simple UI mental model. The submitted set is the authoritative state. No need to reason about "add" vs "remove" operations.
- **Con:** If two users edit availability concurrently, the last writer wins for the entire set (not just their changes).

**Mitigation:** The bulk availability GET endpoint returns the current state, so the frontend can implement optimistic locking or at least warn the user if the state has changed since they loaded the matrix.

### 8.5 Trade-off: Slot Claim as Separate Entity vs Flag on Slot

**Decision:** Separate `SlotClaim` entity.

**Trade-off:**
- **Pro:** Explicit relationship. Queryable. Auditable (tracks who claimed when). Supports future features like "claim history" or "claim expiration."
- **Con:** Additional table, additional join in queries.

**Alternative:** Adding `IsClaimed` and `ClaimedById` to `MeetingSeriesSlot` would be simpler but conflates the slot definition with its usage state. A slot is a reusable concept — it can be claimed, released, and re-claimed. A separate entity models this lifecycle more accurately.

### 8.6 Risk: Frontend Complexity

**Description:** The bulk availability matrix UI (items × slots grid with checkboxes, claim indicators, and mandatory participant counts) is significantly more complex than the current per-item availability flow.

**Mitigation:** Build the matrix as a standalone Angular component with its own state management. Use the new GET bulk availability endpoint to populate the initial state and the POST bulk endpoint to submit changes.

### 8.7 Risk: Migration Data Integrity

**Description:** If pre-existing confirmed items have conflicting slot assignments, the migration will fail (Section 7.3, Option A).

**Mitigation:** Before deploying the migration, run a pre-flight check query to detect conflicts:

```sql
SELECT MeetingSeriesId, ConfirmedSlotId, COUNT(*)
FROM "MeetingSeriesItems"
WHERE "IsConfirmed" = true AND "ConfirmedSlotId" IS NOT NULL
GROUP BY MeetingSeriesId, ConfirmedSlotId
HAVING COUNT(*) > 1;
```

If this query returns rows, the data must be manually corrected before the migration can proceed.

### 8.8 Trade-off: Tiebreaking for Slot Claims

**Decision:** First item processed in the bulk request wins the slot.

**Trade-off:**
- **Pro:** Deterministic and transparent. The order in the request body is the tiebreaker.
- **Con:** The user may not be aware that order matters.

**Mitigation:** Document this behavior in the API documentation. The frontend should order items in the request body by a meaningful criterion (e.g., creation date, priority, or user-specified order).

---

## Appendix A: Summary of Changes

| Change | Type | Impact |
|---|---|---|
| `MeetingSeriesSlotClaim` entity | New | Database migration required |
| `POST .../bulk-availability` | New endpoint | Frontend integration |
| `GET .../bulk-availability` | New endpoint | Frontend integration |
| `POST .../items/{id}/unconfirm` | New endpoint | Frontend integration |
| `MeetingSeriesSlotDto` fields | DTO addition | Backward compatible |
| `CheckAndConfirmItemAsync` | Logic modification | Affects all confirmation paths |
| `CheckAndUnconfirmItemAsync` | Logic modification | Affects all unconfirmation paths |
| Slot deletion validation | Logic addition | Rejects deletion of claimed slots |
| Item deletion cascade | Logic addition | Cleans up claims on item deletion |

## Appendix B: Open Questions

1. **Should optional participant availability affect confirmation?** Currently it does not. Should there be a configurable threshold (e.g., "confirm when at least N optional participants are available")?

2. **Should there be a priority/ordering mechanism for items?** Currently, the first item to claim a slot wins. Should items have a priority field that determines which item gets preference when multiple items compete for the same slot?

3. **Should slot claims expire?** If an item is confirmed but the meeting date passes without the session occurring, should the slot be automatically released?

4. **Should the bulk availability endpoint support partial updates?** Currently it uses full replacement semantics. Should there be an `operation` field (`set`, `add`, `remove`) to support incremental changes?

5. **What is the behavior when a series is deactivated (`IsActive = false`)?** Should existing claims and sessions be preserved or cleaned up?
