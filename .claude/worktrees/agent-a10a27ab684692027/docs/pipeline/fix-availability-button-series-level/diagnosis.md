# Diagnosis: Set Availability Button at Series Level

## Bug Description
The "Set Availability" button on the My Meetings screen is shown per item. It should be shown once at the series level.

## Root Cause

**File:** `team-manager-ui/src/app/features/meeting-series/my-meetings.component.ts`
**Lines:** 57-60 (template), inside the `@for (item of group.items)` loop

The "Set Availability" button is rendered inside the per-item card loop:
```html
@for (item of group.items; track item.itemId) {
  <div class="item-card">
    ...
    <button mat-stroked-button [routerLink]="['/meeting-series', item.seriesId, 'availability']">
      Set Availability
    </button>
  </div>
}
```

This means every meeting item in a series gets its own "Set Availability" button. Since availability is now unified at the series level (one set of slots applies to all items), having one button per item is redundant and confusing.

## Fix Approach

Move the "Set Availability" button out of the item card loop and into the series group header. Each series group should have one button that navigates to `/meeting-series/{seriesId}/availability`.

The button should only appear when there are open (unconfirmed) items in the series — matching the pattern already used in `my-meeting-series.component.ts`.

## Files to Change

| File | Change |
|------|--------|
| `team-manager-ui/src/app/features/meeting-series/my-meetings.component.ts` | Move "Set Availability" button from item card to series group header; remove per-item buttons |

## Data Needed

The `MyMeetingItem` model already has `isConfirmed` per item. We need to compute `hasOpenItems` per series group (true if any item in the group has `isConfirmed === false`). This can be done with a computed signal or inline in the template.

## Regression Risk Areas

- **Low risk**: Only template changes in one component. No backend changes needed.
- The route `/meeting-series/:id/availability` is unchanged and still works.
- The `My Meetings` page data model is unchanged.
- Visual layout of item cards changes slightly (button removed), but this is the intended fix.
