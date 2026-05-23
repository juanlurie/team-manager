# Coffee Run Rethink — QA Test Plan

> **Date:** 2026-05-23
> **QA Engineer:** QA Agent
> **Feature:** Coffee Run Rethink (full rework)
> **Based on:** arch.md, ux.md, review.md
> **Status:** Draft — pending implementation review

---

## 1. Test Environment & Prerequisites

| Requirement | Detail |
|-------------|--------|
| Backend | .NET 8 API with EF Core, SQL Server |
| Frontend | Angular 17+ (signals-based), WebSocket client |
| SignalR | `CoffeeHub` at `/coffeeHub` (verify implementation exists) |
| Test Data | Minimum 10 team members, 5 templates, 20 historical runs |
| Browsers | Chrome (latest), Firefox (latest), Safari (latest), Edge (latest) |
| Mobile | iOS Safari (iPhone 14+), Android Chrome (Pixel 7+) |
| Network | Test under WiFi, 4G, 3G throttling, offline mode |
| Auth | Authenticated user with Member, TeamLead, and TechLead roles |

---

## 2. Test Scenarios

### 2.1 Run Lifecycle

#### TC-001: Create Run (Draft) — Empty
| Field | Value |
|-------|-------|
| **Description** | Create a new coffee run with no optional fields |
| **Steps** | 1. Navigate to `/coffee-runs`<br>2. Click "+ New Run"<br>3. Leave all fields empty<br>4. Click "Create Run" |
| **Expected** | Run created in Draft status; redirected to Run Detail; title defaults to "Coffee Run" or similar; no menu items |
| **Pass Criteria** | HTTP 201 returned; run appears in list with Draft badge; initiator can edit menu |
| **Fail Criteria** | 4xx/5xx error; run not visible; incorrect status |

#### TC-002: Create Run with All Optional Fields
| Field | Value |
|-------|-------|
| **Description** | Create a run with title, description, location, and deadline |
| **Steps** | 1. Click "+ New Run"<br>2. Enter Title: "Monday Morning Run"<br>3. Enter Description: "Weekly cafe order"<br>4. Enter Location: "Blue Bean Cafe"<br>5. Select Deadline: "30 min"<br>6. Click "Create Run" |
| **Expected** | Run created with all fields populated; deadline countdown visible; title, description, location displayed in header |
| **Pass Criteria** | All fields persisted correctly; deadline is ~30 min from creation time; countdown timer starts |
| **Fail Criteria** | Any field missing or incorrect; deadline not set; countdown not working |

#### TC-003: Create Run from Template
| Field | Value |
|-------|-------|
| **Description** | Create a run pre-populated from an existing menu template |
| **Steps** | 1. Ensure a template exists with 5 items<br>2. Click "+ New Run"<br>3. Select template from "Start from template" dropdown<br>4. Click "Create Run" |
| **Expected** | Run created in Draft; menu populated with all 5 template items; item names, prices, categories, sort order preserved |
| **Pass Criteria** | Menu item count matches template; prices match template; categories preserved |
| **Fail Criteria** | Empty menu; wrong items; prices mismatched; categories lost |

#### TC-004: Create Run by Copying Menu from Existing Run
| Field | Value |
|-------|-------|
| **Description** | Create a run by copying the menu from a previous run |
| **Steps** | 1. Ensure an existing run with menu items exists<br>2. Click "+ New Run"<br>3. Select "Copy from existing run" option<br>4. Choose the source run<br>5. Click "Create Run" |
| **Expected** | New Draft run with menu items copied from source run; orders NOT copied |
| **Pass Criteria** | Menu items match source run; no orders in new run; source run unaffected |
| **Fail Criteria** | Orders copied; items missing; source run modified |

#### TC-005: Publish Run (Draft → Open)
| Field | Value |
|-------|-------|
| **Description** | Transition a run from Draft to Open state |
| **Steps** | 1. Create a Draft run with at least 1 menu item<br>2. Click "Publish Run"<br>3. Confirm in dialog |
| **Expected** | Status changes to Open; badge turns green; team members can now see and order; toast notification sent |
| **Pass Criteria** | Status = "Open"; SignalR `RunStatusChanged` event fired; run visible to other team members |
| **Fail Criteria** | Status unchanged; other users cannot see run; no notification |

#### TC-006: Publish Run with No Menu Items
| Field | Value |
|-------|-------|
| **Description** | Attempt to publish a run with an empty menu |
| **Steps** | 1. Create a Draft run with NO menu items<br>2. Click "Publish Run" |
| **Expected** | Either blocked with validation error "Add at least one menu item before publishing" OR allowed (per business rules) |
| **Pass Criteria** | Consistent behavior; clear user feedback |
| **Fail Criteria** | Silent failure; confusing error |

#### TC-007: Close Run (Open → Closed) — Manual
| Field | Value |
|-------|-------|
| **Description** | Manually close an open run |
| **Steps** | 1. Open a run with status Open and at least 1 order<br>2. Click "Close Run"<br>3. Confirm in dialog showing order count and total |
| **Expected** | Status changes to Closed; orders locked; auto-navigate to Summary view; toast: "Run closed. N orders · R[total] total" |
| **Pass Criteria** | Status = "Closed"; orders cannot be edited/deleted; summary view displays correctly; SignalR `RunStatusChanged` fired |
| **Fail Criteria** | Orders still editable; summary incorrect; no notification |

#### TC-008: Close Run with No Orders
| Field | Value |
|-------|-------|
| **Description** | Close a run that has no orders |
| **Steps** | 1. Open a run with status Open and 0 orders<br>2. Click "Close Run"<br>3. Confirm |
| **Expected** | Run closes; summary shows "Nothing to summarize"; no errors |
| **Pass Criteria** | Status = "Closed"; summary handles zero orders gracefully |
| **Fail Criteria** | Error thrown; summary crashes |

#### TC-009: Cancel Run (Any State → Cancelled)
| Field | Value |
|-------|-------|
| **Description** | Cancel a run from any non-Closed state |
| **Steps** | 1. Open a run in Draft or Open state with orders<br>2. Click "Cancel Run" from overflow menu<br>3. Confirm dialog: "All N orders will be removed" |
| **Expected** | Status = "Cancelled"; orders are removed (per review.md W9 — verify implementation); toast: "Run cancelled"; SignalR broadcast |
| **Pass Criteria** | Status = "Cancelled"; orders deleted or soft-deleted per implementation; all users notified |
| **Fail Criteria** | Orders remain visible; no notification; status not updated |

#### TC-010: Cancel Run from Closed State (Should Fail)
| Field | Value |
|-------|-------|
| **Description** | Attempt to cancel an already-closed run |
| **Steps** | 1. Open a run with status Closed<br>2. Attempt to cancel (via API or UI if button visible) |
| **Expected** | Cancel button not visible OR returns 400/409 with "Cannot cancel a closed run" |
| **Pass Criteria** | Operation prevented; clear error message |
| **Fail Criteria** | Run cancelled; silent failure |

#### TC-011: Delete Run (Initiator Only)
| Field | Value |
|-------|-------|
| **Description** | Hard-delete a run as the initiator |
| **Steps** | 1. Open a Draft run you created<br>2. Click Delete from overflow menu<br>3. Confirm |
| **Expected** | Run permanently deleted; returns 204; removed from list |
| **Pass Criteria** | Run no longer accessible via API or UI; 204 response |
| **Fail Criteria** | Run still accessible; error on delete |

#### TC-012: Delete Run (Non-Initiator, Non-TeamLead)
| Field | Value |
|-------|-------|
| **Description** | Attempt to delete a run you did not create |
| **Steps** | 1. As a regular member, try to DELETE a run created by someone else via API |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Delete blocked; proper error code |
| **Fail Criteria** | Run deleted; 204 returned |

#### TC-013: Delete Run (TeamLead Override)
| Field | Value |
|-------|-------|
| **Description** | Team lead deletes a run they did not create |
| **Steps** | 1. As TeamLead, try to DELETE a run created by a member<br>2. Confirm |
| **Expected** | Run deleted (team-lead override allowed) |
| **Pass Criteria** | 204 response; run removed |
| **Fail Criteria** | 403 returned; delete blocked |

#### TC-014: Update Run Metadata (PATCH)
| Field | Value |
|-------|-------|
| **Description** | Update title, description, location, deadline of a run |
| **Steps** | 1. Open a Draft run<br>2. Edit title, description, location fields<br>3. Save |
| **Expected** | Fields updated; changes visible immediately |
| **Pass Criteria** | GET /runs/{id} returns updated values |
| **Fail Criteria** | Fields not persisted; stale data shown |

#### TC-015: Update Run Deadline to Past Date
| Field | Value |
|-------|-------|
| **Description** | Set a run deadline to a time in the past |
| **Steps** | 1. Open a Draft run<br>2. Set deadline to yesterday via API: `PATCH /runs/{id}` with `orderDeadline: "2026-05-22T10:00:00Z"` |
| **Expected** | 400 Bad Request with validation error "Deadline must be in the future" (per review.md S3) |
| **Pass Criteria** | Validation error returned; deadline not changed |
| **Fail Criteria** | Deadline accepted; run auto-closes immediately |

---

### 2.2 Menu Management

#### TC-016: Add Menu Item (Draft)
| Field | Value |
|-------|-------|
| **Description** | Add a menu item to a Draft run |
| **Steps** | 1. Open a Draft run<br>2. Click "+ Add Item"<br>3. Enter Name: "Latte", Price: 45.00, Category: "Coffee"<br>4. Click "Add Item" |
| **Expected** | Item appears in menu under "Coffee" category; POST returns MenuItemDto with all fields |
| **Pass Criteria** | Item visible; name, price, category correct; sort order default 0 |
| **Fail Criteria** | Item not visible; fields missing; error |

#### TC-017: Add Menu Item — Validation (Name Required)
| Field | Value |
|-------|-------|
| **Description** | Attempt to add item with empty name |
| **Steps** | 1. Open Draft run<br>2. Click "+ Add Item"<br>3. Leave Name empty, enter Price: 45.00<br>4. Click "Add Item" |
| **Expected** | 400 Bad Request; inline error "Name is required" |
| **Pass Criteria** | Validation error; item not created |
| **Fail Criteria** | Item created with empty name; no error |

#### TC-018: Add Menu Item — Validation (Name Max Length)
| Field | Value |
|-------|-------|
| **Description** | Add item with name exceeding 150 characters |
| **Steps** | 1. Open Draft run<br>2. Enter Name: 151-character string<br>3. Enter valid price<br>4. Submit |
| **Expected** | 400 Bad Request; "Name must be 150 characters or less" |
| **Pass Criteria** | Validation error; character counter shows "151/150" |
| **Fail Criteria** | Item created; truncated silently |

#### TC-019: Add Menu Item — Validation (Price Required)
| Field | Value |
|-------|-------|
| **Description** | Attempt to add item with no price |
| **Steps** | 1. Open Draft run<br>2. Enter Name: "Latte", leave Price empty<br>3. Submit |
| **Expected** | 400 Bad Request; "Price is required" |
| **Pass Criteria** | Validation error; item not created |
| **Fail Criteria** | Item created with null/zero price |

#### TC-020: Add Menu Item — Validation (Negative Price)
| Field | Value |
|-------|-------|
| **Description** | Add item with negative price |
| **Steps** | 1. Open Draft run<br>2. Enter Name: "Free Coffee", Price: -5.00<br>3. Submit |
| **Expected** | 400 Bad Request; "Price must be non-negative" |
| **Pass Criteria** | Validation error |
| **Fail Criteria** | Item created with negative price |

#### TC-021: Add Menu Item with MaxQuantity
| Field | Value |
|-------|-------|
| **Description** | Add item with stock limit |
| **Steps** | 1. Open Draft run<br>2. Add item: Name: "Muffin", Price: 35.00, MaxQuantity: 3<br>3. Submit |
| **Expected** | Item created with MaxQuantity=3; stock indicator shows "3 available" |
| **Pass Criteria** | MaxQuantity persisted; stock display correct |
| **Fail Criteria** | MaxQuantity not set; stock shows infinity |

#### TC-022: Edit Menu Item (Initiator Only)
| Field | Value |
|-------|-------|
| **Description** | Update an existing menu item |
| **Steps** | 1. Open Draft run as initiator<br>2. Click "Edit" on a menu item<br>3. Change price from 45.00 to 50.00<br>4. Save |
| **Expected** | Price updated; PUT returns updated MenuItemDto |
| **Pass Criteria** | New price visible; old price gone |
| **Fail Criteria** | Price unchanged; error |

#### TC-023: Edit Menu Item (Non-Initiator — Should Fail)
| Field | Value |
|-------|-------|
| **Description** | Non-initiator attempts to edit a menu item |
| **Steps** | 1. As a non-initiator, send PUT to `/runs/{runId}/menu-items/{itemId}` |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Edit blocked |
| **Fail Criteria** | Edit succeeds |

#### TC-024: Delete Menu Item (No Orders)
| Field | Value |
|-------|-------|
| **Description** | Delete a menu item that has no orders |
| **Steps** | 1. Open Draft run<br>2. Click "Delete" on a menu item<br>3. Confirm |
| **Expected** | Item removed; 204 response; item disappears from list |
| **Pass Criteria** | Item gone; no error |
| **Fail Criteria** | Item still visible; error |

#### TC-025: Delete Menu Item (Has Orders — 409 Conflict)
| Field | Value |
|-------|-------|
| **Description** | Attempt to delete a menu item that has existing orders |
| **Steps** | 1. Open an Open or Closed run<br>2. As initiator, try to delete a menu item that has been ordered<br>3. Confirm delete |
| **Expected** | 409 Conflict; toast: "Cannot delete — has orders"; item remains |
| **Pass Criteria** | 409 returned; error message parsed correctly in Angular (per review.md S9); item not deleted |
| **Fail Criteria** | Item deleted; 204 returned; error not displayed |

#### TC-026: Toggle Menu Item Availability
| Field | Value |
|-------|-------|
| **Description** | Toggle IsAvailable on a menu item |
| **Steps** | 1. Open an Open run as initiator<br>2. Click availability toggle on a menu item<br>3. Verify PATCH sent |
| **Expected** | Item grayed out for orderers; "Unavailable" badge shown; SignalR `ItemAvailabilityChanged` fired |
| **Pass Criteria** | Orderers cannot order unavailable item; live update via SignalR |
| **Fail Criteria** | Item still orderable; no live update |

#### TC-027: Reorder Menu Items (Batch)
| Field | Value |
|-------|-------|
| **Description** | Batch reorder menu items via drag-and-drop |
| **Steps** | 1. Open Draft run as initiator<br>2. Drag item A below item B<br>3. Verify PUT `/menu-items/reorder` sent |
| **Expected** | Items reorder smoothly; sort order persisted; 204 response |
| **Pass Criteria** | Order persists on page reload; correct sortOrder values |
| **Fail Criteria** | Order not persisted; N individual PUTs instead of batch |

#### TC-028: Menu Item Category Grouping
| Field | Value |
|-------|-------|
| **Description** | Menu items display grouped by category |
| **Steps** | 1. Create a run with items in "Coffee", "Food", "Cold Drinks" categories<br>2. View the run detail |
| **Expected** | Items grouped under collapsible category headers; category count shown |
| **Pass Criteria** | Correct grouping; expand/collapse works; counts accurate |
| **Fail Criteria** | Flat list; wrong categories; counts wrong |

#### TC-029: Menu Item — Price Change After Order (Snapshot Integrity)
| Field | Value |
|-------|-------|
| **Description** | Verify price snapshot: changing menu price does NOT affect existing orders |
| **Steps** | 1. Create run with item "Latte" at R45.00<br>2. Publish run<br>3. User A orders 2× Latte (total R90.00)<br>4. Initiator changes Latte price to R50.00<br>5. Check User A's order total |
| **Expected** | User A's order still shows R90.00 (2 × R45.00); menu shows R50.00 for new orders |
| **Pass Criteria** | OrderItem.UnitPrice = 45.00; OrderItem.LineTotal = 90.00; Order.TotalAmount = 90.00; current menu price = 50.00 |
| **Fail Criteria** | Order total changes to R100.00; snapshot not working |

---

### 2.3 Order Management

#### TC-030: Place Order (First Order)
| Field | Value |
|-------|-------|
| **Description** | Place a new order as a team member |
| **Steps** | 1. Open an Open run<br>2. Use quantity steppers to select: 2× Latte, 1× Muffin<br>3. Add notes: "oat milk for latte"<br>4. Click "Place Order" |
| **Expected** | Order created; optimistic UI shows order immediately; toast: "Order placed! R[total]"; POST returns OrderDto with snapshot prices |
| **Pass Criteria** | HTTP 201; OrderDto.TotalAmount correct; UnitPrice snapshots correct; notes saved; SignalR `OrderPlaced` fired |
| **Fail Criteria** | Order not created; wrong total; no toast; no SignalR event |

#### TC-031: Place Order — One Per Member Per Run
| Field | Value |
|-------|-------|
| **Description** | Attempt to place a second order in the same run |
| **Steps** | 1. User A already has an order in run X<br>2. User A tries to POST another order to run X |
| **Expected** | 409 Conflict or 400 Bad Request; "You already have an order in this run" |
| **Pass Criteria** | Second order rejected; UNIQUE constraint enforced |
| **Fail Criteria** | Two orders created for same user in same run |

#### TC-032: Update Own Order
| Field | Value |
|-------|-------|
| **Description** | Update an existing order |
| **Steps** | 1. User A has an order in an Open run<br>2. Change quantities: remove Muffin, add Espresso<br>3. Click "Update Order" |
| **Expected** | Order updated; PUT returns updated OrderDto; total recalculated; toast: "Order updated!" |
| **Pass Criteria** | New items correct; new total correct; old items removed |
| **Fail Criteria** | Old items persist; total wrong |

#### TC-033: Update Someone Else's Order (Should Fail)
| Field | Value |
|-------|-------|
| **Description** | Attempt to update another user's order |
| **Steps** | 1. As User B, send PUT to `/runs/{runId}/orders/{userAOrderId}` |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Update blocked |
| **Fail Criteria** | Update succeeds |

#### TC-034: Delete Own Order
| Field | Value |
|-------|-------|
| **Description** | Delete your own order from an Open run |
| **Steps** | 1. User A has an order in an Open run<br>2. Click "Delete Order" from overflow menu<br>3. Confirm |
| **Expected** | Order deleted; 204 response; steppers reset to 0; toast: "Order removed"; SignalR `OrderDeleted` fired |
| **Pass Criteria** | Order gone; stock restored; live update for others |
| **Fail Criteria** | Order persists; stock not restored |

#### TC-035: Delete Order from Closed Run (Should Fail)
| Field | Value |
|-------|-------|
| **Description** | Attempt to delete an order after run is closed |
| **Steps** | 1. Close a run that has orders<br>2. Try to delete an order via API |
| **Expected** | 400/409; "Cannot modify orders in a closed run" |
| **Pass Criteria** | Delete blocked |
| **Fail Criteria** | Order deleted |

#### TC-036: Order with Unavailable Item
| Field | Value |
|-------|-------|
| **Description** | Place an order that includes an item marked unavailable |
| **Steps** | 1. Initiator marks "Latte" as unavailable<br>2. User A tries to order 2× Latte |
| **Expected** | Item silently skipped (per review.md W1) OR validation error returned; user informed |
| **Pass Criteria** | Unavailable item not included in order; user receives feedback (ideally) |
| **Fail Criteria** | Unavailable item included; no feedback |

#### TC-037: Order Exceeding Stock Limit
| Field | Value |
|-------|-------|
| **Description** | Order more of an item than MaxQuantity allows |
| **Steps** | 1. Menu item "Muffin" has MaxQuantity=3<br>2. User A orders 2× Muffin<br>3. User B tries to order 2× Muffin |
| **Expected** | User B's order adjusted to 1× Muffin (only 1 remaining) OR rejected with "Only 1 Muffin remaining" |
| **Pass Criteria** | Stock not exceeded; user informed of adjustment |
| **Fail Criteria** | Total ordered exceeds MaxQuantity |

#### TC-038: Concurrent Orders — Stock Race Condition
| Field | Value |
|-------|-------|
| **Description** | Two users simultaneously order the last stock item |
| **Steps** | 1. "Muffin" has MaxQuantity=1<br>2. User A and User B simultaneously POST orders for 1× Muffin each |
| **Expected** | Only one succeeds; the other gets stock error (transaction wrapping per review.md C5 fix) |
| **Pass Criteria** | Total Muffin ordered = 1; one 201, one 409/400 |
| **Fail Criteria** | Both succeed; total ordered = 2 (oversold) |

#### TC-039: Update Order — Stock Race Condition
| Field | Value |
|-------|-------|
| **Description** | User editing order races with another user placing new order for same limited item |
| **Steps** | 1. "Muffin" has MaxQuantity=2<br>2. User A has 1× Muffin in their order<br>3. User B simultaneously: (a) User A updates to 2× Muffin, (b) User B places order for 1× Muffin |
| **Expected** | One succeeds, one fails or adjusts (per review.md N1 — UpdateOrderAsync should be transaction-wrapped) |
| **Pass Criteria** | Total Muffin ordered ≤ 2 |
| **Fail Criteria** | Total ordered = 3 (oversold) |

#### TC-040: Order Notes — Max Length
| Field | Value |
|-------|-------|
| **Description** | Submit order with notes exceeding 500 characters |
| **Steps** | 1. Place order with 501-character notes string |
| **Expected** | 400 Bad Request; "Notes must be 500 characters or less" |
| **Pass Criteria** | Validation error; character counter shows "501/500" |
| **Fail Criteria** | Notes accepted; truncated silently |

#### TC-041: Order with Empty Items List
| Field | Value |
|-------|-------|
| **Description** | Place order with no items |
| **Steps** | 1. Open an Open run<br>2. Don't select any items<br>3. Click "Place Order" (should be disabled) |
| **Expected** | "Place Order" button disabled when no items selected |
| **Pass Criteria** | Button disabled; cannot submit empty order |
| **Fail Criteria** | Empty order created |

#### TC-042: Order Quantity Range (1-99)
| Field | Value |
|-------|-------|
| **Description** | Verify quantity stepper respects min=0, max=99 |
| **Steps** | 1. Open an Open run<br>2. Tap "+" repeatedly on an item<br>3. Verify max is 99 (or MaxQuantity if lower) |
| **Expected** | Quantity cannot exceed 99 or MaxQuantity (whichever is lower); cannot go below 0 |
| **Pass Criteria** | Stepper stops at correct boundaries |
| **Fail Criteria** | Quantity exceeds limits; negative quantity |

#### TC-043: Update Order Status (Initiator — Placed → Confirmed)
| Field | Value |
|-------|-------|
| **Description** | Initiator marks an order as confirmed |
| **Steps** | 1. Open an Open or Closed run as initiator<br>2. Find User A's order<br>3. Change status to "Confirmed" via PATCH |
| **Expected** | Status updates to Confirmed; blue dot shown; toast to User A |
| **Pass Criteria** | Status = "Confirmed"; SignalR event fired; orderer notified |
| **Fail Criteria** | Status unchanged; no notification |

#### TC-044: Update Order Status (Initiator — Confirmed → PickedUp)
| Field | Value |
|-------|-------|
| **Description** | Initiator marks an order as picked up |
| **Steps** | 1. Find a Confirmed order<br>2. Change status to "PickedUp" |
| **Expected** | Status = "PickedUp"; green checkmark; completion animation; toast to orderer |
| **Pass Criteria** | Status updated; visual feedback correct |
| **Fail Criteria** | Status not updated |

#### TC-045: Update Order Status (Non-Initiator — Should Fail)
| Field | Value |
|-------|-------|
| **Description** | Non-initiator attempts to change order status |
| **Steps** | 1. As a regular member, PATCH `/orders/{orderId}/status` with `status: "Confirmed"` |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Status change blocked |
| **Fail Criteria** | Status changed |

#### TC-046: Update Order Status — Invalid Status Value
| Field | Value |
|-------|-------|
| **Description** | Send an invalid status string |
| **Steps** | 1. As initiator, PATCH `/orders/{orderId}/status` with `status: "Delivered"` |
| **Expected** | 400 Bad Request (per review.md W5 fix) |
| **Pass Criteria** | Invalid status rejected with clear error |
| **Fail Criteria** | Request silently ignored; no feedback |

---

### 2.4 Run Summary

#### TC-047: Summary — Grand Total
| Field | Value |
|-------|-------|
| **Description** | Verify grand total calculation in summary view |
| **Steps** | 1. Close a run with multiple orders<br>2. View Summary tab |
| **Expected** | Grand total = sum of all order TotalAmounts; displayed prominently |
| **Pass Criteria** | Total matches sum of all orders; correct to 2 decimal places |
| **Fail Criteria** | Total incorrect; rounding errors |

#### TC-048: Summary — Per-Person Breakdown
| Field | Value |
|-------|-------|
| **Description** | Verify per-person breakdown in summary |
| **Steps** | 1. Close a run with 3+ orders from different people<br>2. View Summary tab |
| **Expected** | Each person listed with: name, items ordered, amount owed |
| **Pass Criteria** | All orderers listed; amounts match their order totals; item descriptions correct |
| **Fail Criteria** | Missing people; wrong amounts; wrong items |

#### TC-049: Summary — Per-Item Totals
| Field | Value |
|-------|-------|
| **Description** | Verify per-item totals in summary |
| **Steps** | 1. Close a run with multiple orders containing overlapping items<br>2. View Summary tab |
| **Expected** | Each menu item listed with: name, category, total quantity ordered, total amount |
| **Pass Criteria** | Quantities sum correctly across all orders; amounts = quantity × UnitPrice |
| **Fail Criteria** | Wrong quantities; wrong amounts; missing items |

#### TC-050: Summary — Copy Totals to Clipboard
| Field | Value |
|-------|-------|
| **Description** | Copy order summary to clipboard |
| **Steps** | 1. View Summary of a closed run<br>2. Click "Copy Totals" |
| **Expected** | Clipboard contains formatted text summary; toast: "Order summary copied to clipboard" |
| **Pass Criteria** | Clipboard content is readable and includes all orders and totals |
| **Fail Criteria** | Clipboard empty; malformed content; no toast |

#### TC-051: Summary — Accessible Only to Initiator
| Field | Value |
|-------|-------|
| **Description** | Non-initiator cannot access summary endpoint |
| **Steps** | 1. As a non-initiator, GET `/runs/{id}/summary` |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Summary endpoint blocked for non-initiators |
| **Fail Criteria** | Summary data returned |

#### TC-052: Summary — Mark All Picked Up
| Field | Value |
|-------|-------|
| **Description** | Bulk mark all orders as picked up |
| **Steps** | 1. View Summary of a closed run with orders in Placed/Confirmed status<br>2. Click "Mark All Picked Up" |
| **Expected** | All orders transition to PickedUp; toast notifications sent to all orderers |
| **Pass Criteria** | All orders show "PickedUp" status |
| **Fail Criteria** | Some orders not updated; no notifications |

---

### 2.5 Menu Templates

#### TC-053: Create Template (Personal)
| Field | Value |
|-------|-------|
| **Description** | Create a personal menu template |
| **Steps** | 1. Navigate to Manage Menus<br>2. Click "+ New Template"<br>3. Enter Name: "Office Cafe", Scope: Personal<br>4. Add 3 items<br>5. Save |
| **Expected** | Template created with Personal scope; 3 items; 201 response |
| **Pass Criteria** | Template visible in Personal filter; items correct |
| **Fail Criteria** | Template not created; scope wrong |

#### TC-054: Create Template (Team) — Team Lead
| Field | Value |
|-------|-------|
| **Description** | Team lead creates a team-scoped template |
| **Steps** | 1. As TeamLead, create template with Scope: Team<br>2. Add items, save |
| **Expected** | Template created with Team scope; visible to all team members |
| **Pass Criteria** | Scope = "Team"; all members can see and use template |
| **Fail Criteria** | Scope = "Personal"; not visible to others |

#### TC-055: Create Template (Team) — Regular Member (Should Fail)
| Field | Value |
|-------|-------|
| **Description** | Regular member attempts to create a Team-scoped template |
| **Steps** | 1. As a regular member, POST template with Scope: "Team" |
| **Expected** | 403 Forbidden or scope downgraded to Personal |
| **Pass Criteria** | Team scope not allowed for non-leads |
| **Fail Criteria** | Team template created by non-lead |

#### TC-056: Create Template from Run (Save as Template)
| Field | Value |
|-------|-------|
| **Description** | Save a run's menu as a template |
| **Steps** | 1. Open a run with menu items<br>2. Click "Save as Template"<br>3. Enter name, select scope<br>4. Save |
| **Expected** | Template created with all menu items from run; copyFromRunId included (per review.md C1 fix) |
| **Pass Criteria** | Template has same items as run; names, prices, categories, sort order preserved |
| **Fail Criteria** | Empty template created (C1 regression); items missing |

#### TC-057: Edit Template (Owner)
| Field | Value |
|-------|-------|
| **Description** | Template owner edits template |
| **Steps** | 1. Open template editor as owner<br>2. Change template name, add/remove items<br>3. Save |
| **Expected** | Changes saved; auto-save indicator shows "Saved ✓" |
| **Pass Criteria** | All changes persisted; UpdatedAt timestamp updated |
| **Fail Criteria** | Changes lost; no save indicator |

#### TC-058: Edit Template (Non-Owner — Should Fail)
| Field | Value |
|-------|-------|
| **Description** | Non-owner attempts to edit a personal template |
| **Steps** | 1. As a non-owner, PUT `/menu-templates/{id}` |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Edit blocked |
| **Fail Criteria** | Edit succeeds |

#### TC-059: Edit Template (Team Lead Override)
| Field | Value |
|-------|-------|
| **Description** | Team lead edits another member's template |
| **Steps** | 1. As TeamLead, PUT `/menu-templates/{id}` for another member's template |
| **Expected** | Edit succeeds (team-lead override) |
| **Pass Criteria** | Changes saved |
| **Fail Criteria** | 403 returned |

#### TC-060: Archive Template (Soft Delete)
| Field | Value |
|-------|-------|
| **Description** | Archive a template (soft delete) |
| **Steps** | 1. Open template list<br>2. Click "Archive" on a template<br>3. Confirm |
| **Expected** | Template moves to Archived tab; IsArchived=true; undo toast shown (5 sec) |
| **Pass Criteria** | Template hidden from active list; visible in Archived; undo works within 5 sec |
| **Fail Criteria** | Template hard-deleted; no undo; not in Archived tab |

#### TC-061: Restore Archived Template
| Field | Value |
|-------|-------|
| **Description** | Restore an archived template |
| **Steps** | 1. Navigate to Archived tab<br>2. Click "Restore" on an archived template |
| **Expected** | Template moves back to active list; IsArchived=false |
| **Pass Criteria** | Template visible in active list; no longer in Archived |
| **Fail Criteria** | Template still archived |

#### TC-062: Delete Template (Permanent)
| Field | Value |
|-------|-------|
| **Description** | Permanently delete a template |
| **Steps** | 1. As owner or team lead, delete a template<br>2. Confirm |
| **Expected** | Template permanently deleted; 204 response |
| **Pass Criteria** | Template no longer accessible via API or UI |
| **Fail Criteria** | Template still accessible |

#### TC-063: Import Template from JSON
| Field | Value |
|-------|-------|
| **Description** | Import a menu template from a JSON file |
| **Steps** | 1. Navigate to Manage Menus<br>2. Click "Import JSON"<br>3. Select a valid JSON file with menu items<br>4. Preview and confirm |
| **Expected** | Template created with imported items; toast: "Imported N items" |
| **Pass Criteria** | All items imported correctly; names, prices, categories preserved |
| **Fail Criteria** | Import fails; items missing; wrong data |

#### TC-064: Import Template — Invalid JSON
| Field | Value |
|-------|-------|
| **Description** | Import a malformed JSON file |
| **Steps** | 1. Click "Import JSON"<br>2. Select a file with invalid JSON structure |
| **Expected** | Error: "This file doesn't look like a valid menu template"; no template created |
| **Pass Criteria** | Clear error message; expected format example shown |
| **Fail Criteria** | Partial import; crash; no error |

#### TC-065: Template List — Pagination
| Field | Value |
|-------|-------|
| **Description** | Verify template list pagination |
| **Steps** | 1. Create 25+ templates<br>2. Navigate to Manage Menus<br>3. Verify pagination controls |
| **Expected** | Templates paginated (default pageSize=20); page navigation works; "Showing X-Y of N" correct |
| **Pass Criteria** | All templates accessible via pagination; counts correct |
| **Fail Criteria** | Templates missing; pagination broken; counts wrong |

#### TC-066: Template List — Scope Filter
| Field | Value |
|-------|-------|
| **Description** | Filter templates by scope |
| **Steps** | 1. Have templates with Personal, Team, and Archived scopes<br>2. Click each filter tab |
| **Expected** | Only matching templates shown in each tab |
| **Pass Criteria** | Filters work correctly; counts per tab accurate |
| **Fail Criteria** | Wrong templates shown; filters don't work |

#### TC-067: Reorder Template Items (Batch)
| Field | Value |
|-------|-------|
| **Description** | Batch reorder template items |
| **Steps** | 1. Open template editor<br>2. Drag items to reorder<br>3. Verify PUT `/menu-templates/{id}/items/reorder` sent |
| **Expected** | Items reorder; sort order persisted; 204 response |
| **Pass Criteria** | Order persists on reload |
| **Fail Criteria** | Order not persisted |

#### TC-068: Use Template to Start Run
| Field | Value |
|-------|-------|
| **Description** | Start a new run from a template |
| **Steps** | 1. Navigate to Manage Menus<br>2. Click "Use" on a template<br>3. Verify Start Run dialog opens with template pre-selected |
| **Expected** | Start Run dialog opens; template pre-selected; menu items shown |
| **Pass Criteria** | Template correctly passed to run creation; items pre-populated |
| **Fail Criteria** | Dialog opens without template; items not pre-populated |

---

### 2.6 Run List & Filtering

#### TC-069: Run List — Pagination
| Field | Value |
|-------|-------|
| **Description** | Verify run list pagination |
| **Steps** | 1. Create 50+ runs<br>2. Navigate to `/coffee-runs`<br>3. Verify pagination |
| **Expected** | Runs paginated; page navigation works; "Showing X-Y of N" correct |
| **Pass Criteria** | All runs accessible; pagination controls functional |
| **Fail Criteria** | Runs missing; pagination broken |

#### TC-070: Run List — Status Filter
| Field | Value |
|-------|-------|
| **Description** | Filter runs by status |
| **Steps** | 1. Have runs in Draft, Open, Closed, Cancelled states<br>2. Click each status filter tab |
| **Expected** | Only matching runs shown |
| **Pass Criteria** | Filters work correctly |
| **Fail Criteria** | Wrong runs shown |

#### TC-071: Run List — "Mine" Filter
| Field | Value |
|-------|-------|
| **Description** | Filter to show only runs I created |
| **Steps** | 1. Click "Mine" filter tab |
| **Expected** | Only runs where InitiatorId = current user shown |
| **Pass Criteria** | Correct runs shown; count accurate |
| **Fail Criteria** | Other users' runs shown |

#### TC-072: Run List — Search
| Field | Value |
|-------|-------|
| **Description** | Search runs by title, initiator, or location |
| **Steps** | 1. Enter search term matching a run's title<br>2. Enter search term matching an initiator's name<br>3. Enter search term matching a location |
| **Expected** | Matching runs shown; non-matching runs hidden |
| **Pass Criteria** | Search works across all three fields; case-insensitive |
| **Fail Criteria** | Search doesn't work; partial matches missed |

#### TC-073: Run List — Date Range Filter
| Field | Value |
|-------|-------|
| **Description** | Filter runs by date range |
| **Steps** | 1. Set from/to dates in filter<br>2. Apply |
| **Expected** | Only runs created within date range shown |
| **Pass Criteria** | Correct runs shown; boundary dates included |
| **Fail Criteria** | Wrong runs shown; boundary dates excluded |

#### TC-074: Run List — Open Runs at Top
| Field | Value |
|-------|-------|
| **Description** | Open runs should appear at top of list |
| **Steps** | 1. Have runs in various states<br>2. View list without filters |
| **Expected** | Open runs appear first, then Draft, then Closed, then Cancelled |
| **Pass Criteria** | Correct ordering by status priority |
| **Fail Criteria** | Wrong ordering |

---

### 2.7 Real-Time (SignalR)

#### TC-075: SignalR — Join Run Group
| Field | Value |
|-------|-------|
| **Description** | Client joins run-specific SignalR group |
| **Steps** | 1. Open a run detail page<br>2. Verify SignalR connection |
| **Expected** | `JoinRun(runId)` called; connection indicator shows green |
| **Pass Criteria** | Connection established; group joined |
| **Fail Criteria** | Connection failed; indicator red |

#### TC-076: SignalR — RunCreated Event
| Field | Value |
|-------|-------|
| **Description** | Other users receive notification when run is created |
| **Steps** | 1. User A opens run list<br>2. User B creates a new run<br>3. Verify User A sees toast |
| **Expected** | Toast: "Alex started a coffee run"; run appears in list |
| **Pass Criteria** | Event received within 2 seconds; toast displayed |
| **Fail Criteria** | No toast; run not appearing until refresh |

#### TC-077: SignalR — OrderPlaced Event
| Field | Value |
|-------|-------|
| **Description** | Initiator receives notification when order is placed |
| **Steps** | 1. Initiator has run detail open<br>2. User A places an order<br>3. Verify initiator sees toast and order count updates |
| **Expected** | Toast: "Sarah placed an order — R85.00"; order count badge increments; order appears in Orders tab |
| **Pass Criteria** | Event received; toast shown; UI updated |
| **Fail Criteria** | No notification; manual refresh required |

#### TC-078: SignalR — OrderUpdated Event
| Field | Value |
|-------|-------|
| **Description** | Initiator sees live update when order is edited |
| **Steps** | 1. Initiator viewing Orders tab<br>2. User A updates their order<br>3. Verify order card updates in place |
| **Expected** | Order card updates without page refresh; stock indicators update |
| **Pass Criteria** | In-place update; no full page reload |
| **Fail Criteria** | Order not updated until refresh |

#### TC-079: SignalR — OrderDeleted Event
| Field | Value |
|-------|-------|
| **Description** | Initiator sees live update when order is deleted |
| **Steps** | 1. Initiator viewing Orders tab<br>2. User A deletes their order<br>3. Verify order card slides out |
| **Expected** | Order card removed with animation; count decrements; stock restored |
| **Pass Criteria** | Live removal; count updated |
| **Fail Criteria** | Order still visible until refresh |

#### TC-080: SignalR — MenuUpdated Event
| Field | Value |
|-------|-------|
| **Description** | Orderers see menu update when initiator adds/edits items |
| **Steps** | 1. User A viewing an Open run's menu<br>2. Initiator adds a new menu item<br>3. Verify User A sees new item |
| **Expected** | New item appears in menu with smooth transition |
| **Pass Criteria** | Menu updates live |
| **Fail Criteria** | Menu not updated until refresh |

#### TC-081: SignalR — ItemAvailabilityChanged Event
| Field | Value |
|-------|-------|
| **Description** | Orderers see item availability change live |
| **Steps** | 1. User A viewing an Open run's menu<br>2. Initiator toggles an item as unavailable<br>3. Verify item grays out for User A |
| **Expected** | Item grayed out; "Unavailable" badge shown; if User A has item in order, warning toast |
| **Pass Criteria** | Live update; warning if item in active order |
| **Fail Criteria** | No update; item still orderable |

#### TC-082: SignalR — RunStatusChanged Event
| Field | Value |
|-------|-------|
| **Description** | All users see run status change live |
| **Steps** | 1. Multiple users viewing a run<br>2. Initiator closes the run<br>3. Verify all users see status change |
| **Expected** | Badge updates; if Closed, navigate to Summary; toast: "Run closed" |
| **Pass Criteria** | All clients update within 2 seconds |
| **Fail Criteria** | Some clients don't update |

#### TC-083: SignalR — Leave Run Group
| Field | Value |
|-------|-------|
| **Description** | Client leaves run group when navigating away |
| **Steps** | 1. Open a run detail page<br>2. Navigate away to run list<br>3. Verify `LeaveRun(runId)` called |
| **Expected** | Client unsubscribed from run events |
| **Pass Criteria** | No more events received for that run |
| **Fail Criteria** | Events still received after navigation |

#### TC-084: SignalR — Connection Loss & Reconnect
| Field | Value |
|-------|-------|
| **Description** | Handle SignalR disconnection and reconnection |
| **Steps** | 1. Open a run detail page<br>2. Disconnect network<br>3. Verify connection indicator turns red<br>4. Reconnect network<br>5. Verify auto-reconnect |
| **Expected** | Banner: "Connection lost. Showing last known data."; auto-reconnect with backoff; manual refresh button after 3 failures |
| **Pass Criteria** | Reconnect succeeds; data refreshed |
| **Fail Criteria** | No reconnect indicator; stuck in disconnected state |

#### TC-085: SignalR — WebSocket Authentication
| Field | Value |
|-------|-------|
| **Description** | Verify WebSocket connection passes auth token |
| **Steps** | 1. Open app with valid auth<br>2. Inspect WebSocket connection |
| **Expected** | Auth token passed in connection handshake (per review.md S5) |
| **Pass Criteria** | WebSocket authenticated; unauthorized connections rejected |
| **Fail Criteria** | No auth token; unauthenticated connection succeeds |

---

### 2.8 Deadline & Auto-Close

#### TC-086: Deadline Countdown Display
| Field | Value |
|-------|-------|
| **Description** | Verify countdown timer displays correctly |
| **Steps** | 1. Open a run with deadline set<br>2. Verify countdown shows "Closes in HH:MM:SS" |
| **Expected** | Timer counts down in real-time; updates every second |
| **Pass Criteria** | Countdown accurate; updates smoothly |
| **Fail Criteria** | Timer frozen; wrong time |

#### TC-087: Deadline Countdown — Last 60 Seconds
| Field | Value |
|-------|-------|
| **Description** | Verify countdown pulses in last 60 seconds |
| **Steps** | 1. Open a run with deadline ~1 minute away<br>2. Observe countdown |
| **Expected** | Countdown pulses (per animation spec); urgency conveyed |
| **Pass Criteria** | Pulse animation active; aria-live announcement |
| **Fail Criteria** | No pulse; no urgency indication |

#### TC-088: Auto-Close on Deadline
| Field | Value |
|-------|-------|
| **Description** | Run auto-closes when deadline is reached |
| **Steps** | 1. Create a run with deadline 2 minutes in the future<br>2. Wait for deadline<br>3. Verify run closes |
| **Expected** | Run transitions to Closed; RunDeadlineWorker triggers; notifications sent |
| **Pass Criteria** | Status = "Closed"; orders locked; toast to all users |
| **Fail Criteria** | Run stays Open; no notification |

#### TC-089: Deadline Worker — Horizontal Scaling
| Field | Value |
|-------|-------|
| **Description** | Verify deadline worker handles multiple app instances |
| **Steps** | 1. Deploy 2+ app instances<br>2. Create run with near-future deadline<br>3. Verify only one instance closes the run |
| **Expected** | Run closed exactly once; no duplicate closes (per review.md W4) |
| **Pass Criteria** | Single close event; no errors |
| **Fail Criteria** | Run closed multiple times; errors |

#### TC-090: Place Order After Deadline
| Field | Value |
|-------|-------|
| **Description** | Attempt to place order after deadline passed |
| **Steps** | 1. Wait for run deadline to pass<br>2. Try to place an order |
| **Expected** | "The ordering deadline has passed. This run is now closed."; order not created |
| **Pass Criteria** | Order rejected; closed view shown |
| **Fail Criteria** | Order accepted |

---

### 2.9 Legacy API Compatibility

#### TC-091: Legacy Template Endpoint — Returns Array
| Field | Value |
|-------|-------|
| **Description** | Verify legacy `/api/v1/coffee-run-menu-templates` returns array, not PagedResult |
| **Steps** | 1. GET `/api/v1/coffee-run-menu-templates` |
| **Expected** | Response is `[...]` (array), not `{ items: [...], totalCount: N, ... }` |
| **Pass Criteria** | JSON shape matches old API (per review.md C2 fix) |
| **Fail Criteria** | PagedResult shape returned; breaking change |

#### TC-092: Legacy Template Endpoint — Pagination Truncation
| Field | Value |
|-------|-------|
| **Description** | Verify legacy endpoint truncation behavior (pre-existing W2/N3) |
| **Steps** | 1. Create 25+ templates<br>2. GET legacy endpoint |
| **Expected** | Returns first 20 templates (known limitation); documented |
| **Pass Criteria** | Behavior consistent; new endpoint returns all via pagination |
| **Fail Criteria** | Returns all (inconsistent with design); returns none |

---

### 2.10 Permissions & Authorization

#### TC-093: Menu Item Management — Initiator Only
| Field | Value |
|-------|-------|
| **Description** | Only initiator can add/edit/delete menu items |
| **Steps** | 1. As non-initiator, try POST/PUT/DELETE on menu items |
| **Expected** | All return 403 Forbidden |
| **Pass Criteria** | All mutations blocked |
| **Fail Criteria** | Any mutation succeeds |

#### TC-094: Order Management — Own Orders Only
| Field | Value |
|-------|-------|
| **Description** | Users can only update/delete their own orders |
| **Steps** | 1. As User B, try PUT/DELETE on User A's order |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Cross-user order mutations blocked |
| **Fail Criteria** | Order modified |

#### TC-095: Template Deletion — Owner or Team Lead Only
| Field | Value |
|-------|-------|
| **Description** | Only owner or team lead can delete templates |
| **Steps** | 1. As regular member, try DELETE on another member's template |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Delete blocked |
| **Fail Criteria** | Template deleted |

#### TC-096: Summary Endpoint — Initiator Only
| Field | Value |
|-------|-------|
| **Description** | Only initiator can access run summary |
| **Steps** | 1. As non-initiator, GET `/runs/{id}/summary` |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Summary blocked |
| **Fail Criteria** | Summary data returned |

#### TC-097: Run Deletion — Initiator or Team Lead Only
| Field | Value |
|-------|-------|
| **Description** | Only initiator or team lead can delete runs |
| **Steps** | 1. As regular member, DELETE a run they didn't create |
| **Expected** | 403 Forbidden |
| **Pass Criteria** | Delete blocked |
| **Fail Criteria** | Run deleted |

---

### 2.11 Data Integrity & Edge Cases

#### TC-098: Price Snapshot — Decimal Precision
| Field | Value |
|-------|-------|
| **Description** | Verify price snapshot preserves 2 decimal places |
| **Steps** | 1. Create item with price R45.99<br>2. Place order for 3× item<br>3. Verify LineTotal = R137.97 |
| **Expected** | UnitPrice = 45.99; LineTotal = 137.97; TotalAmount = 137.97 |
| **Pass Criteria** | No floating-point rounding errors |
| **Fail Criteria** | LineTotal = 137.97000000000003 or similar |

#### TC-099: Multiple Items in Single Order
| Field | Value |
|-------|-------|
| **Description** | Place order with many different items |
| **Steps** | 1. Create run with 10 menu items<br>2. Order 1 of each<br>3. Verify total |
| **Expected** | Total = sum of all item prices; all OrderItems created |
| **Pass Criteria** | 10 OrderItems; correct total |
| **Fail Criteria** | Missing items; wrong total |

#### TC-100: Empty Run Creation
| Field | Value |
|-------|-------|
| **Description** | Create run with absolutely no data |
| **Steps** | 1. POST `/coffee-runs` with empty body `{}` |
| **Expected** | Run created with defaults; status = Draft |
| **Pass Criteria** | 201 response; run accessible |
| **Fail Criteria** | 500 error; run not created |

#### TC-101: Special Characters in Names
| Field | Value |
|-------|-------|
| **Description** | Use special characters in menu item names, notes, etc. |
| **Steps** | 1. Add item with name: "Café Latte — Oat Milk (V)"<br>2. Add order notes: "Extra hot, no foam, 2 pumps vanilla 🌿" |
| **Expected** | All characters stored and displayed correctly |
| **Pass Criteria** | No encoding issues; special chars preserved |
| **Fail Criteria** | Characters garbled; XSS vulnerabilities |

#### TC-102: XSS Prevention
| Field | Value |
|-------|-------|
| **Description** | Attempt XSS injection in user-facing fields |
| **Steps** | 1. Add menu item with name: `<script>alert('xss')</script>`<br>2. Add order notes: `<img src=x onerror=alert(1)>`<br>3. View in browser |
| **Expected** | Scripts not executed; HTML escaped |
| **Pass Criteria** | No alert popups; raw HTML displayed as text |
| **Fail Criteria** | Script executes; XSS vulnerability |

#### TC-103: Concurrent Run Creation
| Field | Value |
|-------|-------|
| **Description** | Multiple users create runs simultaneously |
| **Steps** | 1. 5 users simultaneously POST to create runs |
| **Expected** | All 5 runs created; no conflicts |
| **Pass Criteria** | 5 × 201 responses; all runs visible |
| **Fail Criteria** | Some creations fail; duplicate IDs |

#### TC-104: Large Menu (100+ Items)
| Field | Value |
|-------|-------|
| **Description** | Run with 100+ menu items |
| **Steps** | 1. Create run with 100 menu items via API<br>2. View run detail |
| **Expected** | All items displayed; pagination or virtual scrolling if needed; load time < 3s |
| **Pass Criteria** | All items visible; performance acceptable |
| **Fail Criteria** | Items missing; page crashes; slow load |

#### TC-105: Large Order (99 Items × 99 Quantity)
| Field | Value |
|-------|-------|
| **Description** | Maximum possible order size |
| **Steps** | 1. Create run with 99 menu items<br>2. Order 99 of each |
| **Expected** | Order created; total calculated correctly; no overflow |
| **Pass Criteria** | TotalAmount = sum of (99 × price) for all items; no decimal overflow |
| **Fail Criteria** | Order rejected; overflow error; wrong total |

#### TC-106: Run with No Menu Items — Order Attempt
| Field | Value |
|-------|-------|
| **Description** | Try to order from a run with no menu items |
| **Steps** | 1. Publish a run with no menu items<br>2. Try to place an order |
| **Expected** | "Place Order" button disabled; empty menu shown |
| **Pass Criteria** | Cannot place empty order |
| **Fail Criteria** | Empty order created |

#### TC-107: GUID Format Validation
| Field | Value |
|-------|-------|
| **Description** | Send invalid GUIDs in API requests |
| **Steps** | 1. GET `/coffee-runs/not-a-guid`<br>2. POST order with `menuItemId: "invalid"` |
| **Expected** | 400 Bad Request for invalid GUIDs |
| **Pass Criteria** | Proper validation; no 500 errors |
| **Fail Criteria** | 500 Internal Server Error |

#### TC-108: Timezone Handling
| Field | Value |
|-------|-------|
| **Description** | Verify deadline and timestamps handle timezones correctly |
| **Steps** | 1. Create run with deadline from a user in timezone A<br>2. View from user in timezone B<br>3. Verify deadline displayed in local time |
| **Expected** | All timestamps displayed in user's local timezone; stored as UTC |
| **Pass Criteria** | Deadline shows correct local time for each user |
| **Fail Criteria** | Wrong time shown; timezone not considered |

#### TC-109: Cancel Run — Orders Cleanup
| Field | Value |
|-------|-------|
| **Description** | Verify orders are cleaned up when run is cancelled (per review.md W9) |
| **Steps** | 1. Create run with 3 orders<br>2. Cancel the run<br>3. Check order records |
| **Expected** | Orders deleted or soft-deleted; not visible in detail view |
| **Pass Criteria** | Orders not accessible; cleanup matches implementation spec |
| **Fail Criteria** | Orders still visible and accessible |

#### TC-110: Stock Remaining — Computed Correctly
| Field | Value |
|-------|-------|
| **Description** | Verify RemainingQuantity = MaxQuantity - sum(orders) |
| **Steps** | 1. Item "Muffin" has MaxQuantity=10<br>2. User A orders 3, User B orders 2<br>3. Check remaining |
| **Expected** | RemainingQuantity = 5 |
| **Pass Criteria** | Computed correctly; updates live with orders |
| **Fail Criteria** | Wrong remaining count |

---

## 3. Acceptance Criteria Summary

| Feature | Acceptance Criteria |
|---------|-------------------|
| **Run Lifecycle** | Runs can be created (Draft), published (Open), closed (Closed), and cancelled (Cancelled). All transitions validated. |
| **Menu Management** | Initiator can CRUD menu items with categories, prices, stock limits, and availability. Non-initiators blocked. |
| **Order Management** | Users can place, update, delete their own orders (one per run). Prices snapshotted at order time. |
| **Price Immutability** | Changing menu price after orders exist does NOT affect existing order totals. |
| **Run Summary** | Initiator sees grand total, per-person breakdown, per-item totals. Copy to clipboard works. |
| **Templates** | Personal and Team-scoped templates. CRUD with soft delete (archive). JSON import. |
| **Real-Time** | SignalR events fire for all mutations. UI updates live without refresh. |
| **Deadlines** | Countdown timer works. Auto-close on deadline. Late orders rejected. |
| **Permissions** | All endpoints enforce correct authorization. Team lead overrides work. |
| **Pagination** | Run list and template list paginated. Filters and search work. |
| **Legacy API** | Legacy template endpoint returns array shape (backward compatible). |

---

## 4. Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | User places order while run is closing (race between order and auto-close) | Order accepted if before close; rejected if after |
| EC-02 | Initiator deletes run while users are viewing it | Users see error/redirect on next interaction |
| EC-03 | Two initiators publish runs simultaneously | Both succeed; no conflict |
| EC-04 | Order placed for item that was just deleted by initiator | Order fails with "item not found" |
| EC-05 | User edits order while initiator changes item price | Order uses price at time of edit (new snapshot) |
| EC-06 | SignalR disconnects during order placement | Order queued; retry on reconnect; optimistic rollback on failure |
| EC-07 | Deadline set to exactly "now" | Run auto-closes immediately or rejects as past deadline |
| EC-08 | Template import with duplicate item names | Items imported as-is (duplicates allowed) OR validation error |
| EC-09 | User with no team membership tries to access coffee runs | 403 or empty state |
| EC-10 | Run created, published, then initiator deleted from team | Run still accessible; orphaned run handling |
| EC-11 | Multiple tabs open for same run | All tabs update via SignalR; no conflicts |
| EC-12 | Order placed with quantity 0 for all items | Order not created (empty order) |
| EC-13 | MaxQuantity set to 0 for an item | Item effectively unavailable; cannot be ordered |
| EC-14 | Category name with special characters | Stored and displayed correctly |
| EC-15 | SortOrder negative value | Accepted or rejected with validation |
| EC-16 | Price with more than 2 decimal places (e.g., 45.999) | Rounded to 2 decimals or rejected |
| EC-17 | Run with 1000+ orders | Summary calculates correctly; performance acceptable |
| EC-18 | Template with 200+ items | Editor handles large template; performance acceptable |
| EC-19 | User tries to order from a cancelled run | Redirected to cancelled view; order rejected |
| EC-20 | Deadline worker crashes mid-close | Run eventually closed on next poll; idempotent operation |

---

## 5. Regression Tests

| ID | Test | Description | Expected |
|----|------|-------------|----------|
| RG-01 | Existing runs still accessible | Runs created before migration are still viewable | All fields populated; backfilled UnitPrice/LineTotal/TotalAmount correct |
| RG-02 | Existing templates still accessible | Templates created before migration still work | Scope defaults to Personal; items intact |
| RG-03 | Existing orders display correct totals | Orders placed before migration show correct totals | TotalAmount = backfilled sum; UnitPrice = MenuItem.Price at time |
| RG-04 | Legacy run list endpoint | GET `/api/v1/coffee-runs` still works | Returns PagedResult (new behavior) OR legacy array (if maintained) |
| RG-05 | Legacy template endpoint shape | GET `/api/v1/coffee-run-menu-templates` returns array | `[...]` shape, not PagedResult (per C2 fix) |
| RG-06 | Old Angular component compatibility | If old component still deployed, it works with new API | No breaking changes for old component |
| RG-07 | Team member lookup | Orders reference valid TeamMemberId | FK constraints enforced; names resolve correctly |
| RG-08 | Currency display | All prices display with "R" prefix (hardcoded) | Consistent with current behavior (UX-10 not yet fixed) |
| RG-09 | One order per person per run | UNIQUE constraint still enforced | Second order rejected |
| RG-10 | Menu item deletion with orders | Cannot delete item with existing orders | 409 Conflict |

---

## 6. API Tests

### 6.1 Runs API

| ID | Method | Endpoint | Request | Expected Response | Status |
|----|--------|----------|---------|-------------------|--------|
| API-01 | GET | `/api/v1/coffee-runs` | `?page=1&pageSize=10` | `PagedResult<RunSummary>` with up to 10 items | 200 |
| API-02 | GET | `/api/v1/coffee-runs` | `?status=Open` | Only Open runs | 200 |
| API-03 | GET | `/api/v1/coffee-runs` | `?initiatorId={guid}` | Only runs by that initiator | 200 |
| API-04 | GET | `/api/v1/coffee-runs` | `?from=2026-05-01&to=2026-05-31` | Only runs in May | 200 |
| API-05 | POST | `/api/v1/coffee-runs` | `{}` | `RunSummary` with Draft status | 201 |
| API-06 | POST | `/api/v1/coffee-runs` | `{ title: "Test", location: "Cafe", orderDeadline: "2026-05-23T11:00:00Z", templateId: "{guid}" }` | `RunSummary` with menu from template | 201 |
| API-07 | POST | `/api/v1/coffee-runs` | `{ copyMenuFromRunId: "{guid}" }` | `RunSummary` with copied menu | 201 |
| API-08 | POST | `/api/v1/coffee-runs` | `{ orderDeadline: "2026-05-22T10:00:00Z" }` (past) | 400 Bad Request | 400 |
| API-09 | GET | `/api/v1/coffee-runs/{id}` | — | `RunDetail` with MenuItems and Orders | 200 |
| API-10 | GET | `/api/v1/coffee-runs/{id}` | invalid GUID | 400 Bad Request | 400 |
| API-11 | GET | `/api/v1/coffee-runs/{id}` | non-existent ID | 404 Not Found | 404 |
| API-12 | PATCH | `/api/v1/coffee-runs/{id}` | `{ title: "New Title" }` | `RunSummary` with updated title | 200 |
| API-13 | POST | `/api/v1/coffee-runs/{id}/publish` | — (Draft run) | `RunSummary` with Open status | 200 |
| API-14 | POST | `/api/v1/coffee-runs/{id}/publish` | — (Open run) | 400/409 (already Open) | 400/409 |
| API-15 | POST | `/api/v1/coffee-runs/{id}/close` | — (Open run) | `RunSummary` with Closed status | 200 |
| API-16 | POST | `/api/v1/coffee-runs/{id}/close` | — (Draft run) | 400 (cannot close Draft) | 400 |
| API-17 | POST | `/api/v1/coffee-runs/{id}/cancel` | — (any non-Closed) | `RunSummary` with Cancelled status | 200 |
| API-18 | DELETE | `/api/v1/coffee-runs/{id}` | — (initiator) | 204 No Content | 204 |
| API-19 | DELETE | `/api/v1/coffee-runs/{id}` | — (non-initiator) | 403 Forbidden | 403 |
| API-20 | GET | `/api/v1/coffee-runs/{id}/summary` | — (initiator) | `RunSummaryDetail` with People and Items | 200 |
| API-21 | GET | `/api/v1/coffee-runs/{id}/summary` | — (non-initiator) | 403 Forbidden | 403 |

### 6.2 Menu Items API

| ID | Method | Endpoint | Request | Expected Response | Status |
|----|--------|----------|---------|-------------------|--------|
| API-22 | POST | `/api/v1/coffee-runs/{runId}/menu-items` | `{ name: "Latte", price: 45.00, category: "Coffee", sortOrder: 0 }` | `MenuItemDto` | 201 |
| API-23 | POST | `/api/v1/coffee-runs/{runId}/menu-items` | `{ name: "", price: 45.00 }` | 400 (name required) | 400 |
| API-24 | POST | `/api/v1/coffee-runs/{runId}/menu-items` | `{ name: "Latte", price: -1 }` | 400 (price non-negative) | 400 |
| API-25 | PUT | `/api/v1/coffee-runs/{runId}/menu-items/{itemId}` | `{ price: 50.00 }` | `MenuItemDto` with new price | 200 |
| API-26 | DELETE | `/api/v1/coffee-runs/{runId}/menu-items/{itemId}` | — (no orders) | 204 | 204 |
| API-27 | DELETE | `/api/v1/coffee-runs/{runId}/menu-items/{itemId}` | — (has orders) | 409 Conflict | 409 |
| API-28 | PATCH | `/api/v1/coffee-runs/{runId}/menu-items/{itemId}/availability` | `{ isAvailable: false }` | `MenuItemDto` with IsAvailable=false | 200 |
| API-29 | PUT | `/api/v1/coffee-runs/{runId}/menu-items/reorder` | `[{ itemId: "...", sortOrder: 1 }, ...]` | 204 | 204 |

### 6.3 Orders API

| ID | Method | Endpoint | Request | Expected Response | Status |
|----|--------|----------|---------|-------------------|--------|
| API-30 | POST | `/api/v1/coffee-runs/{runId}/orders` | `{ notes: "oat milk", items: [{ menuItemId: "...", quantity: 2 }] }` | `OrderDto` with snapshot prices | 201 |
| API-31 | POST | `/api/v1/coffee-runs/{runId}/orders` | `{ items: [] }` | 400 (empty order) | 400 |
| API-32 | POST | `/api/v1/coffee-runs/{runId}/orders` | (second order by same user) | 409 (duplicate) | 409 |
| API-33 | POST | `/api/v1/coffee-runs/{runId}/orders` | (run is Closed) | 400 (run closed) | 400 |
| API-34 | PUT | `/api/v1/coffee-runs/{runId}/orders/{orderId}` | `{ notes: "updated", items: [...] }` | `OrderDto` with updated data | 200 |
| API-35 | PUT | `/api/v1/coffee-runs/{runId}/orders/{orderId}` | (another user's order) | 403 Forbidden | 403 |
| API-36 | DELETE | `/api/v1/coffee-runs/{runId}/orders/{orderId}` | — (own order, Open run) | 204 | 204 |
| API-37 | DELETE | `/api/v1/coffee-runs/{runId}/orders/{orderId}` | — (Closed run) | 400 | 400 |
| API-38 | PATCH | `/api/v1/coffee-runs/{runId}/orders/{orderId}/status` | `{ status: "Confirmed" }` (initiator) | `OrderDto` with new status | 200 |
| API-39 | PATCH | `/api/v1/coffee-runs/{runId}/orders/{orderId}/status` | `{ status: "InvalidStatus" }` | 400 Bad Request | 400 |
| API-40 | PATCH | `/api/v1/coffee-runs/{runId}/orders/{orderId}/status` | (non-initiator) | 403 Forbidden | 403 |

### 6.4 Templates API

| ID | Method | Endpoint | Request | Expected Response | Status |
|----|--------|----------|---------|-------------------|--------|
| API-41 | GET | `/api/v1/menu-templates` | `?page=1&pageSize=10` | `PagedResult<TemplateSummary>` | 200 |
| API-42 | GET | `/api/v1/menu-templates` | `?scope=Team` | Only Team templates | 200 |
| API-43 | POST | `/api/v1/menu-templates` | `{ name: "Office Cafe", scope: "Personal" }` | `TemplateDetail` | 201 |
| API-44 | POST | `/api/v1/menu-templates` | `{ name: "Team Menu", scope: "Team" }` (non-lead) | 403 Forbidden | 403 |
| API-45 | POST | `/api/v1/menu-templates/import` | `{ name: "Imported", items: [...] }` | `TemplateDetail` | 201 |
| API-46 | POST | `/api/v1/menu-templates/import` | `{ invalid JSON structure }` | 400 Bad Request | 400 |
| API-47 | GET | `/api/v1/menu-templates/{id}` | — | `TemplateDetail` with Items | 200 |
| API-48 | PUT | `/api/v1/menu-templates/{id}` | `{ name: "Updated" }` (owner) | `TemplateDetail` | 200 |
| API-49 | PUT | `/api/v1/menu-templates/{id}` | (non-owner, non-lead) | 403 Forbidden | 403 |
| API-50 | DELETE | `/api/v1/menu-templates/{id}` | — (owner) | 204 (soft delete) | 204 |
| API-51 | POST | `/api/v1/menu-templates/{id}/items` | `{ name: "Latte", price: 45.00 }` | `TemplateItemDto` | 201 |
| API-52 | PUT | `/api/v1/menu-templates/{id}/items/{itemId}` | `{ price: 50.00 }` | `TemplateItemDto` | 200 |
| API-53 | DELETE | `/api/v1/menu-templates/{id}/items/{itemId}` | — (owner) | 204 | 204 |
| API-54 | PUT | `/api/v1/menu-templates/{id}/items/reorder` | `[{ itemId, sortOrder }]` | 204 | 204 |

### 6.5 Legacy API

| ID | Method | Endpoint | Expected Response | Status |
|----|--------|----------|-------------------|--------|
| API-55 | GET | `/api/v1/coffee-run-menu-templates` | Array `[...]` (not PagedResult) | 200 |

---

## 7. Mobile Tests

### 7.1 Responsive Layout

| ID | Test | Device/Viewport | Expected |
|----|------|-----------------|----------|
| MB-01 | Run list — single column | Mobile (375px) | Cards stack vertically, full width |
| MB-02 | Run list — two columns | Tablet (768px) | Cards in 2-column grid |
| MB-03 | Run list — three columns | Desktop (1024px+) | Cards in 3-column grid |
| MB-04 | Run detail — stacked layout | Mobile (375px) | Header → tabs → content → sticky bar |
| MB-05 | Run detail — side-by-side | Desktop (1024px+) | Menu and Orders side-by-side panels |
| MB-06 | Sticky order bar | Mobile (375px) | Order total + Place Order button anchored to bottom |
| MB-07 | Bottom tab bar | Mobile only | Runs | Templates tabs visible at bottom |
| MB-08 | Sidebar navigation | Desktop only | Sidebar nav visible; no bottom tab bar |

### 7.2 Touch Interactions

| ID | Test | Description | Expected |
|----|------|-------------|----------|
| MB-09 | Touch target size | All interactive elements | Minimum 44×44px |
| MB-10 | Quantity stepper tap | Tap +/- buttons | 48×48px buttons; 16px gap; responsive |
| MB-11 | Card tap area | Tap anywhere on run card | Navigates to run detail |
| MB-12 | Swipe left on run card | Swipe gesture | Quick actions revealed (View / Order / Delete) |
| MB-13 | Swipe left on order card | Swipe gesture | Status change actions (Confirm / Picked Up) |
| MB-14 | Pull to refresh | Pull down on run list | Refreshes data (fallback for SignalR disconnect) |
| MB-15 | Long press on menu item | Long press gesture | Quick edit dialog opens |
| MB-16 | Drag-and-drop reorder | Drag menu item by handle | Ghost follows finger; drop zone highlights |
| MB-17 | Dialog dismiss | Swipe down on bottom sheet | Dialog closes |
| MB-18 | Dialog dismiss | Tap backdrop | Dialog closes |

### 7.3 Keyboard Handling (Mobile)

| ID | Test | Description | Expected |
|----|------|-------------|----------|
| MB-19 | Keyboard appearance | Tap input field in dialog | Dialog resizes; input visible above keyboard |
| MB-20 | Keyboard dismissal | Tap outside input | Keyboard dismisses; dialog restores size |
| MB-21 | Numeric keyboard | Tap price input | Numeric keypad shown |
| MB-22 | Keyboard in stepper | Focus stepper value field | Arrow keys change value |

### 7.4 Mobile Performance

| ID | Test | Description | Expected |
|----|------|-------------|----------|
| MB-23 | Skeleton loaders | Initial page load | Skeleton placeholders shown instead of spinners |
| MB-24 | Lazy-load order details | Switch to Orders tab | Orders fetched only when tab selected |
| MB-25 | Debounce stepper changes | Rapidly tap +/- | API calls debounced at 300ms |
| MB-26 | Optimistic UI | Place order | Order appears immediately; server confirms in background |
| MB-27 | Page load time | Cold load of run list | < 2s on 4G |
| MB-28 | Page load time | Cold load of run detail | < 3s on 4G |

---

## 8. Performance Tests

| ID | Test | Description | Metric | Pass Threshold |
|----|------|-------------|--------|----------------|
| PF-01 | Run list load (10 runs) | GET `/coffee-runs?page=1&pageSize=10` | Response time | < 200ms |
| PF-02 | Run list load (1000 runs) | GET `/coffee-runs?page=1&pageSize=20` | Response time | < 500ms |
| PF-03 | Run detail load (10 orders) | GET `/coffee-runs/{id}` | Response time | < 300ms |
| PF-04 | Run detail load (100 orders) | GET `/coffee-runs/{id}` | Response time | < 800ms |
| PF-05 | Run detail load (1000 orders) | GET `/coffee-runs/{id}` | Response time | < 2000ms |
| PF-06 | Place order | POST `/coffee-runs/{id}/orders` | Response time | < 500ms |
| PF-07 | Summary calculation (50 orders) | GET `/coffee-runs/{id}/summary` | Response time | < 300ms |
| PF-08 | Summary calculation (500 orders) | GET `/coffee-runs/{id}/summary` | Response time | < 1000ms |
| PF-09 | Template list load (100 templates) | GET `/menu-templates?page=1&pageSize=20` | Response time | < 300ms |
| PF-10 | SignalR event delivery | Order placed → initiator sees update | Latency | < 2000ms |
| PF-11 | Concurrent users (50) | 50 users placing orders simultaneously | Success rate | > 99% |
| PF-12 | Concurrent users (100) | 100 users viewing same run detail | Response time p95 | < 1000ms |
| PF-13 | Database query — run list | EXPLAIN ANALYZE on paginated run list | Query time | < 50ms |
| PF-14 | Database query — stock check | EXPLAIN ANALYZE on SumAsync for stock | Query time | < 20ms |
| PF-15 | Frontend bundle size | Angular production build | Bundle size | < 500KB gzipped |
| PF-16 | First Contentful Paint | Run list page | FCP | < 1.5s |
| PF-17 | Time to Interactive | Run detail page | TTI | < 3s |
| PF-18 | Memory usage | Run detail with 100 orders | Browser memory | < 100MB |

---

## 9. Accessibility Tests

| ID | Test | Description | Expected |
|----|------|-------------|----------|
| AX-01 | Keyboard navigation | Tab through all interactive elements | Logical tab order; no traps |
| AX-02 | Focus visibility | Focus ring on all elements | 2px solid, high contrast |
| AX-03 | Skip link | "Skip to main content" link | Visible on focus; jumps to content |
| AX-04 | Screen reader — status badge | Status badge read by screen reader | "Status: Open - accepting orders" |
| AX-05 | Screen reader — stepper | Quantity stepper read by screen reader | "Latte quantity: 2" with +/- buttons |
| AX-06 | Screen reader — countdown | Countdown timer read by screen reader | "Closes in 18 minutes and 42 seconds" |
| AX-07 | Screen reader — live regions | Order placed notification | Announced via aria-live="polite" |
| AX-08 | Screen reader — state changes | Run closed | Announced via aria-live="assertive" |
| AX-09 | Color contrast | All text/background combinations | WCAG AA (4.5:1 minimum) |
| AX-10 | Color not sole indicator | Status, stock warnings | Icon + text + color |
| AX-11 | Reduced motion | `prefers-reduced-motion: reduce` | All animations disabled |
| AX-12 | Dialog focus trap | Open dialog | Focus trapped within dialog |
| AX-13 | Dialog focus return | Close dialog | Focus returns to triggering element |
| AX-14 | Form labels | All inputs have associated labels | `for`/`id` or `aria-label` |
| AX-15 | Error announcements | Form validation errors | Announced via aria-live |

---

## 10. Known Issues to Verify (from Code Review)

| ID | Issue | Status | Test Action |
|----|-------|--------|-------------|
| KI-01 | C1: Save as Template missing copyFromRunId | Fixed in v2 | Verify TC-056 — template has all run items |
| KI-02 | C2: Legacy endpoint returns PagedResult | Fixed in v2 | Verify TC-091 — response is array |
| KI-03 | C3: Closing state unused | Fixed — removed | Verify no "Closing" status appears anywhere |
| KI-04 | C4: UnitPrice/LineTotal guards | Fixed — XML docs | Verify TC-029 — price snapshot works |
| KI-05 | C5: Stock race condition | Fixed — transaction | Verify TC-038 — no overselling |
| KI-06 | N1: UpdateOrderAsync not transaction-wrapped | Medium severity | Verify TC-039 — no overselling on edit race |
| KI-07 | N2: Dead "Closing" case in statusColor() | Cosmetic | Verify no orange "Closing" badge appears |
| KI-08 | W1: CreateOrderAsync silently skips invalid items | Unchanged | Verify TC-036 — user receives feedback |
| KI-09 | W2: Legacy GetTemplates truncates at 20 | Unchanged | Verify TC-092 — documented limitation |
| KI-10 | W3: No SignalR hub implementation | Unchanged | Verify TC-075 to TC-085 — if no hub, all fail |
| KI-11 | W5: UpdateOrderStatusAsync accepts any string | Unchanged | Verify TC-046 — invalid status rejected |
| KI-12 | W9: CancelAsync does not clean up orders | Unchanged | Verify TC-109 — orders cleaned up or not |
| KI-13 | W10: Angular uses `any` for request types | Unchanged | Verify TypeScript compilation; no type errors |
| KI-14 | S3: No deadline validation (past dates) | Unchanged | Verify TC-015 — past deadline rejected |
| KI-15 | S4: Currency hardcoded as "R" | Unchanged | Verify TC-RG-08 — "R" prefix everywhere |
| KI-16 | S5: WebSocket no auth | Unchanged | Verify TC-085 — auth token passed |
| KI-17 | S8: Mutations return full detail DTO | Unchanged | Verify API responses — check payload size |

---

## 11. Test Execution Order

### Phase 1: Foundation (API + Data Model)
1. API-01 through API-55 (all endpoint tests)
2. TC-029 (price snapshot integrity)
3. TC-038, TC-039 (stock race conditions)
4. TC-098 through TC-110 (edge cases)
5. RG-01 through RG-10 (regression)

### Phase 2: Lifecycle & Metadata
1. TC-001 through TC-015 (run lifecycle)
2. TC-086 through TC-090 (deadlines)
3. TC-016 through TC-029 (menu management)

### Phase 3: Real-Time
1. TC-075 through TC-085 (SignalR) — **depends on W3 resolution**

### Phase 4: Enhanced Menu & Summary
1. TC-047 through TC-052 (summary)
2. TC-016 through TC-029 (categories, stock, availability)

### Phase 5: Templates & Polish
1. TC-053 through TC-068 (templates)
2. TC-069 through TC-074 (run list, filtering)

### Phase 6: UI, Mobile, Accessibility
1. MB-01 through MB-28 (mobile)
2. AX-01 through AX-15 (accessibility)
3. PF-01 through PF-18 (performance)

---

## 12. Pass/Fail Criteria

| Severity | Definition | Action |
|----------|------------|--------|
| **Blocker** | Core feature broken; data loss; security issue | Must fix before release |
| **Critical** | Major feature broken; no workaround | Must fix before release |
| **Major** | Feature broken; workaround exists | Fix before release or document |
| **Minor** | Cosmetic; UX issue; non-breaking | Fix in next sprint |
| **Trivial** | Typo; alignment; color | Backlog |

**Release Criteria:**
- 0 Blocker defects
- 0 Critical defects
- All Known Issues (KI-01 through KI-17) resolved or documented
- 95%+ test pass rate across all categories
- Performance thresholds met (PF-01 through PF-18)
- Accessibility: WCAG AA compliance (AX-01 through AX-15)
- Mobile: All MB tests pass on iOS Safari and Android Chrome

---

## 13. Test Data Requirements

| Data | Quantity | Purpose |
|------|----------|---------|
| Team members | 10+ | Order placement, permissions testing |
| Team leads | 2 | Admin override testing |
| Templates | 5+ (mix of Personal/Team/Archived) | Template CRUD, filtering |
| Historical runs | 20+ (mix of states) | Run list pagination, filtering |
| Menu items per run | 3-15 | Menu management, categories |
| Orders per run | 0-50 | Summary calculation, performance |

---

## 14. Automation Recommendations

| Area | Priority | Tool | Notes |
|------|----------|------|-------|
| API tests | High | xUnit + HttpClient | All API-01 through API-55 |
| Price snapshot | High | Integration test | TC-029 |
| Stock race condition | High | Integration test with parallel threads | TC-038, TC-039 |
| Permission tests | High | xUnit with role-based auth | TC-093 through TC-097 |
| E2E — Run lifecycle | Medium | Playwright/Cypress | TC-001 through TC-015 |
| E2E — Order flow | Medium | Playwright/Cypress | TC-030 through TC-046 |
| E2E — Real-time | Medium | Playwright with 2 browser contexts | TC-075 through TC-082 |
| Visual regression | Low | Percy/Chromatic | Mobile + Desktop layouts |
| Performance | Medium | k6/Lighthouse | PF-01 through PF-18 |
| Accessibility | Medium | axe-core + Playwright | AX-01 through AX-15 |
