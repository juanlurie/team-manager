# Generic API Request Configs

## Problem
Current `LeaveFetchConfig` is a single singleton config tied to leave fetching. User wants multiple named configs that are generic and shareable.

## Solution
Create a new `ApiRequestConfig` entity and CRUD system. Migrate existing `LeaveFetchConfigs` data into it.

## Entity Design

### ApiRequestConfig
| Property | Type | Notes |
|----------|------|-------|
| Id | Guid | PK |
| Name | string | Unique, e.g. "Leave Fetch", "HR System" |
| Description | string? | Optional |
| Enabled | bool | |
| Url | string | |
| Method | string | GET/POST |
| IsFormUrlEncoded | bool | |
| HeadersJson | string | JSON dict |
| BodyTemplate | string | |
| MappingJson | string | JSON for response mapping |
| CreatedAt | DateTimeOffset | |
| UpdatedAt | DateTimeOffset | |

## Backend Changes

### New Files
- `Domain/Entities/ApiRequestConfig.cs` - Entity
- `Presentation/Controllers/ApiRequestConfigsController.cs` - CRUD + import/export
- `Application/DTOs/ApiRequestConfigDto.cs` - DTOs

### Modified Files
- `Infrastructure/Data/AppDbContext.cs` - Add DbSet
- `Application/Services/ConfigurableLeaveFetcher.cs` - Query by Name = "Leave Fetch" instead of FirstOrDefault

### Controller Endpoints
| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/v1/request-configs` | List all configs |
| GET | `/api/v1/request-configs/{id}` | Get single config |
| POST | `/api/v1/request-configs` | Create new config |
| PUT | `/api/v1/request-configs/{id}` | Update config |
| DELETE | `/api/v1/request-configs/{id}` | Delete config |
| GET | `/api/v1/request-configs/export` | Download all as JSON file |
| POST | `/api/v1/request-configs/import` | Bulk create/update from uploaded JSON |

### Migration Strategy
1. Create `ApiRequestConfigs` table
2. Migrate existing `LeaveFetchConfigs` row(s) into `ApiRequestConfigs` with Name = "Leave Fetch"
3. Keep `LeaveFetchConfigs` table for backward compat (drop later)
4. Update `ConfigurableLeaveFetcher` to query `ApiRequestConfigs` by name

## Frontend Changes

### New Route
- `/settings/request-configs` (or `/config/requests`)

### Component Structure
- `ApiRequestConfigsListComponent` - Table/list view
  - Columns: Name, Enabled, Method, URL, Actions (edit/delete)
  - Toolbar: "New Config", "Export All", "Import"
- `ApiRequestConfigFormComponent` - Create/Edit form (reuses current leave config form fields)

### Service
- `api-request-configs.service.ts` - API calls for CRUD + import/export

## Migration
- `dotnet ef migrations add AddApiRequestConfigsTable`
- Manual data migration in `Up()` method: copy existing LeaveFetchConfigs to ApiRequestConfigs

## Backward Compatibility
- Old `/api/v1/leave-fetch-config` endpoints can remain as redirects or be deprecated
- `ConfigurableLeaveFetcher` queries `ApiRequestConfigs` where Name = "Leave Fetch"
