# Coffee Run Feature — Re-Review

## Summary of Fixes Verified

All 6 previously reported critical issues are confirmed resolved:

### 1. EF Core Migration — Generated ✓
Migration `20260521173329_AddCoffeeRun` exists with full `Up()`/`Down()` methods. Tables created in correct dependency order (CoffeeRuns → CoffeeRunMenuItems/CoffeeRunOrders → CoffeeRunOrderItems), dropped in reverse order. Designer file (`AddCoffeeRun.Designer.cs`) correctly reflects the model snapshot. DbContext registers all 4 new DbSets (`CoffeeRuns`, `CoffeeRunMenuItems`, `CoffeeRunOrders`, `CoffeeRunOrderItems`) and applies all 4 new configuration classes.

### 2. Cascade-Delete Paths — Changed to Restrict ✓
Three FK relationships that previously formed problematic cascade paths now use `Restrict`:
- `CoffeeRun → Initiator (TeamMember)`: `Restrict` at `CoffeeRunConfiguration.cs:18`
- `CoffeeRunOrder → TeamMember`: `Restrict` at `CoffeeRunOrderConfiguration.cs:23`
- `CoffeeRunOrderItem → MenuItem`: `Restrict` at `CoffeeRunOrderItemConfiguration.cs:23`

Cascades flow correctly downward: `CoffeeRun → MenuItems/Orders → OrderItems`. The `Restrict` on `OrderItem → MenuItem` blocks direct deletion of a menu item while orders reference it, but does not block cascade deletion from CoffeeRun since child deletion ordering is handled correctly by PostgreSQL. **No duplicate cascade paths exist.**

### 3. Close Endpoint Auth — Initiator Check Added ✓
`CoffeeRunsController.cs:49-57`: TMID extracted via `User.FindFirst("TMID")?.Value` before calling `CloseAsync`.  
`CoffeeRunService.cs:68`: `if (run.InitiatorId != currentUserId) return null;` — only the run initiator can close.

### 4. Menu Item CRUD Auth — Initiator Checks Added ✓
All 3 menu item endpoints extract TMID and pass `currentUserId` to the service:
- `AddMenuItemAsync` (`CoffeeRunService.cs:80`): `if (run.InitiatorId != currentUserId) return null;`
- `UpdateMenuItemAsync` (`CoffeeRunService.cs:97`): `if (run.InitiatorId != currentUserId) return null;`
- `DeleteMenuItemAsync` (`CoffeeRunService.cs:112`): `if (run.InitiatorId != currentUserId) return null;`

Only the run initiator can add, edit, or delete menu items.

### 5. DELETE Endpoint Auth — TMID Extraction Added ✓
`CoffeeRunsController.cs:38-46`: The `Delete` endpoint now extracts TMID and calls `service.DeleteAsync(id, currentUserId)`. Previously this was a direct pass-through with no auth.

### 6. Order Update/Delete Ownership — Checks Added ✓
- `UpdateOrderAsync` (`CoffeeRunService.cs:156`): `if (order.TeamMemberId != currentUserId) return null;`
- `DeleteOrderAsync` (`CoffeeRunService.cs:183`): `if (order.TeamMemberId != currentUserId) return null;`

Users can only modify or delete their own orders.

---

## Verification of Unchanged Files

| File | Status |
|------|--------|
| `Domain/Entities/CoffeeRun.cs` | Correct — 4 properties, 3 navigation props |
| `Domain/Entities/CoffeeRunMenuItem.cs` | Correct — 5 properties, 2 navigation props |
| `Domain/Entities/CoffeeRunOrder.cs` | Correct — 5 properties, 3 navigation props |
| `Domain/Entities/CoffeeRunOrderItem.cs` | Correct — 4 properties, 2 navigation props |
| `Infrastructure/Data/AppDbContext.cs` | Correct — all 4 DbSets registered, all 4 configs applied in `OnModelCreating` |
| `UI coffee-run.component.ts` | Correct — proper signal-based reactive state, initiator guard in UI, order form logic |
| `UI coffee-run.component.html` | Correct — initiator-only menu CRUD UI, non-initiator order section, closed-run read-only lock |
| `UI coffee-run.service.ts` | Correct — REST endpoints match controller routes |
| `UI coffee-run.model.ts` | Correct — DTO interfaces match backend response shapes |

---

## Remaining Issues

### MINOR — No server-side guard against initiator self-ordering
`CoffeeRunService.CreateOrderAsync` (line 122) does not check if the ordering user is the run initiator. The UI hides the order section from initiators (`coffee-run.component.html:186`), so this is not exploitable via the normal UI flow, but a direct API call could allow an initiator to add themselves as an order. Low risk.

### MINOR — No server-side validation on menu item price
`AddMenuItemAsync` and `UpdateMenuItemAsync` accept any `decimal` value, including zero or negative prices. The UI enforces `> 0` but a direct API call bypasses this. Consider adding a validation check (e.g. `price <= 0`) in the service layer.

### MINOR — No pagination on `GET /api/v1/coffee-runs`
`GetAllAsync` returns all runs unconditionally. Acceptable for a small-team tool, but could become slow with many historical runs. Not a blocker.

### MINOR — Empty orders possible via direct API
`CreateOrderAsync` does not validate that `request.Items` is non-empty. The UI prevents this with `hasAnyQuantity()`, but a direct API call could create an order with zero items.

---

## Verdict: APPROVED

All 6 previously-flagged critical issues are fully resolved. The migration is correct with no duplicate cascade paths. Auth checks are placed correctly at both the controller (TMID extraction) and service (initiator/owner verification) layers. The four minor issues noted above are defensive-improvement suggestions and do not block release.

The defense-in-depth approach (UI hides buttons + backend enforces ownership) is sound. No new issues were introduced by the fixes.
