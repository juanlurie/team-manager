# Coffee Run — QA Re-Verification Report

**Date:** 2026-05-21
**Context:** Re-verification after critical fixes for C1, C2, C3 and HTTP status code corrections.

---

## 1. Build Verification

| Build | Result | Output |
|-------|--------|--------|
| .NET API (`src/TeamManager.Api`) | **PASS** | Build succeeded. 0 Warning(s) 0 Error(s) |
| Angular UI (`team-manager-ui`) | **PASS** | Output location: dist/team-manager-ui |

---

## 2. Fix Verification Checklist

### C1: Angular template scoping error — `@let` declaration

| Check | File | Status |
|-------|------|--------|
| `@let run = this.detail()!;` present | `coffee-run.component.html:69` | **PASS** |

### C2: Missing `ClosedAt` across the stack

| Check | File:Line | Status |
|-------|-----------|--------|
| `DateTimeOffset? ClosedAt` on entity | `Domain/Entities/CoffeeRun.cs:11` | **PASS** |
| `DateTimeOffset? ClosedAt` on ListDto | `DTOs/CoffeeRun/CoffeeRunListDto.cs:11` | **PASS** |
| `DateTimeOffset? ClosedAt` on DetailDto | `DTOs/CoffeeRun/CoffeeRunDetailDto.cs:13` | **PASS** |
| `ClosedAt` column (nullable) in migration | `Migrations/...AddCoffeeRun.cs:22` | **PASS** |
| `DateTimeOffset? ClosedAt` in model snapshot | `AppDbContextModelSnapshot.cs:173-174` | **PASS** |
| `ClosedAt` mapped in `BuildDetailDto` | `Services/CoffeeRunService.cs:236` | **PASS** |
| `ClosedAt` set on close (`run.ClosedAt = DateTimeOffset.UtcNow`) | `Services/CoffeeRunService.cs:73` | **PASS** |

### C3: TeamLead auth on DELETE

| Check | File:Line | Status |
|-------|-----------|--------|
| `DeleteAsync(id, currentUserId, isTeamLead)` signature | `Services/CoffeeRunService.cs:55` | **PASS** |
| `run.InitiatorId != currentUserId && !isTeamLead` guard | `Services/CoffeeRunService.cs:59` | **PASS** |
| Controller passes `User.IsInRole("TeamLead")` | `Controllers/CoffeeRunsController.cs:44` | **PASS** |

### HTTP Status Codes

| Check | File:Line | Status |
|-------|-----------|--------|
| `POST /` → `Created("", result)` (201) | `CoffeeRunsController.cs:23` | **PASS** |
| `DELETE /{id}` → `NoContent()` (204) | `CoffeeRunsController.cs:46` | **PASS** |
| `POST /{id}/menu-items` → `Created("", result)` (201) | `CoffeeRunsController.cs:68` | **PASS** |
| `DELETE /{id}/menu-items/{itemId}` → `NoContent()` on success (204) | `CoffeeRunsController.cs:94` | **PASS** |
| `POST /{id}/orders` → `Created("", result)` (201) | `CoffeeRunsController.cs:108` | **PASS** |
| `DELETE /{id}/orders/{orderId}` → `NoContent()` (204) | `CoffeeRunsController.cs:130` | **PASS** |

### Business Logic Corrections

| Check | File:Line | Status |
|-------|-----------|--------|
| `CreateOrder` returns `(CoffeeRunDetailDto?, bool IsDuplicate)` tuple | `CoffeeRunService.cs:128` | **PASS** |
| Controller destructures tuple: `var (result, isDuplicate)` | `CoffeeRunsController.cs:106` | **PASS** |
| 409 Conflict returned on duplicate order | `CoffeeRunsController.cs:107` | **PASS** |
| `DeleteMenuItemAsync` returns `DeleteMenuItemResult` enum | `CoffeeRunService.cs:110` | **PASS** |
| `DeleteMenuItemResult.HasOrders` on item with orders | `CoffeeRunService.cs:121` | **PASS** |
| 400 BadRequest returned for menu item with orders | `CoffeeRunsController.cs:93` | **PASS** |
| Controller uses switch expression for result | `CoffeeRunsController.cs:90-96` | **PASS** |
| `DeleteMenuItemResult` enum defined | `DTOs/CoffeeRun/DeleteMenuItemResult.cs:3` | **PASS** |

---

## 3. Acceptance Criteria Re-Check

| Criterion | Previous | Current | Status |
|-----------|----------|---------|--------|
| Angular build passes | FAIL | PASS | **FIXED** |
| `ClosedAt` on entity, DTOs, migration, snapshot | FAIL | PASS | **FIXED** |
| TeamLead can delete runs | FAIL | PASS | **FIXED** |
| 409 Conflict on duplicate order | FAIL | PASS | **FIXED** |
| 400 BadRequest on deleting ordered menu item | FAIL | PASS | **FIXED** |
| 201 Created on POST endpoints | FAIL | PASS | **FIXED** |
| 204 NoContent on DELETE endpoints | FAIL | PASS | **FIXED** |

---

## 4. Remaining Issues

None.

---

## 5. Overall Verdict

**PASS** — All 3 critical issues (C1, C2, C3) and all HTTP status code corrections are verified. Both builds succeed with zero errors and zero warnings. The Coffee Run feature is ready for production.
