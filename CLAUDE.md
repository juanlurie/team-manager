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
```

Check API logs if something looks wrong:
```bash
sudo docker logs tm-dev-api-1 2>&1 | tail -40
```

---

## Project Structure

```
/opt/services/team-manager/
├── src/TeamManager.Api/
│   ├── Domain/Entities/          # EF entities
│   ├── Domain/Enums/             # C# enums
│   ├── Infrastructure/Data/
│   │   ├── AppDbContext.cs       # DbSets + ApplyConfiguration calls
│   │   └── Configurations/       # IEntityTypeConfiguration files (one per entity)
│   ├── Application/
│   │   ├── DTOs/                 # Request/response records
│   │   └── Services/             # Business logic + Interfaces/
│   ├── Presentation/Controllers/ # Thin controllers — delegate to services
│   ├── Migrations/               # EF migrations (root-owned, use sudo tee)
│   └── Program.cs                # DI registrations
└── team-manager-ui/src/app/
    ├── core/
    │   ├── models/               # TypeScript interfaces
    │   ├── services/             # HttpClient services (one per domain)
    │   └── pipes/
    ├── features/                 # One folder per route/feature area
    └── shared/                   # Reusable components (ConfirmDialog, Comments, etc.)
```

---

## Backend Conventions

### Entities
- PKs use `gen_random_uuid()` default set in `IEntityTypeConfiguration`
- One-to-one PKs (e.g. `MemberPersonal`) use the FK as PK — configured with `HasOne(...).WithOne()`
- All cascade deletes configured in `IEntityTypeConfiguration`, not in the entity itself

### DTOs
- Requests are `record` types: `CreateXRequest`, `UpdateXRequest`, `UpsertXRequest`
- Responses are `record` types ending in `Dto`
- Import/export shapes live in their own subfolder (e.g. `DTOs/LeaveRecord/`, `DTOs/Personal/`)
- **All request records must have validation attributes** — `[Required]`, `[MaxLength]`, `[Range]` at minimum. Do not add a new endpoint without validating its inputs.
- Create and Update operations must use separate request types if their field sets or rules differ

### Mapping
- **Do not use AutoMapper for new mappings.** The project has a mix; new code must use explicit manual mapping only (private static `ToDto()` methods in the service, or inline in the service method).
- AutoMapper `MappingProfile` remains for existing mappings — do not remove it, but do not add to it.
- Manual mapping keeps the data shape visible and avoids implicit convention magic.

### Services
- Interface in `Application/Services/Interfaces/IXService.cs`
- Implementation in `Application/Services/XService.cs`
- Registered in `Program.cs` as `AddScoped<IXService, XService>()`
- Controllers only call service methods — no logic in controllers
- Services must not return raw entities — always map to a DTO before returning

### Controllers
- Routes: `api/v1/<resource>`
- Return `Ok()`, `Created("", result)`, `NoContent()`, `NotFound()`
- Catch `InvalidOperationException` where external calls can fail (e.g. Entelect fetch)
- Do not expose `ex.Message` or stack traces in responses — log server-side, return a generic message

### Error handling
- `GlobalExceptionMiddleware` catches unhandled exceptions and returns a generic 500 body
- For expected business errors, throw `InvalidOperationException` with a user-readable message and catch it in the controller
- Never let raw EF/Npgsql exceptions reach the client

### Migrations
The migrations directory is root-owned. Use `sudo tee` to create files:

```bash
sudo tee /opt/services/team-manager/src/TeamManager.Api/Migrations/YYYYMMDDHHMMSS_MigrationName.cs << 'EOF'
... migration code ...
EOF
```

The snapshot file also needs a permission grant before editing:
```bash
sudo chmod 666 /opt/services/team-manager/src/TeamManager.Api/Migrations/AppDbContextModelSnapshot.cs
```

Migration timestamp format: `YYYYMMDDHHMMSS` — use sequential times on the same day (e.g. `100000`, `110000`, `120000`).

EF applies migrations automatically on startup via `db.Database.Migrate()` in `Program.cs`.

---

## Frontend Conventions

### Components
- All components are **standalone** — import everything they use directly
- Use Angular **signals** for state: `signal()`, `computed()`, `effect()`
- Use `@if`, `@for`, `@switch` (Angular 17+ control flow syntax) — not `*ngIf`, `*ngFor`
- No `NgModule`-based patterns
- **Component size limit: ~300 lines.** If a component template + class exceeds this, extract logical sections into child components with `@Input` signals. Example: a member card in a list should be its own `MemberCardComponent`, not inline in the parent.
- **Do not put multiple unrelated responsibilities in one component.** Each component should own one clear concern.

### Services
- Inject with `inject()` function, not constructor injection
- `API_BASE` constant from `core/services/api.config.ts`
- One service per backend resource
- **Do not handle HTTP errors inside individual components.** A global `HttpInterceptor` is the target pattern (tracked in Tasks.txt); until it exists, at minimum log errors and show a snackbar rather than silently swallowing them.

### Styling
- Inline styles on elements — no separate `.scss` files for components
- Use `styles: [...]` array in `@Component` only for things that can't be inlined (media queries, `::ng-deep`, pseudo-selectors, `:hover`)
- **Never use `onmouseenter`/`onmouseleave` string handlers in templates.** Use CSS `:hover` in the `styles` array instead — it's cleaner and doesn't bypass Angular's rendering.
- Dark theme palette:
  - Page background: `#0f1923`
  - Sidebar/header: `#131e2b`
  - Card surface: `rgba(255,255,255,0.03)` / `rgba(255,255,255,0.04)`
  - Card border: `rgba(255,255,255,0.07)` / `rgba(255,255,255,0.08)`
  - Primary accent: `#64b5f6` (blue)
  - Success: `#4caf50`, Warning: `#ff9800`, Error: `#ef5350`
- `::ng-deep` is acceptable for overriding Angular Material internals (e.g. expansion panel height)

### Dialogs
- `ConfirmDialogComponent` at `shared/components/confirm-dialog/confirm-dialog.component.ts` — use for all destructive actions
- Open with `MatDialog.open(ConfirmDialogComponent, { data: { title, message } })`
- Subscribe to `afterClosed()` and check `result === true`

### Routing
- Lazy-loaded feature routes — `loadComponent: () => import(...).then(m => m.ComponentClass)`
- Child routes defined in `features/<area>/<area>.routes.ts`

---

## Key Domain Notes

- **Duplicate detection key for leave:** `{memberId}|{startDate}|{leaveType}` on backend; `{memberName_lower}|{startDate_iso}|{type_lower}` on frontend (since frontend only has names, not GUIDs)
- **Leave import flow:** `fetch-preview` endpoint returns raw records without writing; `import` endpoint does the write with optional `Override` flag
- **Entelect leave fetch:** requires a `.AspNet.Cookies` session cookie; the `BuildEntelectClient` private method in `LeaveService` handles header construction
- **Sprint member scope:** leave records are filtered to sprint date range + sprint members in `GetAllAsync` when `sprintId` is provided
- **Personal data** (`MemberPersonal`, `MemberSkill`, `MemberNote`, `MemberTask`) is one-to-many off `TeamMember`, routed under `api/v1/team-members/{memberId}/...`

---

## Tasks Backlog

See `Tasks.txt` in the project root for the current backlog. Update it when tasks are completed or added.
