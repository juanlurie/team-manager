# Diagnosis: Meeting Series Locations Config

## Bug Description
The meeting series should use the locations from the config screen for it. Also move the locations screen to the meeting series screen as a config popup.

## Root Cause

**Part 1 — Meeting series already uses config locations (no code fix needed):**
`MeetingSeriesSlot` already has a `LocationId` foreign key to `SlotLocation`. The `meeting-series-slots.component.ts:236-239` loads locations via `SlotLocationService.getAll(true)` and presents them as selectable chips when creating slots. The slot detail view (`meeting-series-detail.component.ts:72-75`) displays the location name and color. This connection is already working correctly.

**Part 2 — Locations screen is a standalone page, not integrated into meeting series:**
The slot locations CRUD screen (`slot-locations.component.ts`) is currently:
- A standalone page at route `/slot-locations` (`app.routes.ts:54-56`)
- Listed in `SECONDARY_NAV` in `app.component.ts` (reduced opacity sidebar section)
- Completely disconnected from the meeting series UI flow

Users managing meeting series have to navigate away to a separate page to configure locations, then come back.

## Fix Approach

1. **Extract the locations CRUD UI into a reusable dialog component** — Move the template and logic from `slot-locations.component.ts` into a new dialog component `locations-config-dialog.component.ts` that uses `MatDialog`.

2. **Add a "Manage Locations" button to the meeting series list page** — Place a config/settings button on `meeting-series-list.component.ts` header that opens the locations dialog.

3. **Keep the standalone route but remove from nav** — Keep `/slot-locations` route registered for backward compatibility but remove it from `SECONDARY_NAV` in `app.component.ts`. The primary access point becomes the meeting series screen.

## Files to Change

| File | Change |
|------|--------|
| `team-manager-ui/src/app/features/meeting-series/locations-config-dialog.component.ts` | **NEW** — Dialog component with locations CRUD (extracted from slot-locations.component.ts) |
| `team-manager-ui/src/app/features/meeting-series/meeting-series-list.component.ts` | Add "Manage Locations" button that opens the dialog |
| `team-manager-ui/src/app/app.component.ts` | Remove `/slot-locations` from SECONDARY_NAV |
| `team-manager-ui/src/app/features/slot-locations/slot-locations.component.ts` | Simplify to just open the dialog or keep as-is (backward compat) |

## Regression Risk Areas

1. **Existing `/slot-locations` bookmarks** — Keeping the route registered prevents broken links. The nav removal only affects discoverability.
2. **Dialog imports** — Must ensure `MatDialogModule` and related Material imports are available in the meeting series feature module context.
3. **SlotLocationService** — Already `providedIn: 'root'`, so no provider changes needed.
4. **Meeting series slot creation** — No changes to the slot creation flow; it already uses `SlotLocationService` correctly.
5. **Meeting planner (separate feature)** — The meeting form dialog (`meeting-form-dialog.component.ts`) also uses `SlotLocationService`. This change does not affect it.
