# Team Manager — Claude Instructions

## What this app is

A sprint/team management tool for an engineering team at Entelect. It tracks sprints, features, work items, team members, leave records, discussion points, and personal development data. There's an export screen that generates PowerPoint reports and leave summary images.

---

## Tech Stack

**Backend:** ASP.NET Core 9, EF Core 9, Npgsql (PostgreSQL), C# 13
**Frontend:** Angular 19, standalone components, Angular Material, signals API
**Infrastructure:** Docker Compose — dev on port 8081, prod on port 80

---

## Development Workflow

Always build to dev first, verify, then promote:

```bash
sudo ./dev.sh up        # build + start dev (port 8081)
sudo ./promote.sh       # tag dev images as prod, restart prod (port 80)
sudo docker logs tm-dev-api-1 2>&1 | tail -40   # check API logs
```

---

## Backend Conventions

### Entities
- PKs use `gen_random_uuid()` default set in `IEntityTypeConfiguration`
- One-to-one PKs (e.g. `MemberPersonal`) use the FK as PK — `HasOne(...).WithOne()`
- All cascade deletes configured in `IEntityTypeConfiguration`, not in the entity

### DTOs
- Requests: `record` types named `CreateXRequest`, `UpdateXRequest`, `UpsertXRequest`
- Responses: `record` types ending in `Dto`
- **All request records must have validation attributes** — `[Required]`, `[MaxLength]`, `[Range]` at minimum
- Create and Update use separate request types if their field sets differ

### Mapping
- **No AutoMapper** — all mapping via explicit `internal static ToDto()` methods in the service class

### Services
- Interface: `Application/Services/Interfaces/IXService.cs`; Implementation: `Application/Services/XService.cs`
- Registered in `Program.cs` as `AddScoped<IXService, XService>()`
- Controllers only call service methods — no logic in controllers
- Services must never return raw entities — always map to a DTO

### Controllers
- Routes: `api/v1/<resource>`
- Return `Ok()`, `Created("", result)`, `NoContent()`, `NotFound()`
- Catch `InvalidOperationException` for expected business errors; return generic message (never expose `ex.Message`)

### Error handling
- `GlobalExceptionMiddleware` handles unhandled exceptions → generic 500
- Throw `InvalidOperationException` for business errors; catch in controller
- Never let raw EF/Npgsql exceptions reach the client

### Migrations
Migrations directory is root-owned — use `sudo tee` to create files and `sudo chmod 666` on the snapshot before editing it. Timestamp format: `YYYYMMDDHHMMSS` (sequential on same day: `100000`, `110000`, …). EF applies migrations automatically on startup via `db.Database.Migrate()`.

---

## Frontend Conventions

### Components
- All components are **standalone** — import everything they use directly
- Use Angular **signals**: `signal()`, `computed()`, `effect()`
- Use `@if`, `@for`, `@switch` (Angular 17+ syntax) — not `*ngIf`, `*ngFor`
- **Component size limit: ~300 lines.** Extract logical sections into child components with `@Input` signals when exceeded
- Each component owns one clear concern — no mixed responsibilities

### Services
- Inject with `inject()`, not constructor injection
- `API_BASE` from `core/services/api.config.ts`; one service per backend resource
- **Do not handle HTTP errors inside components** — log and show a snackbar at minimum

### Styling
- Inline styles on elements; use `styles: [...]` only for media queries, `::ng-deep`, pseudo-selectors, `:hover`
- **Never use `onmouseenter`/`onmouseleave` string handlers** — use CSS `:hover` instead
- Dark theme palette:
  - Background: `#0f1923` | Sidebar/header: `#131e2b`
  - Card surface: `rgba(255,255,255,0.03)` / border: `rgba(255,255,255,0.07)`
  - Accent: `#64b5f6` | Success: `#4caf50` | Warning: `#ff9800` | Error: `#ef5350`
- `::ng-deep` is acceptable for Angular Material internals

### Dialogs
- Use `ConfirmDialogComponent` (`shared/components/confirm-dialog/`) for all destructive actions
- Open with `MatDialog.open(ConfirmDialogComponent, { data: { title, message } })`, check `result === true`

### Routing
- Lazy-loaded: `loadComponent: () => import(...).then(m => m.ComponentClass)`
- Child routes in `features/<area>/<area>.routes.ts`

---

## Key Domain Notes

- **Duplicate detection key for leave:** `{memberId}|{startDate}|{leaveType}` on backend; `{memberName_lower}|{startDate_iso}|{type_lower}` on frontend
- **Leave import flow:** `fetch-preview` returns records without writing; `import` writes with optional `Override` flag
- **Entelect leave fetch:** requires `.AspNet.Cookies` session cookie; handled in `BuildEntelectClient` in `LeaveService`
- **Sprint member scope:** leave records filtered to sprint date range + sprint members in `GetAllAsync` when `sprintId` provided
- **Personal data** (`MemberPersonal`, `MemberSkill`, `MemberNote`, `MemberTask`) is one-to-many off `TeamMember`, routed under `api/v1/team-members/{memberId}/...`

---

## Tasks Backlog

See `Tasks.txt` in the project root. Update it when tasks are completed or added.
