# Team Manager — Agent Instructions

## Development Workflow

```bash
sudo ./dev.sh up        # Build + start dev (port 8081)
sudo ./promote.sh       # Tag dev images as prod, restart prod (port 80)
sudo docker logs tm-dev-api-1 2>&1 | tail -40   # Check API logs
```

## Tech Stack

- **Backend:** ASP.NET Core 9, EF Core 9, Npgsql (PostgreSQL), C# 13
- **Frontend:** Angular 19, standalone components, signals API
- **Infrastructure:** Docker Compose

## Backend Conventions

### Entities
- PKs use `gen_random_uuid()` default in `IEntityTypeConfiguration` (not in entity)
- One-to-one PKs use FK as PK via `HasOne(...).WithOne()`
- Cascade deletes configured in configuration, not entity

### DTOs
- Requests: `record` types with `[Required]`, `[MaxLength]`, `[Range]`
- Responses: `record` types ending in `Dto`

### Services
- Interface: `Application/Services/Interfaces/IXService.cs`
- Implementation: `Application/Services/XService.cs`
- Register in `Program.cs` as `AddScoped<IXService, XService>()`
- Map to DTO via `internal static ToDto()` — **no AutoMapper**

### Migrations
- Directory is root-owned — use `sudo tee` to create files
- Run `sudo chmod 666` on snapshot before editing
- Format: `YYYYMMDDHHMMSS` (sequential: `100000`, `110000`, …)
- EF applies migrations automatically on startup

## Frontend Conventions

### Components
- Standalone components with `inject()` for DI
- Use `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`)
- Signals: `signal()`, `computed()`, `effect()`

### Services
- Inject with `inject()`, not constructor
- `API_BASE` from `core/services/api.config.ts`

### Dialogs
- Use `ConfirmDialogComponent` from `shared/components/confirm-dialog/confirm-dialog.component.ts` for delete confirmations
- Import `MatDialogModule` and `MatDialog` in standalone components that use dialogs

### Date Pickers
- Use `DatePickerComponent` from `shared/components/date-picker/date-picker.component.ts` for all date inputs
- Never use native `<input type="date">` — it shows blank on mobile until a date is selected
- Two appearances: `appearance="outline"` (full Material form field with label) or `appearance="none"` (flat inline style for tight layouts)
- Supports `[(ngModel)]` binding, `min`, `max`, `dateFilter`, `placeholder`, and `width` inputs
- Always import `MatDatepickerModule` in the component if using `mat-datepicker` template references directly

## Domain Notes

- Leave duplicate key: `{memberId}|{startDate}|{leaveType}` (backend), `{memberName_lower}|{startDate_iso}|{type_lower}` (frontend)
- Sprint member scope: leave filtered to sprint date range + members
- Personal data routes under `api/v1/team-members/{memberId}/...`

## References

- Full conventions in `CLAUDE.md`