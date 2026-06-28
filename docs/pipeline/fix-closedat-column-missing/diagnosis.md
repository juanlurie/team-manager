# Diagnosis: Win-of-the-Week 500 Error - Schema Mismatch

## Bug Description
API returns 500 error: `42703: column w.ClosedAt does not exist` (and subsequent errors for `OpenedAt`, `VotedAt`)

## Root Cause

The production `WinWeeks` and `WinVotes` tables have different column names than what the EF Core model expects. This is a schema drift issue — the production database was created with an older schema that was never fully migrated.

**Production vs Model mismatches:**

| Table | Production Column | EF Core Property |
|-------|------------------|------------------|
| WinWeeks | `StartDate` | `WeekStart` |
| WinWeeks | `EndDate` | `WeekEnd` (missing from entity) |
| WinWeeks | `CreatedAt` | `OpenedAt` |
| WinWeeks | `CreatedByMemberId` | `CreatedByMemberId` (missing from entity) |
| WinWeeks | `ClosedAt` | `ClosedAt` ✓ |
| WinVotes | `CreatedAt` | `VotedAt` |

The migration history shows all migrations as applied, but the actual table structure doesn't match — likely because the tables were created before the migrations were finalized, or the database was restored from a backup with an older schema.

## Fix Approach

Instead of creating new migrations (which the database thinks are already applied), map the EF Core properties to the actual production column names using `HasColumnName()` in the entity configurations. Add missing properties (`WeekEnd`, `CreatedByMemberId`) to the `WinWeek` entity.

## Files Changed

| File | Change |
|------|--------|
| `src/.../Domain/Entities/WinWeek.cs` | Added `WeekEnd` and `CreatedByMemberId` properties |
| `src/.../Configurations/WinWeekConfiguration.cs` | Added column mappings: `WeekStart→StartDate`, `WeekEnd→EndDate`, `OpenedAt→CreatedAt` |
| `src/.../Configurations/WinVoteConfiguration.cs` | Added column mapping: `VotedAt→CreatedAt` |
| `src/.../WinOfTheWeekService.cs` | Updated `GetOrCreateCurrentWeekAsync` to set `WeekEnd` and `CreatedByMemberId` |
| `src/.../Migrations/20260514100000_AddWinWeekClosedAt.cs` | **NEW** — Migration (for future databases) |

## Regression Risk Areas

- **Low**: Column mappings are read-only changes — no data is modified
- **Low**: Adding `WeekEnd` and `CreatedByMemberId` to the entity only affects new records
- Existing data is unaffected since we're mapping to existing columns
- The migration file is for future database initialization and won't affect production
