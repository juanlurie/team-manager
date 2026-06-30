# Coffee Run — Architecture Rethink

> Date: 2026-05-23
> Author: Senior Software Architect
> Status: Proposal

---

## 1. Current State Analysis

### 1.1 What Exists

The Coffee Run feature is a single-page Angular component (`CoffeeRunComponent`) backed by a .NET 8 API (`CoffeeRunsController` + `CoffeeRunService`). It allows a team member to:

1. **Start a run** — optionally seeded from a menu template or an existing run's menu
2. **Build a menu** — add/edit/delete items with prices (initiator only)
3. **Place orders** — team members select quantities per menu item, add notes
4. **Close the run** — locks orders, prevents further changes (initiator only)
5. **Save menus as templates** — persist a run's menu for reuse
6. **Manage templates** — separate screen for CRUD on menu templates with JSON import

There is also a separate `ManageMenusComponent` at `/fun/manage-menus` for template management.

### 1.2 Data Model (Current)

```
CoffeeRun
├── Id (Guid, PK)
├── InitiatorId (Guid, FK → TeamMember)
├── Status (Open | Closed)
├── CreatedAt (DateTimeOffset)
├── ClosedAt (DateTimeOffset?)
├── MenuItems[] → CoffeeRunMenuItem
│   ├── Id, CoffeeRunId, Name (100), Price (decimal 10,2, required)
│   └── OrderItems[] → CoffeeRunOrderItem
│       ├── Id, CoffeeRunOrderId, CoffeeRunMenuItemId, Quantity
└── Orders[] → CoffeeRunOrder
    ├── Id, CoffeeRunId, TeamMemberId (FK → TeamMember), Notes (500), CreatedAt
    └── Items[] → CoffeeRunOrderItem (join table)

CoffeeRunMenuTemplate
├── Id, Name, CreatedByMemberId (FK → TeamMember), CreatedAt
└── Items[] → CoffeeRunMenuTemplateItem
    └── Id, TemplateId, Name (150), Price (decimal?, nullable)
```

**Key constraints:**
- One order per person per run: `UNIQUE(CoffeeRunId, TeamMemberId)`
- Menu items cannot be deleted if they have order items
- Only the initiator can manage menu items and close the run
- Template operations check `CreatedByMemberId` (no admin override)

### 1.3 API Surface (Current)

All endpoints live under a single controller at two route prefixes:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/coffee-runs` | List all runs (no pagination) |
| POST | `/api/v1/coffee-runs` | Create run (from template or copy menu) |
| GET | `/api/v1/coffee-runs/{id}` | Get run detail (full payload) |
| DELETE | `/api/v1/coffee-runs/{id}` | Delete run |
| POST | `/api/v1/coffee-runs/{id}/close` | Close run |
| POST | `/api/v1/coffee-runs/{id}/menu-items` | Add menu item |
| PUT | `/api/v1/coffee-runs/{id}/menu-items/{itemId}` | Update menu item |
| DELETE | `/api/v1/coffee-runs/{id}/menu-items/{itemId}` | Delete menu item |
| POST | `/api/v1/coffee-runs/{id}/orders` | Create order |
| PUT | `/api/v1/coffee-runs/{id}/orders/{orderId}` | Update order |
| DELETE | `/api/v1/coffee-runs/{id}/orders/{orderId}` | Delete order |
| GET | `/api/v1/coffee-run-menu-templates` | List templates |
| GET | `/api/v1/coffee-run-menu-templates/{id}` | Get template detail |
| POST | `/api/v1/coffee-run-menu-templates` | Create template |
| POST | `/api/v1/coffee-run-menu-templates/import` | Import from JSON |
| PUT | `/api/v1/coffee-run-menu-templates/{id}` | Update template |
| DELETE | `/api/v1/coffee-run-menu-templates/{id}` | Delete template |
| POST | `/api/v1/coffee-run-menu-templates/{id}/items` | Add template item |
| PUT | `/api/v1/coffee-run-menu-templates/{id}/items/{itemId}` | Update template item |
| DELETE | `/api/v1/coffee-run-menu-templates/{id}/items/{itemId}` | Delete template item |

### 1.4 Current Flow

```
Initiator:  Start Run → Add Menu Items → (wait for orders) → Close Run → Save as Template
Orderer:    View Run → Select Quantities → Place Order → (wait for close)
```

The UI loads all runs on init, then loads full detail for the selected run. Every mutation (add item, place order, etc.) returns the complete `CoffeeRunDetailDto` which the component replaces in its signal.

---

## 2. Problems & Pain Points

### 2.1 UX Issues

| # | Problem | Impact |
|---|---------|--------|
| UX-1 | **No real-time updates** — users must manually refresh or navigate away and back to see new orders | Initiator doesn't know when orders come in; orderers don't see others' orders |
| UX-2 | **No notifications** — no signal when a run starts, an order is placed, or a run closes | People miss runs entirely; initiators don't know when to close |
| UX-3 | **No ordering deadline** — runs stay open indefinitely until manually closed | Runs linger forever; no urgency for orderers |
| UX-4 | **No run summary for initiator** — no total amount to collect, no per-person breakdown | Initiator must manually calculate totals when collecting money |
| UX-5 | **No "out of stock" or item availability** — menu items are always available | Can't handle limited-quantity items (e.g., "only 3 muffins left") |
| UX-6 | **No categories or grouping** — flat list of menu items | Hard to browse larger menus |
| UX-7 | **Inline editing with raw inputs** — no validation feedback, no cancel on escape | Error-prone, poor UX |
| UX-8 | **`prompt()` for template name** — uses browser native prompt for "Save as Template" | Inconsistent with the rest of the UI, ugly |
| UX-9 | **No run search or filtering** — all runs shown in one list | Hard to find old runs |
| UX-10 | **Currency hardcoded as Rand (R)** — not configurable | Won't work for teams in other regions |

### 2.2 Technical Issues

| # | Problem | Impact |
|---|---------|--------|
| T-1 | **Every mutation returns full detail DTO** — `AddMenuItemAsync`, `CreateOrderAsync`, `UpdateOrderAsync`, etc. all call `BuildDetailDto()` which does 5+ includes | Wasteful bandwidth, slow responses, unnecessary DB load |
| T-2 | **No pagination on list endpoint** — `GetAllAsync` loads every run ever created | Will degrade as history grows |
| T-3 | **Two resource domains in one controller** — Coffee Runs and Menu Templates share `CoffeeRunsController` | Violates SRP, confusing routing (hardcoded absolute paths for templates) |
| T-4 | **Price mutation after order** — `CoffeeRunOrderItem` references `CoffeeRunMenuItem` by FK; the DTO recalculates `LineTotal` as `i.MenuItem.Price * i.Quantity` at read time | If initiator changes a price after orders exist, displayed totals change retroactively |
| T-5 | **No optimistic concurrency** — no row version or etag on any entity | Concurrent edits silently overwrite each other |
| T-6 | **Template ownership is rigid** — only `CreatedByMemberId` can delete; no admin/team-lead override | Orphaned templates if creator leaves |
| T-7 | **`CreateMenuTemplateRequest.CopyFromRunId` is non-nullable but not validated** — the DTO has `Guid` (not `Guid?`) but the service handles empty Guid | Can create empty templates accidentally |
| T-8 | **No soft delete** — runs and templates are hard-deleted | No audit trail, no recovery |
| T-9 | **No indexing on `CreatedAt`** — ordering by `CreatedAt` without an index | Slow list queries as data grows |
| T-10 | **Angular component is 370 lines of TS + 326 lines of HTML** — all logic in one component | Hard to test, hard to maintain, no separation of concerns |

### 2.3 Conceptual Issues

| # | Problem | Impact |
|---|---------|--------|
| C-1 | **"Menu" is conflated** — run-level menu items and template menu items are separate entities with different rules (required vs optional price), but the UI treats them as the same concept | Confusing mental model; price behavior differs between contexts |
| C-2 | **No concept of a "Run Session"** — a run is just a bag of menu items and orders, with no lifecycle states beyond Open/Closed | Can't express "menu building phase", "ordering phase", "fulfillment phase" |
| C-3 | **Templates are personal, not shared** — no concept of "team menus" or "public menus" | Every team recreates the same "Office Cafe" menu |
| C-4 | **No run metadata** — no description, no location, no expected pickup time | Initiator can't communicate context |
| C-5 | **No order status** — orders are just placed; no "confirmed", "picked up", "delivered" states | Can't track fulfillment |

---

## 3. Proposed Architecture

### 3.1 Guiding Principles

1. **Separate concerns** — Runs, Menus, and Templates are distinct domains with distinct APIs
2. **Price immutability** — snapshot prices at order time; menu price changes never affect existing orders
3. **Real-time by default** — SignalR for live updates; REST for mutations
4. **Lifecycle-aware** — runs have meaningful phases, not just Open/Closed
5. **Shared menus** — templates become team-level resources with ownership and permissions
6. **Lean payloads** — list endpoints return summaries; detail endpoints return full data; mutations return minimal confirmations

### 3.2 Revised Data Model

```
CoffeeRun
├── Id (Guid, PK)
├── InitiatorId (Guid, FK → TeamMember)
├── Status (Draft | Open | Closing | Closed | Cancelled)
├── Title (string, 200) — optional, e.g., "Monday morning run"
├── Description (string, 1000) — optional
├── Location (string, 200) — where to pick up
├── OrderDeadline (DateTimeOffset?) — auto-close time
├── CreatedAt (DateTimeOffset)
├── ClosedAt (DateTimeOffset?)
├── CancelledAt (DateTimeOffset?)
└── MenuItems[] → CoffeeRunMenuItem

CoffeeRunMenuItem
├── Id (Guid, PK)
├── CoffeeRunId (Guid, FK)
├── Name (string, 150)
├── Price (decimal 10,2)
├── Category (string, 50, nullable) — e.g., "Coffee", "Food", "Cold Drinks"
├── MaxQuantity (int, nullable) — stock limit
├── IsAvailable (bool, default true) — toggle availability
├── SortOrder (int, default 0)
└── OrderItems[] → CoffeeRunOrderItem

CoffeeRunOrder
├── Id (Guid, PK)
├── CoffeeRunId (Guid, FK)
├── TeamMemberId (Guid, FK → TeamMember)
├── Status (Placed | Confirmed | PickedUp) — NEW
├── Notes (string, 500)
├── TotalAmount (decimal 10,2) — snapshot at order time
├── CreatedAt (DateTimeOffset)
├── UpdatedAt (DateTimeOffset)
└── Items[] → CoffeeRunOrderItem

CoffeeRunOrderItem
├── Id (Guid, PK)
├── CoffeeRunOrderId (Guid, FK)
├── CoffeeRunMenuItemId (Guid, FK)
├── Quantity (int)
├── UnitPrice (decimal 10,2) — SNAPSHOT of price at order time
├── LineTotal (decimal 10,2) — computed: UnitPrice × Quantity

MenuTemplate  (renamed from CoffeeRunMenuTemplate)
├── Id (Guid, PK)
├── Name (string, 200)
├── CreatedByMemberId (Guid, FK → TeamMember)
├── Scope (Personal | Team) — NEW: team-wide shared menus
├── IsArchived (bool, default false) — soft delete
├── CreatedAt (DateTimeOffset)
├── UpdatedAt (DateTimeOffset)
└── Items[] → MenuTemplateItem

MenuTemplateItem
├── Id (Guid, PK)
├── TemplateId (Guid, FK)
├── Name (string, 150)
├── Price (decimal?, nullable) — suggested price, not enforced
├── Category (string, 50, nullable)
└── SortOrder (int, default 0)
```

**Key changes from current model:**

| Change | Rationale |
|--------|-----------|
| `UnitPrice` snapshot on `CoffeeRunOrderItem` | Prevents retroactive total changes when menu prices change |
| `TotalAmount` on `CoffeeRunOrder` | Pre-computed snapshot; no recalculation needed |
| `Status` expanded to 5 states | Supports real workflow: Draft → Open → Closing → Closed |
| `OrderDeadline` on `CoffeeRunRun` | Enables auto-close; creates urgency |
| `Category` on menu items | Enables grouping in the UI |
| `MaxQuantity` + `IsAvailable` on menu items | Supports limited stock and temporary unavailability |
| `Scope` on templates | Enables team-shared menus |
| `IsArchived` on templates | Soft delete for audit/recovery |
| `Title`, `Description`, `Location` on runs | Provides context for orderers |
| `SortOrder` on items | Explicit ordering, not just creation-time |

### 3.3 Run Lifecycle

```
                    ┌─────────┐
                    │  Draft  │ ← Initiator builds menu, no orders yet
                    └────┬────┘
                         │ Publish
                         ▼
                    ┌─────────┐
              ┌─────│  Open   │ ← Team members place orders
              │     └────┬────┘
              │          │ Deadline reached OR Initiator triggers
              │          ▼
              │     ┌──────────┐
              │     │ Closing  │ ← Brief grace period (5 min) for last-minute orders
              │     └────┬─────┘
              │          │ Auto or manual
              │          ▼
              │     ┌─────────┐
              │     │ Closed  │ ← Orders locked, initiator sees summary
              │     └─────────┘
              │
              │ (any state before Closed)
              ▼
         ┌───────────┐
         │ Cancelled │ ← Run voided, orders deleted
         └───────────┘
```

### 3.4 Revised Feature Set

#### Core Features (Must Have)
- Start a run with title, optional deadline, optional menu template
- Build menu with categories, prices, sort order
- Place/edit/delete orders (one per person per run)
- Close run (manual or automatic via deadline)
- Run summary for initiator: total to collect, per-person breakdown, item totals
- Real-time updates via SignalR: new order, order edited, run closed
- Menu templates with Personal/Team scope
- JSON import for templates

#### Enhanced Features (Should Have)
- Item categories with collapsible groups
- Stock limits (`MaxQuantity`) with live remaining count
- Item availability toggle (`IsAvailable`)
- Order status tracking (Placed → Confirmed → PickedUp)
- Run search and filtering (by status, initiator, date range)
- Pagination on run list
- Soft delete for templates (archive)
- Team-lead admin override for template deletion

#### Future Features (Nice to Have)
- Run cancellation with notification
- Favorite/recent menus quick-start
- Order history per member
- Run analytics (avg orders per run, popular items)
- Mobile push notifications
- Split payment tracking
- Recurring runs ("every Monday at 10am")

### 3.5 Component Architecture (Angular)

```
features/coffee-run/
├── coffee-run.routes.ts              — Route definitions
├── coffee-run-shell.component.ts     — Shell with router-outlet
│
├── run-list/
│   ├── run-list.component.ts         — Paginated list with filters
│   └── run-list.component.html
│
├── run-detail/
│   ├── run-detail.component.ts       — Main detail view
│   ├── run-detail.component.html
│   ├── menu-section/
│   │   ├── menu-section.component.ts       — Menu display + editing (initiator)
│   │   └── menu-section.component.html
│   ├── order-section/
│   │   ├── order-section.component.ts      — Order placement + editing
│   │   └── order-section.component.html
│   ├── orders-list/
│   │   ├── orders-list.component.ts        — All orders display
│   │   └── orders-list.component.html
│   └── run-summary/
│       ├── run-summary.component.ts        — Initiator-only summary
│       └── run-summary.component.html
│
├── manage-menus/
│   ├── manage-menus.component.ts     — Template list
│   ├── manage-menus.component.html
│   ├── template-editor/
│   │   ├── template-editor.component.ts    — Template detail + item CRUD
│   │   └── template-editor.component.html
│   └── template-import-dialog/
│       ├── template-import-dialog.component.ts
│       └── template-import-dialog.component.html
│
└── shared/
    ├── quantity-stepper/
    │   ├── quantity-stepper.component.ts   — Reusable +/- stepper
    │   └── quantity-stepper.component.html
    └── save-template-dialog/
        ├── save-template-dialog.component.ts
        └── save-template-dialog.component.html
```

**Key changes:**
- Single monolithic component → 10+ focused components
- Dialogs instead of `prompt()` for template naming
- Reusable `QuantityStepperComponent`
- Dedicated `RunSummaryComponent` for initiator totals

### 3.6 Real-Time Architecture

```
┌─────────────┐     SignalR      ┌──────────────┐
│   Browser   │◄────────────────►│  Hub Server  │
│  (Angular)  │   Hub: coffee    │  (.NET 8)    │
└─────────────┘                  └──────┬───────┘
                                        │
                              REST API  │
                                        ▼
                                 ┌──────────────┐
                                 │  App Service │
                                 │  (EF Core)   │
                                 └──────────────┘
```

**SignalR Hub: `CoffeeHub`**

| Event | Payload | Triggered By |
|-------|---------|-------------|
| `RunCreated` | `{ runId, initiatorName, title }` | POST /runs |
| `RunStatusChanged` | `{ runId, oldStatus, newStatus }` | Close, Cancel |
| `OrderPlaced` | `{ runId, orderId, memberName, total }` | POST /orders |
| `OrderUpdated` | `{ runId, orderId, memberName, total }` | PUT /orders |
| `OrderDeleted` | `{ runId, orderId, memberName }` | DELETE /orders |
| `MenuUpdated` | `{ runId }` | Add/Edit/Delete menu item |
| `ItemAvailabilityChanged` | `{ runId, itemId, isAvailable, remaining }` | Toggle availability |

Clients subscribe to a run-specific group: `CoffeeHub.JoinRun(runId)`.

### 3.7 API Surface (Proposed)

#### Runs API — `/api/v1/coffee-runs`

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/coffee-runs` | `?status=&initiatorId=&from=&to=&page=&pageSize=` | `PagedResult<RunSummary>` | Paginated, filterable |
| POST | `/coffee-runs` | `CreateRunRequest` | `RunSummary` (201) | Create run |
| GET | `/coffee-runs/{id}` | — | `RunDetail` | Full detail |
| PATCH | `/coffee-runs/{id}` | `UpdateRunRequest` | `RunSummary` | Update title, deadline, location |
| POST | `/coffee-runs/{id}/publish` | — | `RunSummary` | Draft → Open |
| POST | `/coffee-runs/{id}/close` | — | `RunSummary` | Open → Closed |
| POST | `/coffee-runs/{id}/cancel` | — | `RunSummary` | Any → Cancelled |
| DELETE | `/coffee-runs/{id}` | — | 204 | Hard delete (initiator/team-lead only) |
| GET | `/coffee-runs/{id}/summary` | — | `RunSummaryDetail` | Initiator-only: totals breakdown |

#### Menu Items API — `/api/v1/coffee-runs/{runId}/menu-items`

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/menu-items` | `CreateMenuItemRequest` | `MenuItemDto` (201) | Initiator only |
| PUT | `/menu-items/{itemId}` | `UpdateMenuItemRequest` | `MenuItemDto` | Initiator only |
| DELETE | `/menu-items/{itemId}` | — | 204 | Initiator only; 409 if ordered |
| PATCH | `/menu-items/{itemId}/availability` | `{ isAvailable: bool }` | `MenuItemDto` | Toggle availability |
| PUT | `/menu-items/reorder` | `[{ itemId, sortOrder }]` | 204 | Batch reorder |

#### Orders API — `/api/v1/coffee-runs/{runId}/orders`

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/orders` | `CreateOrderRequest` | `OrderDto` (201) | One per member per run |
| PUT | `/orders/{orderId}` | `UpdateOrderRequest` | `OrderDto` | Own orders only |
| DELETE | `/orders/{orderId}` | — | 204 | Own orders only |
| PATCH | `/orders/{orderId}/status` | `{ status: 'Confirmed' \| 'PickedUp' }` | `OrderDto` | Initiator only |

#### Templates API — `/api/v1/menu-templates` (separate controller)

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/menu-templates` | `?scope=&page=&pageSize=` | `PagedResult<TemplateSummary>` | Personal + Team scopes |
| POST | `/menu-templates` | `CreateTemplateRequest` | `TemplateDetail` (201) | From scratch or copy |
| POST | `/menu-templates/import` | `ImportTemplateRequest` | `TemplateDetail` (201) | JSON import |
| GET | `/menu-templates/{id}` | — | `TemplateDetail` | Full detail |
| PUT | `/menu-templates/{id}` | `UpdateTemplateRequest` | `TemplateDetail` | Owner or team-lead |
| DELETE | `/api/v1/menu-templates/{id}` | — | 204 | Soft delete (archive) |
| POST | `/menu-templates/{id}/items` | `CreateTemplateItemRequest` | `TemplateItemDto` (201) | Owner only |
| PUT | `/menu-templates/{id}/items/{itemId}` | `UpdateTemplateItemRequest` | `TemplateItemDto` | Owner only |
| DELETE | `/menu-templates/{id}/items/{itemId}` | — | 204 | Owner only |
| PUT | `/menu-templates/{id}/items/reorder` | `[{ itemId, sortOrder }]` | 204 | Batch reorder |

#### SignalR Hub — `/coffeeHub`

| Method | Purpose |
|--------|---------|
| `JoinRun(runId)` | Subscribe to run-specific events |
| `LeaveRun(runId)` | Unsubscribe |

### 3.8 DTO Definitions (Proposed)

```csharp
// ── Run DTOs ──────────────────────────────────────

public record RunSummary(
    Guid Id,
    string InitiatorName,
    string Title,
    string Status,          // Draft | Open | Closing | Closed | Cancelled
    int MenuItemCount,
    int OrderCount,
    decimal TotalAmount,    // sum of all order totals
    DateTimeOffset CreatedAt,
    DateTimeOffset? OrderDeadline,
    DateTimeOffset? ClosedAt
);

public record RunDetail(
    Guid Id,
    Guid InitiatorId,
    string InitiatorName,
    string Title,
    string? Description,
    string? Location,
    string Status,
    Guid? CurrentUserOrderId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? OrderDeadline,
    DateTimeOffset? ClosedAt,
    List<MenuItemDto> MenuItems,
    List<OrderDto> Orders
);

public record RunSummaryDetail(
    Guid RunId,
    decimal GrandTotal,
    int TotalItems,
    List<PersonSummary> People,
    List<ItemSummary> Items
);

public record PersonSummary(
    Guid MemberId,
    string MemberName,
    decimal Total,
    int ItemCount
);

public record ItemSummary(
    string Name,
    string? Category,
    int TotalQuantity,
    decimal TotalAmount
);

// ── Menu Item DTOs ────────────────────────────────

public record MenuItemDto(
    Guid Id,
    string Name,
    decimal Price,
    string? Category,
    int? MaxQuantity,
    int? RemainingQuantity,  // computed: MaxQuantity - sum(orders)
    bool IsAvailable,
    int SortOrder
);

// ── Order DTOs ────────────────────────────────────

public record OrderDto(
    Guid Id,
    Guid TeamMemberId,
    string TeamMemberName,
    string Status,          // Placed | Confirmed | PickedUp
    string? Notes,
    decimal TotalAmount,    // snapshot
    DateTimeOffset CreatedAt,
    List<OrderItemDto> Items
);

public record OrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string MenuItemName,
    decimal UnitPrice,      // snapshot at order time
    int Quantity,
    decimal LineTotal
);

// ── Request DTOs ──────────────────────────────────

public record CreateRunRequest(
    string? Title,
    string? Description,
    string? Location,
    DateTimeOffset? OrderDeadline,
    Guid? TemplateId,
    Guid? CopyMenuFromRunId
);

public record UpdateRunRequest(
    string? Title,
    string? Description,
    string? Location,
    DateTimeOffset? OrderDeadline
);

public record CreateMenuItemRequest(
    string Name,            // max 150
    decimal Price,
    string? Category,       // max 50
    int? MaxQuantity,
    int SortOrder
);

public record UpdateMenuItemRequest(
    string? Name,
    decimal? Price,
    string? Category,
    int? MaxQuantity,
    bool? IsAvailable,
    int? SortOrder
);

public record CreateOrderRequest(
    string? Notes,          // max 500
    List<OrderItemEntry> Items
);

public record OrderItemEntry(
    Guid MenuItemId,
    int Quantity            // 1-99
);

public record UpdateOrderRequest(
    string? Notes,
    List<OrderItemEntry>? Items
);

// ── Template DTOs ─────────────────────────────────

public record TemplateSummary(
    Guid Id,
    string Name,
    string Scope,           // Personal | Team
    int ItemCount,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    bool IsArchived
);

public record TemplateDetail(
    Guid Id,
    string Name,
    string Scope,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    List<TemplateItemDto> Items
);

public record TemplateItemDto(
    Guid Id,
    string Name,
    decimal? Price,
    string? Category,
    int SortOrder
);

public record CreateTemplateRequest(
    string Name,
    string Scope = "Personal",
    Guid? CopyFromRunId,
    Guid? CopyFromTemplateId
);

// ── Pagination ────────────────────────────────────

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
```

### 3.9 Service Layer Architecture

```
Application/Services/
├── CoffeeRunService.cs          — Run lifecycle, orchestration
├── MenuTemplateService.cs       — Template CRUD (separate from runs)
├── OrderService.cs              — Order placement, validation, totals
└── MenuService.cs               — Menu item management within runs

Application/DTOs/
├── CoffeeRuns/                  — Run-related DTOs
├── MenuTemplates/               — Template DTOs
└── Shared/                      — PagedResult, common types

Domain/Entities/                 — As defined in 3.2
Domain/Enums/
├── CoffeeRunStatus.cs           — Draft, Open, Closing, Closed, Cancelled
└── OrderStatus.cs               — Placed, Confirmed, PickedUp

Hubs/
└── CoffeeHub.cs                 — SignalR hub for real-time events

BackgroundServices/
└── RunDeadlineWorker.cs         — Hosted service that polls for expired deadlines
```

**Key separation:** Menu templates move to their own service and controller. The `CoffeeRunService` focuses on run lifecycle and orchestration, delegating to `OrderService` and `MenuService` for sub-operations.

### 3.10 Price Snapshot Strategy

The most critical data integrity fix: **prices must be immutable once ordered**.

```
Order placement flow:
1. Client sends: { menuItemId, quantity }
2. Server looks up current MenuItem.Price
3. Server creates OrderItem with UnitPrice = MenuItem.Price (snapshot)
4. Server computes LineTotal = UnitPrice × Quantity
5. Server computes Order.TotalAmount = sum(LineTotals)
6. These values are persisted and NEVER recalculated

Display flow:
- Order detail reads UnitPrice, LineTotal, TotalAmount directly from stored values
- Menu detail reads current Price from MenuItem (may differ from snapshot)
```

This ensures that if an initiator changes a Latte from R45 to R50 after orders exist, existing orders still show R45.

---

## 4. Phase Recommendations

### Phase 1: Foundation (Week 1-2)

**Goal:** Fix data model, separate APIs, add price snapshots.

- [ ] Add `UnitPrice` and `LineTotal` to `CoffeeRunOrderItem` entity
- [ ] Add `TotalAmount` to `CoffeeRunOrder` entity
- [ ] Add migration to snapshot prices for existing orders (use current MenuItem.Price)
- [ ] Split `CoffeeRunsController` into `CoffeeRunsController` + `MenuTemplatesController`
- [ ] Move template endpoints to `/api/v1/menu-templates`
- [ ] Update Angular service to use new template base URL
- [ ] Add `PagedResult<T>` and pagination to `GET /coffee-runs`
- [ ] Add index on `CoffeeRun.CreatedAt`

**Risk:** Low. Purely additive changes to data model; existing functionality preserved.

### Phase 2: Lifecycle & Metadata (Week 2-3)

**Goal:** Add run states, metadata, and deadline support.

- [ ] Add `Title`, `Description`, `Location`, `OrderDeadline` to `CoffeeRun`
- [ ] Add `Draft` and `Closing` states to `CoffeeRunStatus`
- [ ] Add `UpdateRunRequest` and PATCH endpoint
- [ ] Add `Publish` endpoint (Draft → Open)
- [ ] Add `RunDeadlineWorker` hosted service for auto-close
- [ ] Update Angular UI to show title, deadline countdown, location
- [ ] Add deadline input when starting a run

**Risk:** Medium. State transitions need careful validation.

### Phase 3: Real-Time (Week 3-4)

**Goal:** SignalR integration for live updates.

- [ ] Add SignalR package and `CoffeeHub`
- [ ] Wire up hub events from service layer
- [ ] Add Angular SignalR client service
- [ ] Update components to subscribe to run groups
- [ ] Remove manual refresh patterns

**Risk:** Medium. Requires infrastructure setup and client-side state management changes.

### Phase 4: Enhanced Menu & Summary (Week 4-5)

**Goal:** Categories, stock limits, initiator summary.

- [ ] Add `Category`, `MaxQuantity`, `IsAvailable`, `SortOrder` to menu items
- [ ] Add availability toggle endpoint
- [ ] Add `GET /coffee-runs/{id}/summary` endpoint with totals breakdown
- [ ] Add `RunSummaryComponent` to Angular
- [ ] Add category grouping in menu display
- [ ] Add remaining quantity display

**Risk:** Low. Additive features.

### Phase 5: Template Enhancements & Polish (Week 5-6)

**Goal:** Team-scoped templates, soft delete, component refactor.

- [ ] Add `Scope` and `IsArchived` to `MenuTemplate`
- [ ] Add team-lead override for template deletion
- [ ] Replace `prompt()` with `SaveTemplateDialogComponent`
- [ ] Break `CoffeeRunComponent` into sub-components
- [ ] Add `QuantityStepperComponent`
- [ ] Add run search and filtering
- [ ] Add order status tracking (optional)

**Risk:** Medium. Component refactoring is significant but isolated to UI.

---

## 5. API Surface — Complete Proposed Endpoints

### 5.1 Runs

```
GET     /api/v1/coffee-runs                              → PagedResult<RunSummary>
POST    /api/v1/coffee-runs                              → RunSummary (201)
GET     /api/v1/coffee-runs/{id}                         → RunDetail
PATCH   /api/v1/coffee-runs/{id}                         → RunSummary
POST    /api/v1/coffee-runs/{id}/publish                 → RunSummary
POST    /api/v1/coffee-runs/{id}/close                   → RunSummary
POST    /api/v1/coffee-runs/{id}/cancel                  → RunSummary
DELETE  /api/v1/coffee-runs/{id}                         → 204
GET     /api/v1/coffee-runs/{id}/summary                 → RunSummaryDetail
```

### 5.2 Menu Items (nested under run)

```
POST    /api/v1/coffee-runs/{runId}/menu-items           → MenuItemDto (201)
PUT     /api/v1/coffee-runs/{runId}/menu-items/{itemId}  → MenuItemDto
DELETE  /api/v1/coffee-runs/{runId}/menu-items/{itemId}  → 204
PATCH   /api/v1/coffee-runs/{runId}/menu-items/{itemId}/availability → MenuItemDto
PUT     /api/v1/coffee-runs/{runId}/menu-items/reorder   → 204
```

### 5.3 Orders (nested under run)

```
POST    /api/v1/coffee-runs/{runId}/orders               → OrderDto (201)
PUT     /api/v1/coffee-runs/{runId}/orders/{orderId}     → OrderDto
DELETE  /api/v1/coffee-runs/{runId}/orders/{orderId}     → 204
PATCH   /api/v1/coffee-runs/{runId}/orders/{orderId}/status → OrderDto
```

### 5.4 Menu Templates (standalone resource)

```
GET     /api/v1/menu-templates                           → PagedResult<TemplateSummary>
POST    /api/v1/menu-templates                           → TemplateDetail (201)
POST    /api/v1/menu-templates/import                    → TemplateDetail (201)
GET     /api/v1/menu-templates/{id}                      → TemplateDetail
PUT     /api/v1/menu-templates/{id}                      → TemplateDetail
DELETE  /api/v1/menu-templates/{id}                      → 204
POST    /api/v1/menu-templates/{id}/items                → TemplateItemDto (201)
PUT     /api/v1/menu-templates/{id}/items/{itemId}       → TemplateItemDto
DELETE  /api/v1/menu-templates/{id}/items/{itemId}       → 204
PUT     /api/v1/menu-templates/{id}/items/reorder        → 204
```

### 5.5 SignalR

```
Hub:    /coffeeHub
Methods: JoinRun(runId), LeaveRun(runId)
Events:  RunCreated, RunStatusChanged, OrderPlaced, OrderUpdated,
         OrderDeleted, MenuUpdated, ItemAvailabilityChanged
```

---

## 6. Migration Strategy

### 6.1 Database Migration Order

1. **Add columns** (nullable, no breaking changes):
   - `CoffeeRun.Title`, `Description`, `Location`, `OrderDeadline`
   - `CoffeeRunMenuItem.Category`, `MaxQuantity`, `IsAvailable`, `SortOrder`
   - `CoffeeRunOrderItem.UnitPrice`, `LineTotal`
   - `CoffeeRunOrder.TotalAmount`, `Status`, `UpdatedAt`
   - `CoffeeRunMenuTemplate.Scope`, `IsArchived`, `UpdatedAt`
   - `CoffeeRunMenuTemplateItem.Category`, `SortOrder`

2. **Backfill data**:
   - Set `UnitPrice` = `MenuItem.Price` for all existing order items
   - Set `LineTotal` = `UnitPrice × Quantity` for all existing order items
   - Set `TotalAmount` = sum of `LineTotal` for all existing orders
   - Set `IsAvailable` = true for all existing menu items
   - Set `Scope` = 'Personal' for all existing templates

3. **Make columns non-nullable** where appropriate

4. **Add indexes**:
   - `IX_CoffeeRun_CreatedAt`
   - `IX_CoffeeRun_Status`
   - `IX_CoffeeRun_InitiatorId`

### 6.2 API Migration

- Keep old endpoints working during transition (versioning or feature flags)
- New Angular components use new endpoints; old component uses old endpoints
- Swap over when new components are ready

### 6.3 Rollback Plan

- All new columns are nullable initially
- Old API endpoints remain functional
- Feature flag controls new UI components

---

## 7. Open Questions

1. **Should runs auto-delete after N days?** — Currently runs persist forever. Consider auto-archiving closed runs older than 30 days.

2. **Should template scope (Personal/Team) be configurable per template, or is it a global setting?** — Proposing per-template for flexibility.

3. **What happens to orders when a run is cancelled?** — Proposing soft-delete with notification, but could also hard-delete.

4. **Should there be a "reorder" feature for repeat orders?** — "Same as last time" button. Out of scope for v1.

5. **Should the SignalR hub be separate or co-located with the API?** — Co-located is simpler; separate is more scalable. Recommend co-located for now.

---

## 8. Summary of Key Decisions

| Decision | Current | Proposed | Why |
|----------|---------|----------|-----|
| Price handling | Recalculated at read time | Snapshot at order time | Data integrity |
| Run states | Open, Closed | Draft, Open, Closing, Closed, Cancelled | Real workflow |
| Templates | Personal only | Personal + Team scope | Team collaboration |
| API structure | One controller, two routes | Two controllers, clean routes | Separation of concerns |
| Real-time | None | SignalR | User experience |
| Payloads | Full detail on every mutation | Minimal on mutation, detail on GET | Performance |
| List endpoint | Unbounded | Paginated | Scalability |
| Menu items | Flat list | Categorized, sortable, with availability | Better UX |
| Template deletion | Hard delete, owner only | Soft delete, team-lead override | Data safety |
| Component structure | Single 370-line component | 10+ focused components | Maintainability |
