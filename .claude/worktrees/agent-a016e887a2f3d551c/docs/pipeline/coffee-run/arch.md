
# Coffee Run — Architecture Document

## 1. Overview

The Coffee Run feature adds a new tab to Fun Hub that lets a team member start a
"coffee run" — a virtual trip to a café. The initiator defines a menu of
drink/food items with prices, then team members place their orders by selecting
items and quantities from that menu. The initiator can view all orders summarised
and close the run when ordering is done.

The feature follows the existing Fun Hub stack: domain entities → EF Core
configurations → service + interface → DTOs → ControllerBase → Angular service →
lazy-loaded component, with the tab wired into `FunHubComponent` and routes
registered in `fun.routes.ts`.

---

## 2. Domain Model

### 2.1 Entities

#### CoffeeRun

| Field       | Type             | Notes                                          |
|-------------|------------------|------------------------------------------------|
| Id          | Guid             | PK, gen_random_uuid()                          |
| InitiatorId | Guid             | FK → TeamMember                                |
| Status      | CoffeeRunStatus  | Enum: Open, Closed                             |
| CreatedAt   | DateTimeOffset   | UTC creation timestamp                         |
| ClosedAt    | DateTimeOffset?  | Nullable; set when closed                      |

Navigation: `Initiator` (TeamMember), `MenuItems` (ICollection<CoffeeRunMenuItem>), `Orders` (ICollection<CoffeeRunOrder>)

#### CoffeeRunMenuItem

| Field       | Type    | Notes                              |
|-------------|---------|------------------------------------|
| Id          | Guid    | PK, gen_random_uuid()              |
| CoffeeRunId | Guid    | FK → CoffeeRun                     |
| Name        | string  | Required, max 150                  |
| Price       | decimal | Precision 18,2 (default 0)         |

Navigation: `CoffeeRun` (CoffeeRun), `OrderItems` (ICollection<CoffeeRunOrderItem>)

#### CoffeeRunOrder

| Field        | Type             | Notes                                   |
|--------------|------------------|-----------------------------------------|
| Id           | Guid             | PK, gen_random_uuid()                   |
| CoffeeRunId  | Guid             | FK → CoffeeRun                          |
| TeamMemberId | Guid             | FK → TeamMember (who placed the order)  |
| Notes        | string?          | Optional, max 500                       |
| CreatedAt    | DateTimeOffset   | UTC creation timestamp                  |

Navigation: `CoffeeRun` (CoffeeRun), `TeamMember` (TeamMember), `Items` (ICollection<CoffeeRunOrderItem>)

#### CoffeeRunOrderItem

| Field                | Type  | Notes                    |
|----------------------|-------|--------------------------|
| Id                   | Guid  | PK, gen_random_uuid()    |
| CoffeeRunOrderId     | Guid  | FK → CoffeeRunOrder      |
| CoffeeRunMenuItemId  | Guid  | FK → CoffeeRunMenuItem   |
| Quantity             | int   | Default 1                |

Navigation: `CoffeeRunOrder` (CoffeeRunOrder), `CoffeeRunMenuItem` (CoffeeRunMenuItem)

#### CoffeeRunStatus (enum)

- `Open`   — accepting orders
- `Closed` — orders finalized, no further changes

### 2.2 Relationships

```
TeamMember (1) ──< CoffeeRun (Initiator)
CoffeeRun    (1) ──< CoffeeRunMenuItem
CoffeeRun    (1) ──< CoffeeRunOrder
TeamMember   (1) ──< CoffeeRunOrder
CoffeeRunOrder (1) ──< CoffeeRunOrderItem
CoffeeRunMenuItem (1) ──< CoffeeRunOrderItem
```

### 2.3 DB Schema Sketch

```sql
CREATE TYPE coffee_run_status AS ENUM ('Open', 'Closed');

CREATE TABLE coffee_runs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    status       coffee_run_status NOT NULL DEFAULT 'Open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at    TIMESTAMPTZ
);

CREATE TABLE coffee_run_menu_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coffee_run_id UUID NOT NULL REFERENCES coffee_runs(id) ON DELETE CASCADE,
    name          VARCHAR(150) NOT NULL,
    price         DECIMAL(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE coffee_run_orders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coffee_run_id  UUID NOT NULL REFERENCES coffee_runs(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    notes          VARCHAR(500),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(coffee_run_id, team_member_id)
);

CREATE TABLE coffee_run_order_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coffee_run_order_id     UUID NOT NULL REFERENCES coffee_run_orders(id) ON DELETE CASCADE,
    coffee_run_menu_item_id UUID NOT NULL REFERENCES coffee_run_menu_items(id) ON DELETE CASCADE,
    quantity                INT NOT NULL DEFAULT 1
);
```

The `UNIQUE(coffee_run_id, team_member_id)` constraint on `coffee_run_orders`
enforces one order per member per run.

---

## 3. API Endpoints

All endpoints are under the `CoffeeRunsController`. Base route: `/api/v1/coffee-runs`.

### 3.1 Coffee Run CRUD

| Method | Path                              | Auth | Body / Notes                                    | Response                    |
|--------|-----------------------------------|------|-------------------------------------------------|-----------------------------|
| GET    | `/api/v1/coffee-runs`             | Any  | Query: `?status=Open` (optional)                | `CoffeeRunListDto[]`        |
| POST   | `/api/v1/coffee-runs`             | Any  | `{}` (empty body — initiator is current user)   | `201` → `CoffeeRunDto`      |
| GET    | `/api/v1/coffee-runs/{id}`        | Any  | Full run with menu, orders, order items         | `CoffeeRunDetailDto`        |
| DELETE | `/api/v1/coffee-runs/{id}`        | TL   | Only initiator or TeamLead can delete           | `204` or `404`              |
| POST   | `/api/v1/coffee-runs/{id}/close`  | Any  | Only initiator can close; `{}`                  | `200` → `CoffeeRunDto`      |

### 3.2 Menu Items

| Method | Path                                                  | Auth | Body                                          | Response                        |
|--------|-------------------------------------------------------|------|-----------------------------------------------|---------------------------------|
| POST   | `/api/v1/coffee-runs/{id}/menu-items`                 | Any  | `CreateMenuItemRequest`                       | `201` → `CoffeeRunMenuItemDto` |
| PUT    | `/api/v1/coffee-runs/{id}/menu-items/{itemId}`        | Any  | `UpdateMenuItemRequest` (initiator only)      | `200` → `CoffeeRunMenuItemDto` |
| DELETE | `/api/v1/coffee-runs/{id}/menu-items/{itemId}`        | Any  | Initiator only; errors if order references it | `204` or `404`                 |

### 3.3 Orders

| Method | Path                                                  | Auth | Body                                     | Response                    |
|--------|-------------------------------------------------------|------|------------------------------------------|-----------------------------|
| POST   | `/api/v1/coffee-runs/{id}/orders`                     | Any  | `CreateOrderRequest`                     | `201` → `CoffeeRunOrderDto` |
| PUT    | `/api/v1/coffee-runs/{id}/orders/{orderId}`           | Any  | `UpdateOrderRequest` (only own order)    | `200` → `CoffeeRunOrderDto` |
| DELETE | `/api/v1/coffee-runs/{id}/orders/{orderId}`           | Any  | Own order or initiator only              | `204` or `404`              |

### 3.4 Request / Response DTOs

```csharp
// ---- Requests ----

public record CreateMenuItemRequest(
    [Required][MaxLength(150)] string Name,
    [Range(0, 99999.99)]      decimal Price
);

public record UpdateMenuItemRequest(
    [MaxLength(150)] string? Name,
    [Range(0, 99999.99)] decimal? Price
);

public record CreateOrderRequest(
    [Required][MinLength(1)] List<OrderItemEntry> Items,
    [MaxLength(500)]         string? Notes
);

public record OrderItemEntry(
    [Required]     Guid MenuItemId,
    [Range(1, 99)] int Quantity
);

public record UpdateOrderRequest(
    List<OrderItemEntry>? Items,
    string?              Notes
);

// ---- Responses ----

public record CoffeeRunListDto(
    Guid Id,
    string InitiatorName,
    string Status,
    int MenuItemCount,
    int OrderCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt
);

public record CoffeeRunDto(
    Guid Id,
    Guid InitiatorId,
    string InitiatorName,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt
);

public record CoffeeRunDetailDto(
    Guid Id,
    Guid InitiatorId,
    string InitiatorName,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt,
    List<CoffeeRunMenuItemDto> MenuItems,
    List<CoffeeRunOrderDto> Orders
);

public record CoffeeRunMenuItemDto(
    Guid Id,
    string Name,
    decimal Price
);

public record CoffeeRunOrderDto(
    Guid Id,
    Guid TeamMemberId,
    string TeamMemberName,
    string? Notes,
    decimal Total,
    List<CoffeeRunOrderItemDto> Items,
    DateTimeOffset CreatedAt
);

public record CoffeeRunOrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string MenuItemName,
    decimal UnitPrice,
    int Quantity,
    decimal Subtotal
);
```

### 3.5 Endpoint Tree

```
CoffeeRunsController                  /api/v1/coffee-runs
  ├─ GET    /                         → CoffeeRunListDto[]
  ├─ POST   /                         → CoffeeRunDto
  ├─ GET    /{id}                     → CoffeeRunDetailDto
  ├─ DELETE /{id}                     → 204
  ├─ POST   /{id}/close               → CoffeeRunDto
  ├─ POST   /{id}/menu-items          → CoffeeRunMenuItemDto
  ├─ PUT    /{id}/menu-items/{itemId} → CoffeeRunMenuItemDto
  ├─ DELETE /{id}/menu-items/{itemId} → 204
  ├─ POST   /{id}/orders              → CoffeeRunOrderDto
  ├─ PUT    /{id}/orders/{orderId}    → CoffeeRunOrderDto
  └─ DELETE /{id}/orders/{orderId}    → 204
```

---

## 4. Backend Architecture

### 4.1 Controllers

**Create:** `src/TeamManager.Api/Presentation/Controllers/CoffeeRunsController.cs`

Follows the pattern in `WheelsController.cs` — a primary constructor-injected
controller with `[ApiController]` and `[Route("api/v1/coffee-runs")]`. Gets the
current user via `GetCurrentMemberId()` (same pattern as
`WinOfTheWeekController.cs`). Includes `[Authorize(Roles = "TeamLead")]` on the
DELETE endpoint for runs.

### 4.2 Services

**Create:** `src/TeamManager.Api/Application/Services/CoffeeRunService.cs`

**Create:** `src/TeamManager.Api/Application/Services/Interfaces/ICoffeeRunService.cs`

`ICoffeeRunService` defines:

- `Task<IReadOnlyList<CoffeeRunListDto>> GetAllAsync(CoffeeRunStatus? statusFilter)`
- `Task<CoffeeRunDetailDto> GetByIdAsync(Guid id)`
- `Task<CoffeeRunDto> CreateAsync(Guid initiatorMemberId)`
- `Task<bool> DeleteAsync(Guid id, Guid requestingMemberId)` — validates initiator-or-lead
- `Task<CoffeeRunDto?> CloseAsync(Guid id, Guid requestingMemberId)` — validates initiator
- `Task<CoffeeRunMenuItemDto> AddMenuItemAsync(Guid coffeeRunId, Guid requestingMemberId, CreateMenuItemRequest req)`
- `Task<CoffeeRunMenuItemDto?> UpdateMenuItemAsync(Guid coffeeRunId, Guid itemId, Guid requestingMemberId, UpdateMenuItemRequest req)`
- `Task<bool> DeleteMenuItemAsync(Guid coffeeRunId, Guid itemId, Guid requestingMemberId)`
- `Task<CoffeeRunOrderDto> PlaceOrderAsync(Guid coffeeRunId, Guid memberId, CreateOrderRequest req)`
- `Task<CoffeeRunOrderDto?> UpdateOrderAsync(Guid coffeeRunId, Guid orderId, Guid memberId, UpdateOrderRequest req)`
- `Task<bool> DeleteOrderAsync(Guid coffeeRunId, Guid orderId, Guid memberId)` — self or initiator

### 4.3 DTOs

**Create directory:** `src/TeamManager.Api/Application/DTOs/CoffeeRun/`

Files:

- `CreateMenuItemRequest.cs`
- `UpdateMenuItemRequest.cs`
- `CreateOrderRequest.cs` (includes `OrderItemEntry` sub-record)
- `UpdateOrderRequest.cs`
- `CoffeeRunListDto.cs`
- `CoffeeRunDto.cs`
- `CoffeeRunDetailDto.cs`
- `CoffeeRunMenuItemDto.cs`
- `CoffeeRunOrderDto.cs`
- `CoffeeRunOrderItemDto.cs`

### 4.4 Domain Entities

**Create directory:** `src/TeamManager.Api/Domain/Entities/` (flat — no subdirectory)

Files:

- `CoffeeRun.cs`
- `CoffeeRunMenuItem.cs`
- `CoffeeRunOrder.cs`
- `CoffeeRunOrderItem.cs`

**Create enum:** `src/TeamManager.Api/Domain/Enums/CoffeeRunStatus.cs`

```csharp
namespace TeamManager.Api.Domain.Enums;

public enum CoffeeRunStatus
{
    Open,
    Closed
}
```

### 4.5 EF Core Configuration

**Create:**

- `src/TeamManager.Api/Infrastructure/Data/Configurations/CoffeeRunConfiguration.cs`
- `src/TeamManager.Api/Infrastructure/Data/Configurations/CoffeeRunMenuItemConfiguration.cs`
- `src/TeamManager.Api/Infrastructure/Data/Configurations/CoffeeRunOrderConfiguration.cs`
- `src/TeamManager.Api/Infrastructure/Data/Configurations/CoffeeRunOrderItemConfiguration.cs`

Each follows the `IEntityTypeConfiguration<T>` pattern (see `WheelConfiguration.cs`). Key points:

- All PKs use `HasDefaultValueSql("gen_random_uuid()")`
- `CoffeeRunOrder` has a unique index on `{ CoffeeRunId, TeamMemberId }` to enforce one order per member per run
- `CoffeeRun` → `MenuItem` / `Order` cascade deletes are fine
- `CoffeeRunOrderItem` → `CoffeeRunMenuItem` uses `DeleteBehavior.Restrict` to avoid multiple cascade paths (deletion of a menu item that is referenced in an order must be rejected with a validation error in the service layer)
- `CoffeeRun.InitiatorId` FK uses `DeleteBehavior.Restrict` to prevent accidental member deletion from wiping runs

### 4.6 DI Registration

In `src/TeamManager.Api/Program.cs`, add:

```csharp
builder.Services.AddScoped<ICoffeeRunService, CoffeeRunService>();
```

Right after the `IWheelService` registration.

### 4.7 DbContext Changes

In `src/TeamManager.Api/Infrastructure/Data/AppDbContext.cs`, add DbSets:

```csharp
public DbSet<CoffeeRun> CoffeeRuns => Set<CoffeeRun>();
public DbSet<CoffeeRunMenuItem> CoffeeRunMenuItems => Set<CoffeeRunMenuItem>();
public DbSet<CoffeeRunOrder> CoffeeRunOrders => Set<CoffeeRunOrder>();
public DbSet<CoffeeRunOrderItem> CoffeeRunOrderItems => Set<CoffeeRunOrderItem>();
```

In `OnModelCreating`, add:

```csharp
modelBuilder.ApplyConfiguration(new CoffeeRunConfiguration());
modelBuilder.ApplyConfiguration(new CoffeeRunMenuItemConfiguration());
modelBuilder.ApplyConfiguration(new CoffeeRunOrderConfiguration());
modelBuilder.ApplyConfiguration(new CoffeeRunOrderItemConfiguration());
```

---

## 5. Frontend Architecture

### 5.1 Route Configuration

**Modify:** `team-manager-ui/src/app/features/fun/fun.routes.ts`

Add a new child route under the `FunHubComponent` children array:

```typescript
{
  path: 'coffee-run',
  loadChildren: () =>
    import('../coffee-run/coffee-run.routes').then(m => m.COFFEE_RUN_ROUTES)
}
```

**Create:** `team-manager-ui/src/app/features/coffee-run/coffee-run.routes.ts`

```typescript
import { Routes } from '@angular/router';

export const COFFEE_RUN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./coffee-run.component').then(m => m.CoffeeRunComponent)
  }
];
```

### 5.2 Components to Create

| Component                   | Path                                                                         | Purpose                                          |
|-----------------------------|------------------------------------------------------------------------------|--------------------------------------------------|
| `CoffeeRunComponent`        | `team-manager-ui/src/app/features/coffee-run/coffee-run.component.ts`         | Main container: list of runs + create button      |
| `CoffeeRunDetailComponent`  | `team-manager-ui/src/app/features/coffee-run/coffee-run-detail.component.ts`  | Single run view: menu, orders, close button       |
| `CoffeeRunOrderComponent`   | `team-manager-ui/src/app/features/coffee-run/coffee-run-order.component.ts`   | Dialog or inline form: place/edit an order        |
| `CoffeeRunMenuComponent`    | `team-manager-ui/src/app/features/coffee-run/coffee-run-menu.component.ts`    | Initiator-only: add/edit/delete menu items inline |

Alternatively, a single `CoffeeRunComponent` with child display sections
(in the style of `WheelComponent` which handles list + canvas in one component)
is acceptable and reduces boilerplate. The order form can be implemented as a
Material dialog.

### 5.3 Services to Create

**Create:** `team-manager-ui/src/app/core/services/coffee-run.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api.config';
import {
  CoffeeRunListDto, CoffeeRunDetailDto, CoffeeRunDto,
  CoffeeRunMenuItemDto, CoffeeRunOrderDto,
  CreateMenuItemRequest, UpdateMenuItemRequest,
  CreateOrderRequest, UpdateOrderRequest
} from '../models/coffee-run.model';

@Injectable({ providedIn: 'root' })
export class CoffeeRunService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/coffee-runs`;

  getAll(status?: string): Observable<CoffeeRunListDto[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<CoffeeRunListDto[]>(this.base, { params });
  }

  getById(id: string): Observable<CoffeeRunDetailDto> {
    return this.http.get<CoffeeRunDetailDto>(`${this.base}/${id}`);
  }

  create(): Observable<CoffeeRunDto> {
    return this.http.post<CoffeeRunDto>(this.base, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  close(id: string): Observable<CoffeeRunDto> {
    return this.http.post<CoffeeRunDto>(`${this.base}/${id}/close`, {});
  }

  addMenuItem(runId: string, req: CreateMenuItemRequest): Observable<CoffeeRunMenuItemDto> {
    return this.http.post<CoffeeRunMenuItemDto>(`${this.base}/${runId}/menu-items`, req);
  }

  updateMenuItem(runId: string, itemId: string, req: UpdateMenuItemRequest): Observable<CoffeeRunMenuItemDto> {
    return this.http.put<CoffeeRunMenuItemDto>(`${this.base}/${runId}/menu-items/${itemId}`, req);
  }

  deleteMenuItem(runId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${runId}/menu-items/${itemId}`);
  }

  placeOrder(runId: string, req: CreateOrderRequest): Observable<CoffeeRunOrderDto> {
    return this.http.post<CoffeeRunOrderDto>(`${this.base}/${runId}/orders`, req);
  }

  updateOrder(runId: string, orderId: string, req: UpdateOrderRequest): Observable<CoffeeRunOrderDto> {
    return this.http.put<CoffeeRunOrderDto>(`${this.base}/${runId}/orders/${orderId}`, req);
  }

  deleteOrder(runId: string, orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${runId}/orders/${orderId}`);
  }
}
```

### 5.4 Models / Interfaces to Create

**Create:** `team-manager-ui/src/app/core/models/coffee-run.model.ts`

```typescript
export type CoffeeRunStatus = 'Open' | 'Closed';

export interface CoffeeRunListDto {
  id: string;
  initiatorName: string;
  status: CoffeeRunStatus;
  menuItemCount: number;
  orderCount: number;
  createdAt: string;
  closedAt: string | null;
}

export interface CoffeeRunDto {
  id: string;
  initiatorId: string;
  initiatorName: string;
  status: CoffeeRunStatus;
  createdAt: string;
  closedAt: string | null;
}

export interface CoffeeRunDetailDto extends CoffeeRunDto {
  menuItems: CoffeeRunMenuItemDto[];
  orders: CoffeeRunOrderDto[];
}

export interface CoffeeRunMenuItemDto {
  id: string;
  name: string;
  price: number;
}

export interface CoffeeRunOrderDto {
  id: string;
  teamMemberId: string;
  teamMemberName: string;
  notes: string | null;
  total: number;
  items: CoffeeRunOrderItemDto[];
  createdAt: string;
}

export interface CoffeeRunOrderItemDto {
  id: string;
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CreateMenuItemRequest {
  name: string;
  price: number;
}

export interface UpdateMenuItemRequest {
  name?: string;
  price?: number;
}

export interface OrderItemEntry {
  menuItemId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItemEntry[];
  notes?: string;
}

export interface UpdateOrderRequest {
  items?: OrderItemEntry[];
  notes?: string;
}
```

### 5.5 Fun Hub Tab Integration

**Modify:** `team-manager-ui/src/app/features/fun/fun-hub.component.ts`

Add a new tab link inside the `<nav class="hub-tabs">` element, after the Spin Wheel tab:

```html
<a class="hub-tab" routerLink="coffee-run" routerLinkActive="active" role="tab">
  Coffee Run
</a>
```

### 5.6 Data Flow (Signals, Service Calls)

The Coffee Run component follows the reactive signal pattern established in `WheelComponent`:

```
CoffeeRunComponent
├── signals:
│   ├── runs          = signal<CoffeeRunListDto[]>([])
│   ├── activeRun     = signal<CoffeeRunDetailDto | null>(null)
│   ├── loading       = signal(true)
│   ├── savingMenu    = signal(false)
│   ├── savingOrder   = signal(false)
│   └── currentMemberId   = from AuthService / member claim
│
├── lifecycle:
│   ngOnInit:
│     coffeeRunService.getAll() → runs.set()
│     loading.set(false)
│
├── user actions:
│   createRun():
│     coffeeRunService.create().subscribe(r =>
│       runs.update(arr => [r, ...arr])
│     )
│
│   selectRun(id):
│     coffeeRunService.getById(id).subscribe(d =>
│       activeRun.set(d)
│     )
│
│   closeRun():
│     coffeeRunService.close(activeRun()!.id).subscribe(r => {
│       runs.update(arr => arr.map(x => x.id === r.id ? {...x, status: r.status} : x))
│       activeRun.set(null)
│     })
│
│   placeOrder():
│     coffeeRunService.placeOrder(runId, req).subscribe(() => {
│       reloadActiveRun()  // reload detail to get updated orders list
│     })
│
│   manageMenu (initiator only):
│     coffeeRunService.addMenuItem / deleteMenuItem → reloadActiveRun()
│
├── computed derived state:
│   isInitiator = computed(() => activeRun()?.initiatorId === currentMemberId())
│   isOpen      = computed(() => activeRun()?.status === 'Open')
│   myOrder     = computed(() =>
│     activeRun()?.orders.find(o => o.teamMemberId === currentMemberId()) ?? null
│   )
```

---

## 6. Database Migrations

### 6.1 Steps

```bash
# From the solution root, navigate to the API project:
cd src/TeamManager.Api

# Generate the migration:
dotnet ef migrations add AddCoffeeRun   --startup-project .   --output-dir Infrastructure/Data/Migrations

# Apply the migration (local dev):
dotnet run --migrate

# Or apply via:
dotnet ef database update
```

### 6.2 What Gets Generated

- A new PostgreSQL enum type `coffee_run_status`
- Four new tables: `coffee_runs`, `coffee_run_menu_items`, `coffee_run_orders`, `coffee_run_order_items`
- Foreign keys with appropriate cascade/restrict behaviors
- A unique index on `coffee_run_orders (coffee_run_id, team_member_id)`

---

## 7. Edge Cases & Considerations

### 7.1 Auth

- **Any authenticated user** can: view runs, create a run, place/update own orders, add menu items (only on own runs)
- **TeamLead** can: delete any run (backstop for abandoned runs)
- **Initiator** can: close a run, delete the run, manage menu items on their runs, delete others' orders (if needed)
- Controller must extract `currentMemberId` from the JWT claim `NameIdentifier` (same pattern as `WinOfTheWeekController.GetCurrentMemberId()`)

### 7.2 Validation

| Rule | Enforcement |
|------|-------------|
| One order per member per run | DB unique constraint; service catches `DbUpdateException` → 409 Conflict |
| Menu item deletion blocked if referenced by any order | Service checks `OrderItems.Any()` before deleting |
| Closed runs immutable | Service checks `CoffeeRun.Status == Closed`, throws `InvalidOperationException` |
| Quantity 1–99 | `[Range(1, 99)]` on `OrderItemEntry.Quantity` |
| Empty order rejected | `[MinLength(1)]` on `CreateOrderRequest.Items` |
| Price 0–99999.99 | `[Range(0, 99999.99)]` on create/update menu item requests |

### 7.3 Error States

| Scenario                              | HTTP | Message                                                    |
|---------------------------------------|------|------------------------------------------------------------|
| Run not found                         | 404  | `"Coffee run not found."`                                  |
| Try to modify a closed run            | 400  | `"This coffee run is closed. No changes allowed."`         |
| Try to delete menu item with orders   | 400  | `"Cannot delete a menu item that has been ordered."`       |
| Duplicate order (member orders twice) | 409  | `"You already have an order for this coffee run."`         |
| Non-initiator tries to close          | 403  | `"Only the initiator can close this coffee run."`          |
| Non-initiator tries to manage menu    | 403  | `"Only the initiator can manage the menu."`                |
| Non-owner tries to edit another order | 403  | `"You can only edit your own order."`                      |

### 7.4 Empty States

| State                          | UI Behavior                                                 |
|--------------------------------|-------------------------------------------------------------|
| No coffee runs exist           | Show empty state: "No coffee runs yet. Start one?" + CTA    |
| Active run has no menu items   | "Waiting for the initiator to add menu items..."            |
| Active run has no orders       | "No orders yet. Be the first!" (if not initiator)           |
| Closed run with orders         | Show full read-only summary                                 |

### 7.5 Loading States

- `loading` signal displays a `MatProgressSpinner` (same as `WheelComponent`)
- `savingMenu`, `savingOrder` signals disable respective submit buttons and show inline spinners
- Detail reload after mutation uses the same `loading` overlay pattern set on `activeRun`

### 7.6 Additional Considerations

- **Real-time updates**: For a more polished experience, WebSocket broadcasts could notify other members when a new order is placed or when the run closes (following the `WebSocketMiddleware.BroadcastAsync` pattern used in `WinOfTheWeekController`). Phase 1 can skip this.
- **Initiator transfer**: If the initiator leaves, a Team Lead may need to transfer initiator ownership. Not required for Phase 1.
- **Cost summary**: The `CoffeeRunDetailDto` / service can compute per-member totals and an overall run total for the initiator's reference.
