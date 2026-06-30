# Coffee Run — UX Specification

## 1. User Flows

### 1.1 Persona: Initiator (the person starting the coffee run)

```
START: Fun Hub → Coffee Run tab

┌─ LIST VIEW (empty) ──────────────────────────────────────────┐
│                                                               │
│  "No coffee runs yet. Start one?"                            │
│  ┌─────────────────────┐                                      │
│  │   Start a Coffee Run │  ← clicks CTA                      │
│  └─────────────────────┘                                      │
│                                                               │
│  RUN IS CREATED → auto-navigated to detail view               │
└───────────────────────────────────────────────────────────────┘

┌─ DETAIL VIEW (Open, initiator perspective) ──────────────────┐
│                                                               │
│  Phase 1: ADD MENU ITEMS                                      │
│  ┌─ Menu section ────────────────────────────────────────┐   │
│  │ "Add items to the menu so people can order"            │   │
│  │ [ item name ______________ ]  [ price ___ ]  [+ Add]  │   │
│  │                                                        │   │
│  │ Latte            $4.50  [edit] [×]                     │   │
│  │ Cappuccino       $4.00  [edit] [×]                     │   │
│  │ Muffin           $3.50  [edit] [×]                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Phase 2: SHARE WITH TEAM                                     │
│  ↓ wait for team members to place orders                      │
│                                                               │
│  Phase 3: VIEW ORDERS (as people place them)                  │
│  ┌─ Orders section ──────────────────────────────────────┐   │
│  │ Alice    1× Latte, 1× Muffin         $8.00            │   │
│  │ Bob      2× Cappuccino               $8.00            │   │
│  │ Charlie  1× Latte                    $4.50            │   │
│  │ ─────────────────────────────────────────────────      │   │
│  │ Total: 3 orders · $20.50                               │   │
│  │ [Close Coffee Run]                                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Phase 4: CLOSE THE RUN                                       │
│  [Close Coffee Run] → confirm dialog → run closed             │
│                                                               │
│  ↓ run becomes read-only summary                              │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 Persona: Participant (team member placing an order)

```
START: Fun Hub → Coffee Run tab

┌─ LIST VIEW ──────────────────────────────────────────────────┐
│  Open coffee runs are listed with status badges               │
│                                                               │
│  ☕ Alice's Run     Open    4 items    2 orders               │
│  ☕ Bob's Run       Open    6 items    5 orders               │
│  ☕ Closed Run                  (greyed out)                  │
│                                                               │
│  Participant clicks an open run row → detail view             │
└───────────────────────────────────────────────────────────────┘

┌─ DETAIL VIEW (Open, participant perspective) ────────────────┐
│                                                               │
│  ┌─ Menu section ────────────────────────────────────────┐   │
│  │ (read-only list of available items)                    │   │
│  │ Latte     $4.50    [-] [1] [+]                         │   │
│  │ Cappuc.   $4.00    [-] [1] [+]                         │   │
│  │ Muffin    $3.50    [-] [1] [+]                         │   │
│  │                                                        │   │
│  │ [notes: extra shot, oat milk ___________]              │   │
│  │                                                        │   │
│  │ Subtotal: $8.00                                        │   │
│  │ ┌──────────────────┐                                   │   │
│  │ │   Place Order     │                                  │   │
│  │ └──────────────────┘                                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  After placing: order card shows "Your Order" with            │
│  edit/delete options                                          │
└───────────────────────────────────────────────────────────────┘
```

### 1.3 Closing / Read-Only Flow

```
┌─ DETAIL VIEW (Closed, any perspective) ──────────────────────┐
│                                                               │
│  ☕ Alice's Run  ·  Closed  ·  May 21, 2026                   │
│                                                               │
│  ┌─ Menu (read-only) ────────────────────────────────────┐   │
│  │ Latte                            $4.50                │   │
│  │ Cappuccino                       $4.00                │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ Order Summary ───────────────────────────────────────┐   │
│  │ Alice  ·  1× Latte                          $4.50     │   │
│  │ Bob    ·  2× Cappuccino                    $8.00     │   │
│  │ Charlie · 1× Latte + 1× Muffin            $8.00     │   │
│  │ ─────────────────────────────────────────────────      │   │
│  │ 3 orders · $20.50 total                                │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  No interactive elements — pure summary                       │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Designs (ASCII Wireframes)

### 2.1 Coffee Run List View — Empty

```
┌─────────────────────────────────────────────────────────┐
│  ☕ Coffee Run                                           │
│                                                         │
│                         ┌───────────────────────┐       │
│                ☕        │                       │       │
│             (icon)      │  No coffee runs yet.  │       │
│                         │  Start one and let    │       │
│                         │  the team order!      │       │
│                         │                       │       │
│                         │  [Start a Coffee Run] │       │
│                         └───────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Coffee Run List View — Populated

```
┌──────────────────────────────────────────────────────────────┐
│  ☕ Coffee Run                          [Start a Coffee Run]  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Open Runs                                    ▲ 2 open   │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │  ┌─ Run card 1 ──────────────────────────────────────┐  │ │
│  │  │ ☕ Alice's Run                                    │  │ │
│  │  │                   ┌───────┐  4 items · 3 orders   │  │ │
│  │  │                   │ Open  │  Created May 20       │  │ │
│  │  │                   └───────┘                      │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─ Run card 2 ──────────────────────────────────────┐  │ │
│  │  │ ☕ Bob's Run                                      │  │ │
│  │  │                   ┌───────┐  5 items · 1 order    │  │ │
│  │  │                   │ Open  │  Created May 21       │  │ │
│  │  │                   └───────┘                      │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Closed Runs                                  ▲ 3 closed │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │  ┌─ Run card 3 ──────────────────────────────────────┐  │ │
│  │  │ ☕ Carol's Run                                   │  │ │
│  │  │                   ┌────────┐  3 items · 6 orders  │  │ │
│  │  │                   │ Closed │  May 15 – May 18     │  │ │
│  │  │                   └────────┘                     │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Run Detail View — Initiator (Open, menu editing mode)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to runs     ☕ Alice's Run · Open        [Close Run]      │
│                                                                  │
│  ┌─ MENU ────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ┌─ Add item ─────────────────────────────────────────┐   │  │
│  │  │ [ Latte                  ]  $[ 4.50 ]  [ + Add  ] │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │  ┌─ Latte ──────────────────── $4.50 ─── [✎] [🗑] ──┐   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │  ┌─ Cappuccino ─────────────── $4.00 ─── [✎] [🗑] ──┐   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │  ┌─ Blueberry Muffin ───────── $3.50 ─── [✎] [🗑] ──┐   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │  3 items on the menu                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ ORDERS ─────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  ┌─ Bob ────────────────────────────────────────────┐   │  │
│  │  │  1× Latte                              $4.50     │   │  │
│  │  │  2× Cappuccino                         $8.00     │   │  │
│  │  │  ──────────────────────────────────────────────   │   │  │
│  │  │  Total: $12.50              [notes: oat milk]    │   │  │
│  │  │  Ordered May 21                                   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │  ┌─ Charlie ────────────────────────────────────────┐   │  │
│  │  │  1× Latte                              $4.50     │   │  │
│  │  │  1× Blueberry Muffin                   $3.50     │   │  │
│  │  │  ──────────────────────────────────────────────   │   │  │
│  │  │  Total: $8.00               [notes: —]           │   │  │
│  │  │  Ordered May 21                                   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │  ────────────────────────────────────────────────────    │  │
│  │  2 orders · Run total: $20.50                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 Run Detail View — Participant (Open, with order)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to runs     ☕ Alice's Run · Open                         │
│                                                                  │
│  ┌─ YOUR ORDER ──────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ┌─ Latte ───────────────────── $4.50 ─── [-] [2] [+] ─┐ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │  ┌─ Cappuccino ──────────────── $4.00 ─── [-] [0] [+] ─┐ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │  ┌─ Muffin ──────────────────── $3.50 ─── [-] [1] [+] ─┐ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  Notes: [ oat milk please ___________________________ ]   │  │
│  │                                                           │  │
│  │  Your total: $12.50                                       │  │
│  │  ┌──────────────────────────┐  ┌──────────────────────┐   │  │
│  │  │      Update Order         │  │    Delete Order      │   │  │
│  │  └──────────────────────────┘  └──────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ FULL MENU ───────────────────────────────────────────────┐  │
│  │  Latte                $4.50                               │  │
│  │  Cappuccino           $4.00                               │  │
│  │  Blueberry Muffin     $3.50                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ ALL ORDERS ──────────────────────────────────────────────┐  │
│  │  Bob     · 1× Latte, 2× Cappuccino             $12.50    │  │
│  │  Charlie · 1× Latte, 1× Muffin                  $8.00    │  │
│  │  You (summary of your order shown compactly)     $12.50   │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.5 Run Detail View — Participant (Open, no order yet)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to runs     ☕ Alice's Run · Open                         │
│                                                                  │
│  ┌─ PLACE YOUR ORDER ────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ┌─ Latte ───────────────────── $4.50 ─── [-] [0] [+] ─┐ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │  ┌─ Cappuccino ──────────────── $4.00 ─── [-] [0] [+] ─┐ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │  ┌─ Muffin ──────────────────── $3.50 ─── [-] [0] [+] ─┐ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  Total: $0.00                                            │  │
│  │  ┌──────────────────────┐                                 │  │
│  │  │     Place Order       │  (disabled until $ > 0)       │  │
│  │  └──────────────────────┘                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ ALL ORDERS ──────────────────────────────────────────────┐  │
│  │  Bob     · 1× Latte, 2× Cappuccino             $12.50    │  │
│  │  Charlie · 1× Latte, 1× Muffin                  $8.00    │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.6 Run Detail View — Closed (read-only summary)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to runs     ☕ Alice's Run · Closed                       │
│                                                  [Delete Run 🗑] │
│  Closed on May 21, 2026                                          │
│                                                                  │
│  ┌─ MENU ───────────────────────────────────────────────────┐   │
│  │  Latte                 $4.50                             │   │
│  │  Cappuccino            $4.00                             │   │
│  │  Blueberry Muffin      $3.50                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ ORDERS SUMMARY ────────────────────────────────────────┐   │
│  │  ┌─────────────────────┬──────────┬─────────┬────────┐  │   │
│  │  │ Member              │ Items    │ Notes   │ Total  │  │   │
│  │  ├─────────────────────┼──────────┼─────────┼────────┤  │   │
│  │  │ Bob                 │ 1× Latte │         │ $4.50  │  │   │
│  │  │                     │ 2× Cap.  │         │        │  │   │
│  │  ├─────────────────────┼──────────┼─────────┼────────┤  │   │
│  │  │ Charlie             │ 1× Latte │ —       │ $8.00  │  │   │
│  │  │                     │ 1× Muf.  │         │        │  │   │
│  │  ├─────────────────────┼──────────┼─────────┼────────┤  │   │
│  │  │ Alice (initiator)   │ 1× Cap.  │ extra   │ $4.00  │  │   │
│  │  │                     │          │ shot    │        │  │   │
│  │  ├─────────────────────┼──────────┼─────────┼────────┤  │   │
│  │  │ TOTALS              │ 4 items  │ —       │ $16.50 │  │   │
│  │  └─────────────────────┴──────────┴─────────┴────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.7 Create Run Confirmation (inline flash)

```
┌─────────────────────────────────────────────┐
│  Click [Start a Coffee Run] from list view  │
│                                             │
│  ↓ POST /api/v1/coffee-runs (no body)       │
│                                             │
│  Run is created immediately (optimistic).   │
│  Auto-navigate to detail view.              │
│                                             │
│  Toast / snackbar:                          │
│  ┌───────────────────────────────────────┐  │
│  │ ✓ Coffee run started! Add menu items  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 2.8 Confirm Dialog — Close Run

```
┌───────────────────────────────────┐
│  Close this coffee run?           │
│                                   │
│  Orders can no longer be          │
│  changed after closing.           │
│                                   │
│  3 orders · $20.50 total          │
│                                   │
│          [Cancel]   [Close Run]   │
└───────────────────────────────────┘
```

### 2.9 Confirm Dialog — Delete Order / Delete Menu Item

```
┌──────────────────────────────────────┐
│  Delete item "Cappuccino"?           │
│                                      │
│  This will remove it from the menu.  │
│  It cannot be undone.                │
│                                      │
│          [Cancel]   [Delete]         │
└──────────────────────────────────────┘
```

### 2.10 Confirm Dialog — Delete Coffee Run

```
┌──────────────────────────────────────┐
│  Delete this coffee run?             │
│                                      │
│  "Alice's Run" and all its           │
│  orders and menu will be             │
│  permanently removed.                │
│                                      │
│          [Cancel]   [Delete]         │
└──────────────────────────────────────┘
```

---

## 3. Component Hierarchy

```
app-fun-hub
└── <router-outlet />                            ← child route content
    └── app-coffee-run                           ← CoffeeRunComponent
        │
        ├── (list view mode)
        │   ├── status-filter-toggle             ← inline toggle: Open | Closed | All
        │   ├── [Start a Coffee Run] button
        │   ├── empty-state block (when runs.length === 0)
        │   └── run-cards                        ← *ngFor over runs signal
        │       ├── run-status-badge             ← "Open" / "Closed"
        │       ├── metadata (items, orders, dates)
        │       └── click → selectRun(id)
        │
        └── (detail view mode)
            ├── ← Back to runs button
            ├── run-header                       ← name, status, initiator
            │   └── [Close Run] / [Delete Run]   ← conditional buttons
            │
            ├── menu-section                     ← always visible
            │   ├── (initiator + open): add-item-form
            │   │   ├── name input + price input + [Add] button
            │   │   └── savingMenu spinner
            │   └── menu-item-list
            │       └── menu-item-row            ← *ngFor
            │           ├── name + price
            │           └── (initiator + open): [edit inline] [delete]
            │
            ├── order-section                    ← visible when open OR has orders
            │   │
            │   └── (if not initiator):
            │       ├── (if no myOrder):
            │       │   └── order-form
            │       │       ├── order-item-row   ← *ngFor over menuItems
            │       │       │   ├── item name + price
            │       │       │   └── qty-stepper: [-] [N] [+]
            │       │       ├── notes-input (optional)
            │       │       ├── total-display
            │       │       └── [Place Order] button
            │       │
            │       └── (if myOrder exists):
            │           └── order-card
            │               ├── order-item-list
            │               ├── notes display
            │               ├── [Edit Order] → switches to order-form (prefilled)
            │               └── [Delete Order]
            │
            ├── orders-summary                   ← *ngFor over orders
            │   └── order-card (compact)         ← per member who ordered
            │       ├── member name + avatar
            │       ├── items list + subtotals
            │       ├── notes (if any)
            │       └── total
            │
            └── run-totals-footer
                ├── order count
                └── grand total

Inputs by component:
  CoffeeRunComponent (manages all state via signals)
    • runs: Signal<CoffeeRunListDto[]>
    • activeRun: Signal<CoffeeRunDetailDto | null>
    • loading: Signal<boolean>
    • currentMemberId: string
    • viewMode: 'list' | 'detail'

  Child sections are NOT separate routed components — they are
  *ngIf / @if blocks within CoffeeRunComponent's template, following
  the WheelComponent pattern of single-component complexity.
```

### 3.1 Angular Service

```
CoffeeRunService (injectable, providedIn: 'root')
  └─ HttpClient → /api/v1/coffee-runs

  Methods map 1:1 to API endpoints per arch.md §3.
```

### 3.2 Model

```
coffee-run.model.ts exports:
  CoffeeRunStatus, CoffeeRunListDto, CoffeeRunDetailDto,
  CoffeeRunDto, CoffeeRunMenuItemDto, CoffeeRunOrderDto,
  CoffeeRunOrderItemDto, CreateMenuItemRequest,
  UpdateMenuItemRequest, CreateOrderRequest,
  UpdateOrderRequest, OrderItemEntry
```

---

## 4. Interaction Design

### 4.1 Creating a Run

1. User navigates to Fun Hub → Coffee Run tab.
2. If no runs exist, empty state is shown with "Start a Coffee Run" CTA.
3. If runs exist, a "Start a Coffee Run" button is at the top of the list.
4. Clicking the button calls `POST /api/v1/coffee-runs` with an empty body.
5. The current user becomes the initiator automatically (determined server-side from JWT).
6. On success: the new run is added to the top of the runs list, view switches to detail mode with the new run as `activeRun`.
7. A snackbar toast confirms: "Coffee run started! Add menu items."

### 4.2 Adding Menu Items (Initiator Only)

1. In detail view, if `isInitiator` AND `isOpen`, an "Add item" row appears at the top of the menu section.
2. It contains two inline inputs: text input for name (placeholder: "Item name...") and a number input for price (placeholder: "0.00", prefix "$").
3. An "[+ Add]" button sits to the right. It is disabled when name is empty or price ≤ 0.
4. Pressing Enter in the name field also triggers add.
5. On success: the menu item list updates (reload from server), inputs clear, name field re-focuses.
6. Each existing menu item row shows: name, `$XX.XX` price, and two icon buttons: edit (pencil `edit`) and delete (trash `delete`).

#### Editing a Menu Item (inline)

1. Click the edit icon on a row → the row transforms into edit mode.
2. Name and price become editable inputs inline, pre-filled with current values.
3. Two buttons replace edit/delete: checkmark `check` to save, cross `close` to cancel.
4. Pressing Enter saves; Escape cancels.
5. On save: `PUT` request, row returns to display mode with updated values.

#### Deleting a Menu Item

1. Click delete icon → opens `ConfirmDialogComponent` (reusing existing shared component).
2. If the item has been ordered by anyone, the API returns 400. Catch and show snackbar: "Cannot delete — someone has ordered this item."
3. Otherwise: item removed, list updates.

### 4.3 Placing an Order (Participant)

1. If the participant has no order yet and the run is open, the order form is shown prominently at the top of the detail view.
2. Each menu item is listed as a row with:
   - Item name and price on the left.
   - A quantity stepper on the right: `[-] [N] [+]` where `[-]` is disabled at 0.
   - Quantities range 0–99 inclusive.
3. Below the items: an optional text area for notes (max 500 chars). Placeholder: "Any special requests?".
4. A live subtotal updates as quantities change.
5. "[Place Order]" button is disabled until at least one item has quantity ≥ 1.
6. On click: `POST` with items (only those with qty > 0) + notes.
7. On success: order form is replaced by the "Your Order" card showing placed items. Snackbar: "Order placed!"
8. On 409 (duplicate): snackbar with "You already have an order. Use Edit to change it."

### 4.4 Editing an Existing Order (Participant)

1. When the participant's order exists, the order form is replaced by a "Your Order" card.
2. Card shows item list, notes, total, and two buttons: `[Update Order]` and `[Delete Order]`.
3. Click `[Update Order]`: order form re-appears, pre-filled with current order data (quantities, notes). Card is hidden.
4. `[Delete Order]`: opens `ConfirmDialogComponent`. On confirm: `DELETE` request. Order cleared, form re-appears empty. Snackbar: "Order removed."

### 4.5 Viewing All Orders (Initiator / All Participants)

1. All orders are listed in the orders section below the menu.
2. Each order card shows: member name (with initials avatar), items with quantities and subtotals, notes (if present), total, and timestamp.
3. A footer row shows: total order count and grand total across all orders.
4. The initiator sees all orders with no special edit controls (they manage through close/delete run).
5. Participants see all orders too (transparency), but can only edit/delete their own.
6. If no orders yet: "No orders yet. Share this run with the team!" text.

### 4.6 Closing the Run (Initiator Only)

1. In detail view of own open run, a `[Close Run]` button is in the header.
2. Click → `ConfirmDialogComponent` with message "Orders can no longer be changed after closing. X orders · $XX.XX total".
3. On confirm: `POST /{id}/close`.
4. On success: run status updates to Closed, view switches to read-only mode. Snackbar: "Coffee run closed!"
5. Only initiator can close. Non-initiator: button not shown.

### 4.7 Deleting a Run

1. In detail view header, a `[🗑 Delete]` icon button is visible for the initiator (any status) or TeamLead (any run).
2. Click → `ConfirmDialogComponent` with danger: true, message "This run and all its orders and menu will be permanently removed."
3. On confirm: `DELETE /{id}`.
4. On success: navigate back to list view. Run card removed. Snackbar: "Coffee run deleted."

### 4.8 Transitions

| From           | To             | Trigger                                   |
|----------------|----------------|-------------------------------------------|
| List (empty)   | Detail (editing) | Click "Start a Coffee Run"              |
| List           | Detail         | Click any run card in the list            |
| Detail         | List           | Click "← Back to runs" in header          |
| Detail (editing) | Detail (closed) | Initiator confirms close dialogue       |
| Order form     | Order card     | Place Order success                       |
| Order card     | Order form     | Edit Order click                          |

---

## 5. Responsive Behavior

### 5.1 Desktop (>768px)

- Full two-column-ish layout within the 900px-max hub container.
- Menu section and order section stack vertically.
- Run cards in list view are full width.
- All inputs and buttons at comfortable desktop sizes.

### 5.2 Mobile (≤768px)

- The Fun Hub tabs scroll horizontally (existing pattern in `fun-hub.component.ts`). "Coffee Run" is the 4th tab.
- In list view: run cards stack full width. CTA button full width.
- In detail view:
  - Header stacks: back link, run name, status badge, and action buttons wrap.
  - Menu management: the "Add item" row stacks vertically (name, price on their own lines, "[+ Add]" full width).
  - Edit menu item inline: inputs stack vertically; save/cancel buttons side by side.
  - Order form: quantity steppers right-align within each row.
  - The "[Place Order]" button is full width, 52px height (matching existing mobile CTA pattern in WheelComponent).
- The "More" sheet pattern (existing `app.component.ts` line 84) is not relevant here — Coffee Run is a Fun Hub sub-tab, always visible in the hub's horizontal tab bar. On very narrow screens (<400px), the hub tabs may need horizontal scrolling (already implemented).

### 5.3 Breakpoints

| Breakpoint | Behavior                                    |
|------------|---------------------------------------------|
| ≥768px     | Desktop layout, side-by-side possible       |
| <768px     | Single column, full-width inputs/buttons    |
| <400px     | Tab bar overflows horizontally (scrollable) |

---

## 6. Error & Edge Case Handling

### 6.1 Loading States

| State                      | UI                                                               |
|----------------------------|------------------------------------------------------------------|
| Initial page load          | Centered `<mat-spinner diameter="48">` (matches WheelComponent)  |
| Reloading detail after mutation | Active detail area shows spinner overlay (opacity on content) |
| Saving menu item           | "[+ Add]" button shows `MatProgressSpinner` (diameter 20), disabled |
| Saving order               | "[Place Order]" button shows spinner, disabled |
| Closing run                | Close button shows spinner during request |
| Deleting                   | Confirm dialog action button shows spinner during request |

### 6.2 Empty States

| State                          | UI                                                                    |
|--------------------------------|-----------------------------------------------------------------------|
| No coffee runs exist           | Empty state with large coffee icon, text "No coffee runs yet. Start one and let the team order!", and CTA button "Start a Coffee Run" |
| Active run has no menu items   | Menu section: "No items on the menu yet." For initiator: "+ Add your first item" prompt + inline add form. For participant: "Waiting for the initiator to add menu items..." |
| Active run has menu but no orders | Orders section: "No orders yet." Slightly different flavor: if initiator → "Share this run with the team!"; if participant → "Be the first to order!" |
| Closed run with no orders      | "This run was closed with no orders." muted text |

### 6.3 Error States

| Scenario                              | UI Response                                                                                     |
|---------------------------------------|-------------------------------------------------------------------------------------------------|
| Run not found (404)                   | Navigate back to list; snackbar "That coffee run no longer exists."                             |
| Try to modify a closed run (400)      | Snackbar "This coffee run is closed. No changes allowed." (reload to refresh)                    |
| Delete menu item with orders (400)    | Snackbar "Cannot delete — someone has already ordered this item."                                |
| Duplicate order (409)                 | Snackbar "You already have an order. Use Edit to change it." Replace form with existing order card |
| Only initiator can close (403)        | Button not shown (frontend prevents). If bypassed: snackbar "Only the initiator can close this run." |
| Only initiator can manage menu (403)  | Edit/delete buttons not shown (frontend prevents). If bypassed: snackbar with the server message. |
| Only own order can be edited (403)    | Edit/delete buttons not shown on others' orders (frontend prevents). |
| Network error / server unreachable    | Snackbar "Something went wrong. Please try again." (generic fallback)                            |
| Quantity validation (client-side)     | [-] button disabled at 0; [+] button disabled at 99. Input constrained to 0–99.                 |
| Empty order submission                | "[Place Order]" disabled until at least one item has qty ≥ 1.                                   |
| Name too long (menu item >150 chars)  | Input `maxlength="150"`. Char count shown when >100 chars remaining.                            |

### 6.4 Concurrent / Race Condition Handling

- Since there are no real-time WebSocket updates in Phase 1, the detail view is reloaded from the server after every mutation (menu add/delete, order place/update/delete, close).
- If a run is closed by the initiator while a participant is viewing it, the participant's next action (e.g. place order) will return a 400. The error is caught and the view is reloaded, transitioning to read-only.
- A stale "Open" run card in the list view: clicking it loads detail which may be Closed. The view adapts immediately.

---

## 7. Visual Design Notes

### 7.1 Material Design Components in Use

| Component               | Usage                                                    |
|-------------------------|----------------------------------------------------------|
| `MatProgressSpinner`    | Loading states (page load, mutation actions)             |
| `MatButton`             | Primary CTAs: "Start a Coffee Run", "Place Order", "Close Run" |
| `MatIconButton`         | Icon-only actions: edit, delete, back arrow             |
| `MatIcon`               | Icons throughout                                         |
| `MatDialog`             | ConfirmDialogComponent (shared, reuse)                   |
| `MatSnackBar`           | Success/error toasts                                     |
| `MatTooltip`            | Hover labels on icon-only buttons                        |
| `MatFormField`          | Not used. Inline inputs with custom styling match the WheelComponent style (background `rgba(255,255,255,0.05)`, border, border-radius 6px) |
| `MatInput`              | Not explicitly used; native `<input>` with inline styles, matching existing Fun Hub patterns |

### 7.2 Color Coding

| Element                    | Color                                            |
|----------------------------|--------------------------------------------------|
| "Open" status badge        | Green background `rgba(76,175,80,0.15)`, text `#4caf50` |
| "Closed" status badge      | Muted: `rgba(255,255,255,0.06)` bg, `rgba(255,255,255,0.4)` text |
| Primary action (CTA)       | `#64b5f6` (matches hub tab active color, button primary) |
| Price values               | `rgba(255,255,255,0.85)` (default readable white) |
| Danger actions (delete)    | `#ef5350` (matches existing delete patterns)     |
| Menu item row (normal)     | Border `rgba(255,255,255,0.07)`, bg `rgba(255,255,255,0.03)` |
| Menu item row (hover)      | Bg `rgba(255,255,255,0.06)`                      |
| Your order card            | Accent border left `2px solid #64b5f6`           |
| Run card (list, Open)      | Border `rgba(255,255,255,0.08)`, subtle coffee accent on hover |
| Run card (list, Closed)    | Opacity `0.6`, border `rgba(255,255,255,0.04)`   |
| Input fields               | Bg `rgba(255,255,255,0.05)`, border `rgba(255,255,255,0.15)`, focus border `#64b5f6` |
| Grand total row            | Bg `rgba(255,255,255,0.04)`, bold text           |
| Snackbar                   | Default Material dark theme (system standard)     |

### 7.3 Icons

| Context           | Icon                                   |
|-------------------|----------------------------------------|
| Coffee Run tab    | `coffee` (Material icon)               |
| Start a Run       | `add_circle` or `coffee`               |
| Back to list      | `arrow_back`                           |
| Close run         | `lock`                                 |
| Delete run        | `delete`                               |
| Add menu item     | `add`                                  |
| Edit menu item    | `edit`                                 |
| Delete menu item  | `delete`                               |
| Quantity decrease | `remove`                               |
| Quantity increase | `add`                                  |
| Place/update order| `check` or `shopping_cart`             |
| Delete order      | `delete`                               |
| Empty state       | `coffee` (large, faded)                |
| Loading           | MatProgressSpinner                     |
| User avatar       | Initials in styled circle              |

### 7.4 Typography

- Follow existing Fun Hub conventions:
  - Page title: `1.2rem`, weight 700
  - Section headers: `0.72rem`, weight 600, uppercase, `opacity: 0.45`, `letter-spacing: 0.08em`
  - Body text: `0.82rem`–`0.85rem`, weight 400
  - Prices: `0.9rem`, weight 600, tabular-nums where possible
  - Metadata / secondary: `0.7rem`, `opacity: 0.4`
  - Button labels: `0.8rem`–`0.85rem`, weight 500

### 7.5 Spacing & Layout

- Card gaps: 8–12px (matching existing `flex-direction: column; gap: 10px` from WinOfTheWeek)
- Section padding: 16px (matching `padding:16px` in win nomination cards)
- Rounded corners: border-radius 8–12px for cards, 6px for inputs (matches WheelComponent)
- Max content width: 900px (matches `max-width:900px` in Fun Hub + Leaderboard)
- Global background: dark theme (inherited from app shell)

### 7.6 Dark Theme Consistency

All Coffee Run UI follows the existing dark theme aesthetic:
- Background: dark (inherited `#1e1e2e` or transparent layers)
- Text: white with varying opacity levels
- Cards: translucent white overlays on dark bg
- Borders: `rgba(255,255,255,0.07)` → `0.15` depending on emphasis
- Blue accent: `#64b5f6` throughout
- Inline inputs use native styling, not Material form fields, matching the WheelComponent's wheel name input pattern
