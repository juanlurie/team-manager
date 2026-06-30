# UX Design Document — Availability Slot Booking

**Date:** 2026-05-14
**Status:** Draft
**Author:** UX Designer
**Related:** [Architecture Document](./arch.md)

---

## 1. Overview

This document defines the user experience for the bulk availability selection and slot mutual exclusion feature in Meeting Series. The existing UI (see `meeting-series-item-availability.component.ts`) lets a participant select slots for **one item at a time**. This feature replaces that with a **series-wide availability matrix** where participants declare availability for all items in one action, and visually see when a slot has been claimed by another item.

The design follows the existing codebase patterns: Angular standalone components, Angular Material, dark theme with `rgba`-based surfaces, signal-based state, breadcrumb navigation, and card-based section layouts.

---

## 2. User Flows

### 2.1 Flow: Viewing the Availability Matrix

**Actor:** Participant (team member assigned to one or more items in a series)
**Entry point:** Series detail page → "Set My Availability" button, or a direct link from a notification/email.

| Step | Action | System Response |
|------|--------|-----------------|
| 1 | User navigates to `/meeting-series/:id/items/:itemId/availability` (existing route, repurposed) or a new route `/meeting-series/:id/availability/:memberId` | Loads the series, resolves the current user's member ID |
| 2 | System fetches the series data including all items, slots, existing availabilities, and slot claims | Renders the availability matrix (see §3.1) |
| 3 | User sees a grid: rows = items they are a participant of, columns = slots in the series | Checkboxes are pre-checked based on the user's existing availability records |
| 4 | Each cell shows: checkbox state, and if the slot is claimed by another item, a claim indicator | Claimed-by-other cells are visually distinct (see §3.2) |
| 5 | User can scroll horizontally if there are many slots, vertically if there are many items | Matrix is scrollable in both axes |

**Exit:** User modifies checkboxes and clicks "Save" (→ Flow 2.2), or clicks "Cancel" (returns to series detail).

---

### 2.2 Flow: Declaring Bulk Availability

**Actor:** Participant
**Precondition:** User is viewing the availability matrix (Flow 2.1).

| Step | Action | System Response |
|------|--------|-----------------|
| 1 | User toggles checkboxes in the matrix to indicate which item-slot combinations they are available for | Checkboxes update immediately; a "pending changes" indicator appears in the save button (e.g., badge count or color change) |
| 2 | User clicks "Save Availability" (primary button, bottom-right of matrix) | Button enters loading state (spinner), becomes disabled |
| 3 | System sends `POST /api/v1/meeting-series/{seriesId}/members/{memberId}/bulk-availability` with the full set of checked `(itemId, slotId)` tuples | — |
| 4a | **Success (200):** System returns the updated series DTO | Snackbar: "Availability saved!" (2s). Matrix re-renders with fresh data. Any newly confirmed items show confirmation badges. |
| 4b | **Conflict (409):** A slot the user selected was claimed by another participant between load and save | Inline error banner at top of matrix listing the conflicted slots. User can adjust and retry. |
| 4c | **Validation error (400):** e.g., invalid itemId or slotId | Inline error message below the save button. Matrix unchanged. |
| 4d | **Server error (5xx):** | Inline error: "Failed to save availability. Please try again." Save button re-enables. |

---

### 2.3 Flow: Seeing a Slot Claimed by Another Item

**Actor:** Participant viewing the matrix
**Trigger:** Another item in the same series has been confirmed for a slot the current user was available for.

**Visual treatment (see §3.2):**

- The cell for that item-slot intersection shows a **lock icon** and the checkbox is **disabled** (greyed out, non-interactive).
- Hovering the cell shows a tooltip: *"This slot is confirmed for [Item Title]"*.
- The entire column header for that slot shows a **claimed badge** (small lock icon next to the slot time).
- The user can still see that they were available for this slot (their checkbox remains checked but disabled), so they understand why their availability did not result in a confirmation for their own item.

**Rationale:** The participant should understand *why* their item wasn't confirmed for that slot — not just see it as "unavailable." Transparency reduces confusion and support requests.

---

### 2.4 Flow: Unconfirming an Item

**Actor:** Series creator or admin (user with permission to manage the series)
**Entry point:** Series detail page → Item card → "Unconfirm" action, or from the item detail page.

| Step | Action | System Response |
|------|--------|-----------------|
| 1 | User clicks "Unconfirm" on a confirmed item | Confirmation dialog: *"Unconfirm [Item Title]? This will release the slot and allow other items to be scheduled."* |
| 2 | User confirms | System sends `POST /api/v1/meeting-series/items/{itemId}/unconfirm` |
| 3a | **Success:** Slot claim is deleted | Item status changes to "Pending" in the UI. The slot column header loses its claimed badge. Snackbar: "Item unconfirmed." |
| 3b | **Error:** | Snackbar: "Failed to unconfirm item." Item remains confirmed. |

**Note:** After unconfirmation, the released slot does **not** automatically get assigned to another item (lazy re-evaluation per the architecture doc). The series creator must manually trigger re-evaluation or wait for the next availability change to run the confirmation check.

---

## 3. UI Components

### 3.1 Availability Matrix Component

**Selector:** `app-bulk-availability-matrix`
**File:** (new) `team-manager-ui/src/app/features/meeting-series/bulk-availability-matrix.component.ts`

The matrix is a two-dimensional grid:

- **Rows:** Meeting items the current user is a participant of. Each row header shows the item title and a confirmation status badge.
- **Columns:** All slots in the series, sorted by date/time. Each column header shows the slot date, time range, and optionally a location indicator.
- **Cells:** Checkboxes indicating the user's availability for that item-slot pair.

**Structure:**

```
+-------------------+----------+----------+----------+
|                   | Slot 1   | Slot 2   | Slot 3   |
|                   | May 20   | May 21   | May 22   |
|                   | 09:00-10 | 14:00-15 | 09:00-10 |
+-------------------+----------+----------+----------+
| Sprint Review     | [✓]      | [✓]      | [ ]      |
| [Pending]         |          |          |          |
+-------------------+----------+----------+----------+
| Retrospective     | [🔒]     | [ ]      | [✓]      |
| [Pending]         | claimed  |          |          |
+-------------------+----------+----------+----------+
| Planning          | [✓]      | [🔒]     | [ ]      |
| [Confirmed ✓]     |          | claimed  |          |
+-------------------+----------+----------+----------+
```

**Row header (per item):**
- Item title (bold, 0.85rem)
- Status badge: "Confirmed" (green) or "Pending" (grey) — reuses `.item-status` class from existing components
- If confirmed, a small checkmark icon

**Column header (per slot):**
- Date (bold, 0.78rem)
- Time range (0.72rem, opacity 0.6)
- Location dot + name if applicable (reuses `.slot-loc-dot` and `.slot-loc` patterns)
- Claimed badge: small lock icon (🔒) if the slot is claimed by any item in the series

**Cell states:**

| State | Checkbox | Background | Border | Interaction |
|-------|----------|------------|--------|-------------|
| Unchecked, slot free | Empty box | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.07)` | Clickable — toggles to checked |
| Checked, slot free | Checked (✓) | `rgba(100,181,246,0.08)` | `rgba(100,181,246,0.3)` | Clickable — toggles to unchecked |
| Checked, slot claimed by *other* item | Checked, disabled | `rgba(255,152,0,0.06)` | `rgba(255,152,0,0.2)` | Disabled — tooltip explains |
| Unchecked, slot claimed by *other* item | Empty, disabled | `rgba(255,255,255,0.02)` | `rgba(255,255,255,0.05)` | Disabled — tooltip explains |
| Checked, slot claimed by *this* item | Checked, disabled | `rgba(76,175,80,0.08)` | `rgba(76,175,80,0.25)` | Disabled — tooltip: "Confirmed for this item" |
| Hovered (free slot only) | — | `rgba(100,181,246,0.06)` | `rgba(100,181,246,0.15)` | — |

---

### 3.2 Slot Claim Indicator

**Visual treatment for claimed slots:**

**In column headers:**
- A small lock icon (`<mat-icon>lock</mat-icon>`, 14px) appears to the right of the time range.
- Color: `#ff9800` (amber) for claimed-by-other, `#4caf50` (green) for claimed-by-this-item.

**In cells:**
- The checkbox is replaced with (or overlaid by) a lock icon when the slot is claimed by another item.
- The cell background uses the amber tint (`rgba(255,152,0,0.06)`) to signal "locked."
- Tooltip on hover: *"This slot is confirmed for [Item Title] by [ClaimedByMemberName]"*.

**In the slot summary bar (below the matrix):**
- A horizontal list of all slots with their claim status:
  ```
  Slots:  May 20 09:00 🔒 Sprint Review  ·  May 21 14:00 (free)  ·  May 22 09:00 (free)
  ```

---

### 3.3 Confirmation Status Indicators

Reused from existing components with minor enhancements:

| Status | Visual | Location |
|--------|--------|----------|
| Confirmed | Green badge with checkmark: `✅ Confirmed` | Row header in matrix, item cards on series detail |
| Pending | Grey badge: `⏳ Pending` | Row header in matrix, item cards on series detail |
| Ready to confirm | Blue badge: `🔵 Ready` (new) | Row header — shown when all mandatory participants have declared availability and a free slot exists |

The "Ready to confirm" badge is new and helps the series creator identify which items can be confirmed immediately. It appears when:
- All mandatory participants have at least one availability declared, AND
- At least one slot exists where all mandatory participants are available AND the slot is not claimed.

---

### 3.4 Bulk Submit/Save Controls

**Location:** Sticky footer below the matrix, or inline at the bottom of the matrix section.

**Layout:**

```
+------------------------------------------------------------------+
|  You have 3 unsaved changes                                      |
|  [ Cancel ]                              [ Save Availability ]    |
+------------------------------------------------------------------+
```

**Behavior:**
- The "Save Availability" button is a `mat-raised-button color="primary"`.
- While there are no changes compared to the loaded state, the button is in its default state.
- After the user toggles any checkbox, a change counter appears ("You have N unsaved changes") and the button gains a subtle pulse animation.
- During save: button shows a `mat-spinner` (diameter 18px) inline with the text, becomes disabled.
- On success: button returns to default, change counter clears, snackbar confirms.
- On error: button re-enables, error message appears above the button row.

**Cancel button:** `mat-stroked-button`, returns to series detail page without saving.

---

## 4. Wireframe Descriptions

### 4.1 Bulk Availability Page (Full Layout)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Meeting Series › Weekly Sync › Set My Availability                  │  ← breadcrumb
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Weekly Sync — Set Your Availability                                │  ← page title
│  Your role: Mandatory                                               │  ← meta
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  AVAILABILITY MATRIX                                                │  ← section
│                                                                     │
│  ┌──────────────────┬──────────────┬──────────────┬──────────────┐ │
│  │                  │  Wed May 20  │  Thu May 21  │  Fri May 22  │ │  ← slot headers
│  │                  │  09:00–10:00 │  14:00–15:00 │  09:00–10:00 │ │
│  │                  │  Room A 🔒   │  Room B      │  Room A      │ │
│  ├──────────────────┼──────────────┼──────────────┼──────────────┤ │
│  │ Sprint Review    │   [🔒]       │   [✓]        │   [ ]        │ │  ← item row
│  │ ⏳ Pending       │              │              │              │ │
│  ├──────────────────┼──────────────┼──────────────┼──────────────┤ │
│  │ Retrospective    │   [✓]        │   [ ]        │   [✓]        │ │  ← item row
│  │ ⏳ Pending       │              │              │              │ │
│  ├──────────────────┼──────────────┼──────────────┼──────────────┤ │
│  │ Planning         │   [✓]        │   [🔒]       │   [ ]        │ │  ← item row
│  │ ✅ Confirmed     │              │              │              │ │
│  └──────────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                     │
│  Slots:  May 20 09:00 🔒 Sprint Review  ·  May 21 14:00 (free)     │  ← slot summary
│         ·  May 22 09:00 (free)                                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  You have 2 unsaved changes                                         │  ← change indicator
│                                                                     │
│  [ Cancel ]                                      [ Save Availability│  ← action bar
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Series Detail Page (Enhanced with Bulk Availability Entry)

The existing series detail page (`meeting-series-detail.component.ts`) gains a new entry point:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Meeting Series › Weekly Sync                                        │
├─────────────────────────────────────────────────────────────────────┤
│  Weekly Sync                                    [🗑 Delete]         │
│  Created by Jane Doe · May 1, 2026  [Active]                       │
├─────────────────────────────────────────────────────────────────────┤
│  AVAILABILITY SLOTS (3)                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Wed May 20  09:00–10:00  🔴 Room A                    [×]  │   │
│  │  Thu May 21  14:00–15:00  🔵 Room B                    [×]  │   │
│  │  Fri May 22  09:00–10:00  🔴 Room A                    [×]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  [+ Add More Slots]                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  MEETING ITEMS (3)                                                  │
│  [+ Create Item]                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ✅ Sprint Review          [Confirmed]          [🗑]        │   │
│  │  Mandatory: 3 · Optional: 2 · 3/3 filled                    │   │
│  │  ✓ Confirmed slot: Wed May 20, 09:00–10:00                  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ⬜ Retrospective           [Pending]            [🗑]        │   │
│  │  Mandatory: 2 · Optional: 1 · 2/2 filled                    │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ⬜ Planning                [Pending]            [🗑]        │   │
│  │  Mandatory: 3 · Optional: 0 · 1/3 filled                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [📅 Set My Availability]          ← NEW: bulk availability entry   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Item Detail Page (Enhanced with Claim Info)

The existing item detail page (`meeting-series-item-detail.component.ts`) shows claim information in the availability matrix section:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Meeting Series › Weekly Sync › Sprint Review                        │
├─────────────────────────────────────────────────────────────────────┤
│  Sprint Review                                                      │
│  ✅ Confirmed                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  PARTICIPANTS                                                       │
│  🔵 Mandatory (3)                                                   │
│  [Alice] [Bob] [Charlie]                                            │
│  🟢 Optional (2)                                                    │
│  [Dave] [Eve]                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  AVAILABILITY MATRIX                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Wed May 20  09:00–10:00  🔴 Room A  🔒 CLAIMED (this item)│   │
│  │  Alice  Bob  Charlie  Dave  Eve                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Thu May 21  14:00–15:00  🔵 Room B                        │   │
│  │  Alice  Charlie  Eve                                        │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Fri May 22  09:00–10:00  🔴 Room A                        │   │
│  │  Bob  Charlie                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  🎉 This meeting is confirmed! A meeting session has been created.  │
│                                                                     │
│  [ Unconfirm ]  ← NEW: explicit unconfirm action                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Interaction Patterns

### 5.1 Checkbox Behavior

- **Click/tap:** Toggles the checkbox state immediately (client-side). The change is not persisted until the user clicks "Save."
- **Checkbox appearance:** Custom-styled to match the existing pattern in `meeting-series-item-availability.component.ts`:
  - Unchecked: 20×20px, 2px border `rgba(255,255,255,0.2)`, 4px border-radius.
  - Checked: background `rgba(100,181,246,0.2)`, border `#64b5f6`, white checkmark.
  - Disabled (claimed): opacity 0.4, cursor `not-allowed`, no hover effect.
- **Keyboard:** Tab navigates between checkboxes. Space/Enter toggles. Disabled checkboxes are skipped in tab order.

### 5.2 Tooltip Behavior

- **Trigger:** Hover (desktop) or long-press (mobile) on a claimed cell or claimed column header.
- **Content:**
  - Claimed by other item: *"This slot is confirmed for [Item Title]"*
  - Claimed by this item: *"This slot is confirmed for this item"*
  - Claimed column header: *"Claimed by [Item Title]"*
- **Position:** Above the element (or below if near the top of the viewport).
- **Delay:** 300ms on hover before showing.
- **Dismiss:** Mouse leave, tap elsewhere, or Escape key.

### 5.3 Hover States

| Element | Hover Effect |
|---------|-------------|
| Free slot cell | Background shifts to `rgba(100,181,246,0.06)`, border to `rgba(100,181,246,0.15)` |
| Checked free cell | Background deepens to `rgba(100,181,246,0.12)` |
| Claimed cell | No hover effect (disabled) |
| Row header | Background `rgba(255,255,255,0.04)` |
| Column header | Background `rgba(255,255,255,0.04)` |
| Save button (with changes) | Subtle scale-up (1.02x) with shadow |
| Cancel button | Standard Material stroked hover |

### 5.4 Disabled States

- **Claimed cells:** Checkbox is visually present but greyed out (opacity 0.4). The cell has a lock overlay icon. Cursor is `not-allowed`.
- **Save button (no changes):** Enabled but visually muted (opacity 0.6). Clicking does nothing or shows a brief tooltip "No changes to save."
- **Save button (saving):** Disabled, shows inline spinner.
- **Entire matrix (loading):** Overlay with `mat-spinner` (diameter 40px), centered. All interaction blocked.

### 5.5 Selection Feedback

- When a checkbox is toggled, the cell background transitions with a 150ms ease-out animation.
- The change counter in the action bar updates immediately.
- If the user toggles a checkbox back to its original state, the change counter decrements.

---

## 6. Responsive Behavior

### 6.1 Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | ≥ 900px | Full matrix visible. Max-width 900px, centered. |
| Tablet | 600–899px | Matrix scrolls horizontally within its container. Row headers are sticky on the left. |
| Mobile | < 600px | Matrix switches to a **card-per-item** layout (see §6.2). |

### 6.2 Mobile Layout (Card-per-Item)

On screens < 600px, the 2D grid is replaced with a vertical stack of item cards. Each card shows the item title, status, and a list of slots with checkboxes:

```
┌──────────────────────────────┐
│ Sprint Review                │
│ ⏳ Pending                   │
├──────────────────────────────┤
│  ☐ Wed May 20  09:00–10:00  │
│     🔴 Room A  🔒 Claimed    │
│                              │
│  ☑ Thu May 21  14:00–15:00  │
│     🔵 Room B                │
│                              │
│  ☐ Fri May 22  09:00–10:00  │
│     🔴 Room A                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Retrospective                │
│ ⏳ Pending                   │
├──────────────────────────────┤
│  ☑ Wed May 20  09:00–10:00  │
│     🔴 Room A                │
│                              │
│  ☐ Thu May 21  14:00–15:00  │
│     🔵 Room B                │
│                              │
│  ☑ Fri May 22  09:00–10:00  │
│     🔴 Room A                │
└──────────────────────────────┘
```

**Mobile-specific behaviors:**
- Cards are full-width with 8px gap between them.
- Checkboxes are larger (24×24px) for touch targets.
- Claimed slots show a full-width amber bar at the bottom of the slot row with the lock icon and item name.
- The save action bar is sticky at the bottom of the viewport (above any soft keyboard).

### 6.3 Horizontal Scroll (Tablet)

On tablet widths where the grid doesn't fit:
- The matrix container has `overflow-x: auto`.
- The first column (row headers) is sticky: `position: sticky; left: 0; z-index: 1;` with a solid background to prevent content from showing through during scroll.
- A subtle gradient fade on the right edge of the row headers indicates scrollability.
- Scrollbar is styled to be thin (4px) and semi-transparent.

---

## 7. Accessibility Considerations

### 7.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus to the next interactive element (checkbox, button, link) |
| Shift+Tab | Move focus to the previous interactive element |
| Space / Enter | Toggle the focused checkbox |
| Arrow keys (grid mode) | Move focus between cells: Up/Down moves between items, Left/Right moves between slots |
| Escape | Close any open tooltip or dialog |

**Focus order:** Breadcrumb → Page title → Matrix cells (row by row, left to right) → Slot summary → Cancel button → Save button.

**Focus indicator:** 2px solid outline in `#64b5f6` with 2px offset from the element edge. Must be visible on all interactive elements.

### 7.2 ARIA Labels

| Element | ARIA Attribute | Value |
|---------|---------------|-------|
| Matrix container | `role="grid"` | — |
| Matrix | `aria-label` | `"Availability matrix for [Series Title]"` |
| Row header | `role="rowheader"` | Item title + status |
| Column header | `role="columnheader"` | Slot date + time + location + claim status |
| Cell (free) | `role="gridcell"` | `"[Item Title], [Slot date time], [Available/Not available]"` |
| Cell (claimed) | `role="gridcell"` | `"[Item Title], [Slot date time], Slot claimed by [Other Item Title]"` |
| Checkbox | `aria-checked` | `"true"` or `"false"` |
| Checkbox (disabled) | `aria-disabled` | `"true"` |
| Lock icon | `aria-hidden` | `"true"` (label is on the cell) |
| Save button | `aria-busy` | `"true"` while saving |
| Change counter | `aria-live="polite"` | Announces change count to screen readers |
| Error banner | `role="alert"` | `aria-live="assertive"` |
| Tooltip | `role="tooltip"` | `aria-describedby` on the triggering cell |

### 7.3 Screen Reader Support

- The matrix is announced as a grid with row and column headers. Screen reader users hear the row header (item name) and column header (slot time) when navigating to a cell, followed by the checkbox state.
- Claimed cells include the claiming item name in the accessible description.
- The change counter uses `aria-live="polite"` so screen readers announce "You have 3 unsaved changes" when the count changes.
- Snackbar messages are announced via `aria-live="polite"` (Material MatSnackBar handles this).
- Error banners use `role="alert"` for immediate announcement.

### 7.4 Color and Contrast

- All text meets WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
- Claim status is **never communicated by color alone**. Claimed cells use a lock icon + disabled state + tooltip in addition to the amber tint.
- The amber tint for claimed cells (`rgba(255,152,0,0.06)`) is subtle; the lock icon is the primary indicator.
- Checked state uses both a checkmark and a background color change.

### 7.5 Reduced Motion

- If the user has `prefers-reduced-motion: reduce` set, all transitions and animations are disabled:
  - Checkbox state changes are instant (no 150ms transition).
  - Save button pulse animation is suppressed.
  - Tooltip fade-in is instant.
- Implementation: wrap all `transition` and `animation` CSS in a `@media (prefers-reduced-motion: no-preference)` block, or use `transition: none` in a reduced-motion media query.

---

## 8. Error States and Feedback

### 8.1 Slot Already Claimed (at view time)

**When:** User opens the matrix and sees that a slot they might want is already claimed.

**Feedback:**
- Cell shows lock icon, disabled checkbox, amber background.
- Tooltip on hover: *"This slot is confirmed for [Item Title]."*
- Column header shows lock badge.
- No error banner — this is an expected state, not an error.

### 8.2 Conflict During Submission (Race Condition)

**When:** User saves, but between loading the matrix and submitting, another participant's save caused a slot to be claimed.

**Feedback:**
- An error banner appears at the top of the matrix section:
  ```
  ⚠ Some slots were claimed while you were editing:
  • Wed May 20, 09:00–10:00 — now confirmed for "Sprint Review"
  Please review your availability and try again.
  ```
- The banner has a `[Dismiss]` button.
- The conflicted cells in the matrix are updated to show the locked state (amber background, lock icon).
- The user's checkboxes for those cells are automatically unchecked (since the slot is no longer available for their item).
- The change counter updates to reflect the auto-unchecked cells.
- The save button re-enables so the user can re-save with the updated selections.

**Banner styling:**
- Background: `rgba(255,152,0,0.1)`
- Border: `1px solid rgba(255,152,0,0.3)`
- Border-radius: 8px
- Padding: 12px 16px
- Text color: `#ff9800`
- Icon: `<mat-icon>warning</mat-icon>` (18px)

### 8.3 Validation Failure

**When:** The server returns a 400 error (e.g., invalid itemId, slotId not belonging to the series).

**Feedback:**
- Inline error message below the save button:
  ```
  Could not save availability. Some selections are invalid.
  ```
- Color: `#ef5350` (red), font-size 0.82rem.
- The matrix is not modified — user can review and retry.
- Save button re-enables.

### 8.4 Server Error (5xx)

**When:** The server returns a 500 or 503 error.

**Feedback:**
- Inline error message:
  ```
  Failed to save availability. Please try again.
  ```
- Same styling as validation error.
- Save button re-enables.
- If the error persists after 3 attempts, show a more prominent banner with a `[Report Issue]` link.

### 8.5 All Slots Claimed

**When:** A participant views the matrix and all slots are already claimed by other items.

**Feedback:**
- The matrix renders normally with all cells showing locked/disabled states.
- An informational banner at the top:
  ```
  ℹ All slots in this series are currently claimed. If a slot is released, you'll be able to update your availability.
  ```
- Banner styling:
  - Background: `rgba(100,181,246,0.08)`
  - Border: `1px solid rgba(100,181,246,0.2)`
  - Text color: `#64b5f6`
  - Icon: `<mat-icon>info</mat-icon>` (18px)

### 8.6 No Items Assigned to User

**When:** A user navigates to the availability page but is not a participant of any item in the series.

**Feedback:**
- Empty state in the matrix section:
  ```
  You are not assigned to any meeting items in this series.
  Contact the series organizer to be added to an item.
  ```
- Centered, with an icon (`<mat-icon>person_off</mat-icon>`, 48px, opacity 0.3).
- No save button is shown.
- `[Back to Series]` button below the message.

---

## 9. Integration with Existing UI

### 9.1 Route Changes

The existing route `/meeting-series/:id/items/:itemId/availability` (handled by `MeetingSeriesItemAvailabilityComponent`) is **repurposed** as the bulk availability entry point. The component is replaced with a new `BulkAvailabilityComponent` that:

1. Loads the full series data.
2. Identifies the current user's member ID.
3. Renders the availability matrix for all items the user is a participant of.

**New route added:**
```
{
  path: ':id/availability',
  loadComponent: () => import('./bulk-availability.component').then(m => m.BulkAvailabilityComponent)
}
```

The old per-item availability route can be kept for backward compatibility but should redirect to the new bulk route:
```
{
  path: ':id/items/:itemId/availability',
  redirectTo: ':id/availability'
}
```

### 9.2 Series Detail Page Changes

The series detail page (`meeting-series-detail.component.ts`) gains a new action button at the bottom:

```html
<div class="section availability-action">
  <button mat-raised-button color="primary" [routerLink]="['/meeting-series', s.id, 'availability']">
    <mat-icon>event_available</mat-icon> Set My Availability
  </button>
</div>
```

This button is visible only to users who are participants of at least one item in the series. For non-participants, it is hidden.

### 9.3 Item Detail Page Changes

The item detail page (`meeting-series-item-detail.component.ts`) gains:

1. **Claim status in the availability list:** Each slot row shows whether the slot is claimed and by which item.
2. **Unconfirm button:** Visible only to the series creator or admins, placed below the confirmed banner:
   ```html
   @if (item()?.isConfirmed && canUnconfirm()) {
     <div class="action-row">
       <button mat-stroked-button color="warn" (click)="unconfirm()">
         <mat-icon>cancel</mat-icon> Unconfirm
       </button>
     </div>
   }
   ```

### 9.4 Service Layer Changes

The `MeetingSeriesService` gains new methods:

```typescript
// Bulk availability
getBulkAvailability(seriesId: string, memberId: string): Observable<BulkAvailabilityResponse> {
  return this.http.get<BulkAvailabilityResponse>(
    `${this.baseUrl}/${seriesId}/members/${memberId}/bulk-availability`
  );
}

submitBulkAvailability(seriesId: string, memberId: string, request: BulkAvailabilityRequest): Observable<MeetingSeries> {
  return this.http.post<MeetingSeries>(
    `${this.baseUrl}/${seriesId}/members/${memberId}/bulk-availability`,
    request
  );
}

// Unconfirm
unconfirmItem(itemId: string): Observable<void> {
  return this.http.post<void>(`${this.baseUrl}/items/${itemId}/unconfirm`, {});
}
```

### 9.5 Model Changes

New interfaces added to `meeting-series.model.ts`:

```typescript
export interface MeetingSeriesSlotDto {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string;
  locationName?: string;
  locationColor?: string;
  sortOrder: number;
  isClaimed: boolean;
  claimedByItemId?: string;
  claimedByItemTitle?: string;
}

export interface BulkAvailabilityItem {
  itemId: string;
  itemTitle: string;
  isConfirmed: boolean;
  availableSlotIds: string[];
}

export interface BulkAvailabilityResponse {
  seriesId: string;
  memberId: string;
  memberName: string;
  items: BulkAvailabilityItem[];
  slots: MeetingSeriesSlotDto[];
}

export interface BulkAvailabilityRequest {
  availabilities: { itemId: string; slotId: string }[];
}
```

### 9.6 Visual Consistency

All new components reuse the existing design tokens and class patterns:

| Pattern | Existing Class | Usage |
|---------|---------------|-------|
| Page container | `.page` | Max-width 900px, centered, 8px padding |
| Breadcrumb | `.breadcrumb` | Navigation trail |
| Section card | `.section` | Rounded card with subtle border |
| Section label | `.section-label` | Uppercase, small, muted |
| Primary button | `mat-raised-button color="primary"` | Save action |
| Secondary button | `mat-stroked-button` | Cancel, back actions |
| Status badge | `.item-status.confirmed` | Green confirmed badge |
| Slot info | `.slot-info`, `.slot-date`, `.slot-time` | Slot display in headers |
| Location dot | `.slot-loc-dot` | Colored location indicator |
| Snackbar | `MatSnackBar` | Success/error notifications |
| Spinner | `mat-spinner` | Loading states |
| Error text | `.error` | Red error messages |

---

## 10. New Component Summary

| Component | Selector | File | Purpose |
|-----------|----------|------|---------|
| `BulkAvailabilityComponent` | `app-bulk-availability` | `bulk-availability.component.ts` | Main page: loads matrix, handles save/cancel |
| `AvailabilityMatrixComponent` | `app-availability-matrix` | `availability-matrix.component.ts` | Reusable grid component: renders the 2D matrix |
| `AvailabilityMatrixCellComponent` | `app-availability-matrix-cell` | `availability-matrix-cell.component.ts` | Individual cell: checkbox + claim indicator |
| `SlotClaimBadgeComponent` | `app-slot-claim-badge` | `slot-claim-badge.component.ts` | Reusable lock icon + tooltip for claimed slots |
| `ChangeIndicatorComponent` | `app-change-indicator` | `change-indicator.component.ts` | Unsaved changes counter in the action bar |

---

## 11. State Management

The `BulkAvailabilityComponent` manages the following signals:

| Signal | Type | Purpose |
|--------|------|---------|
| `series` | `MeetingSeries \| null` | Full series data |
| `bulkData` | `BulkAvailabilityResponse \| null` | Matrix data from the bulk availability endpoint |
| `loading` | `boolean` | Initial load spinner |
| `saving` | `boolean` | Save-in-progress flag |
| `error` | `string \| null` | Error message for display |
| `conflicts` | `ConflictInfo[] \| null` | Slot conflicts from a failed save |
| `selections` | `Map<string, Set<string>>` | Current checkbox state: itemId → Set of slotIds |
| `originalSelections` | `Map<string, Set<string>>` | Loaded state for change detection |
| `hasChanges` | `computed<boolean>` | True if selections differ from original |
| `changeCount` | `computed<number>` | Number of changed cells |

**Change detection logic:**
```
changeCount = sum over all items of |selections[itemId] Δ originalSelections[itemId]|
```
Where Δ is the symmetric difference (added + removed).

---

## 12. Open Questions

1. **Should participants see other participants' availability in the matrix?** The architecture doc does not address this. The current design shows only the current user's availability. If cross-participant visibility is desired, the matrix would need a third dimension (or a toggle to switch between "my availability" and "team availability").

2. **Should the "Ready to confirm" badge trigger auto-confirmation?** Currently it is informational only. Auto-confirmation could be confusing if participants don't expect it.

3. **Should unconfirmation trigger immediate re-evaluation of other items?** The architecture doc specifies lazy re-evaluation. The UX should reflect this — after unconfirmation, the released slot shows as free but no other item automatically claims it.

4. **What happens when a series creator deletes a claimed slot?** The architecture doc covers this as an edge case. The UX should show a warning: *"This slot is confirmed for [Item Title]. Deleting it will unconfirm the item."*
