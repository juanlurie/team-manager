# Architecture: Unified Slot Selection for Availability

## Problem Statement

The current "Set My Availability" flow (`BulkAvailabilityComponent`) presents a dense matrix grid with meeting items as rows and availability slots as columns. Users must check individual cells per-item, which is:
- Visually overwhelming for series with many items and slots
- Redundant — in practice, users are available at the same times regardless of which meeting item
- Different from the intuitive weekly calendar grid used during series slot creation (`MeetingSeriesSlotsComponent`)

The feature request: unify the availability selection to use the same visual weekly calendar grid as series creation, capturing ONE set of slots that applies to ALL items in the series.

## Proposed Solution

Replace the `BulkAvailabilityComponent` with a new component that reuses the visual slot-picking grid from `MeetingSeriesSlotsComponent`. The user selects time slots on a weekly calendar, and those slots are submitted as availability for ALL meeting items in the series.

### Key Design Decisions
1. **Reuse the grid UI** — Extract the slot-picking grid from `MeetingSeriesSlotsComponent` into a shared component, OR build a new availability component that mirrors its template/logic
2. **One set of slots for all items** — The backend will create `MeetingSeriesItemAvailability` records for each item × selected slot combination
3. **Existing per-item data** — When the user submits, existing per-item availability for that user is cleared and replaced with the unified selection

## Backend Changes

### New Endpoint
Add `POST api/v1/meeting-series/:id/my-availability` that accepts a simple list of slot IDs:

```csharp
// New DTO
public record SetMyAvailabilityRequest(string[] SlotIds);

// New endpoint in MeetingSeriesController
[HttpPost("{id}/my-availability")]
public async Task<IActionResult> SetMyAvailability(Guid id, SetMyAvailabilityRequest request)
```

### Service Method
In `MeetingSeriesService.cs`, add `SetMyAvailabilityAsync`:

```csharp
public async Task SetMyAvailabilityAsync(Guid seriesId, string[] slotIds, Guid teamMemberId)
{
    // 1. Get all items for the series
    var items = await _context.MeetingSeriesItems
        .Where(i => i.MeetingSeriesId == seriesId)
        .Select(i => i.Id)
        .ToListAsync();

    // 2. Delete existing availability for this member on this series
    var existing = await _context.MeetingSeriesItemAvailabilities
        .Where(a => items.Contains(a.MeetingSeriesItemId) && a.TeamMemberId == teamMemberId)
        .ToListAsync();
    _context.MeetingSeriesItemAvailabilities.RemoveRange(existing);

    // 3. Create new availability for each item × slot combination
    var availabilities = items.SelectMany(itemId =>
        slotIds.Select(slotId => new MeetingSeriesItemAvailability
        {
            Id = Guid.NewGuid(),
            MeetingSeriesItemId = itemId,
            SlotId = slotId,
            TeamMemberId = teamMemberId
        })
    ).ToList();

    await _context.MeetingSeriesItemAvailabilities.AddRangeAsync(availabilities);
    await _context.SaveChangesAsync();
}
```

### Existing Endpoint — Keep for Compatibility
Keep `POST api/v1/meeting-series/:id/bulk-availability` unchanged. It may be used by other flows.

### GET Endpoint — Add unified view
Add `GET api/v1/meeting-series/:id/my-availability` that returns the set of slot IDs the current user has selected (union of all their item availabilities):

```csharp
[HttpGet("{id}/my-availability")]
public async Task<IActionResult> GetMyAvailability(Guid id)
// Returns: string[] slotIds
```

## Frontend Changes

### New Component: `my-availability.component.ts`
Create at `team-manager-ui/src/app/features/meeting-series/my-availability.component.ts`.

This component:
- Loads the series (to get existing slots)
- Shows the weekly calendar grid (same visual as `MeetingSeriesSlotsComponent`)
- Pre-selects slots the user has already chosen (from `GET my-availability`)
- On submit, calls `POST my-availability` with selected slot IDs
- Navigates back to series detail on success

### Template Structure
Mirror `MeetingSeriesSlotsComponent` grid:
- Week navigation (prev/next week)
- Time rows based on slot durations
- Click cells to toggle selection
- Summary showing selected count
- Save/Cancel buttons

### Reuse Strategy
The grid logic in `MeetingSeriesSlotsComponent` is tightly coupled to slot creation (duration picker, location picker, etc.). For the availability component:
- **Option A:** Extract grid into shared `slot-picker-grid.component.ts` — cleaner but more refactoring
- **Option B:** Duplicate the grid template in the new component — faster, less risk

**Recommendation: Option B** for this change. The availability grid is simpler (no duration/location pickers). Duplication is acceptable; extraction can happen later if a third consumer emerges.

### Routing Changes
Update `meeting-series.routes.ts`:
```typescript
{
  path: ':id/availability',
  loadComponent: () => import('./my-availability.component').then(m => m.MyAvailabilityComponent)
}
```
Replace the current `bulk-availability.component` route.

### Service Changes
Add to `meeting-series.service.ts`:
```typescript
getMyAvailability(seriesId: string): Observable<string[]>
setMyAvailability(seriesId: string, slotIds: string[]): Observable<void>
```

### Detail Page Change
`meeting-series-detail.component.ts` — the "Set My Availability" button already navigates to `['/meeting-series', s.id, 'availability']`. No change needed since the route stays the same.

## Data Flow

```
User clicks "Set My Availability" on series detail
  → Navigate to /meeting-series/:id/availability
  → MyAvailabilityComponent loads
    → GET /api/v1/meeting-series/:id → get series + slots
    → GET /api/v1/meeting-series/:id/my-availability → get user's existing slot IDs
    → Render weekly grid with pre-selected cells
  → User clicks cells to toggle slots
  → User clicks "Save"
    → POST /api/v1/meeting-series/:id/my-availability { slotIds: [...] }
    → Backend: clears existing, creates item×slot records for all items
  → Navigate back to /meeting-series/:id
```

## Migration / Compatibility

### Existing Per-Item Data
When a user submits unified availability, their existing per-item availability records are deleted and replaced. This is intentional — the new model is "I'm available at these times" (applies to all items).

### Other Users' Data
Unaffected. Each user's availability is scoped to their `TeamMemberId`.

### Bulk Availability Endpoint
The existing `POST bulk-availability` endpoint is kept. If any external consumer uses it, it continues to work.

### Display in Bulk View
If the old bulk availability view is ever revisited, it will still work — the data model (`MeetingSeriesItemAvailability`) is unchanged. The unified submission just creates records for all items.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| User loses per-item granularity | Medium | Acceptable — feature request explicitly asks for unified selection |
| Existing availability data cleared on first save | Low | Only cleared for the submitting user; other users unaffected |
| Grid UI differs slightly from slot creation | Low | Use same template structure, styles, and interaction patterns |
| Backend creates many records (items × slots) | Low | Typical series has 3-8 items and 5-20 slots = 15-160 records, trivial for EF Core |
| Route change breaks bookmarks | None | Route path stays `/meeting-series/:id/availability` |
