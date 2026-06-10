# Deploy

Build dev, run migrations, then promote to prod. Both environments end up on the same image and schema.

## Steps

1. Build and start dev (runs migrations against dev DB):
   ```bash
   cd /opt/services/team-manager && ./dev.sh up
   ```

2. Verify dev migration completed cleanly:
   ```bash
   docker compose -p tm-dev -f docker-compose.dev.yml logs migrate 2>&1 | grep -E "Applying|No migrations|applied|fail|error"
   ```
   - If any `fail` or `error` — stop and investigate before promoting.
   - "No migrations were applied" is fine if there are no new migrations.

3. Promote dev to prod:
   ```bash
   cd /opt/services/team-manager && ./promote.sh
   ```

4. Verify prod migration completed cleanly:
   ```bash
   docker compose -f /opt/services/team-manager/docker-compose.yml logs migrate 2>&1 | grep -E "Applying|No migrations|applied|fail|error"
   ```

5. Check both DBs have the same migration count (they should match):
   ```bash
   docker compose -p tm-dev -f /opt/services/team-manager/docker-compose.dev.yml exec db psql -U postgres -d team_manager_dev -c "SELECT COUNT(*) FROM \"__EFMigrationsHistory\";" 2>&1
   docker compose -f /opt/services/team-manager/docker-compose.yml exec db psql -U postgres -d team_manager -c "SELECT COUNT(*) FROM \"__EFMigrationsHistory\";" 2>&1
   ```
   Both counts must be equal. If they differ, a migration succeeded on dev but failed on prod — investigate before leaving this state.

## Adding a new migration

When you add a new EF migration, **always generate it against the dev DB** using:

```bash
cd /opt/services/team-manager/src/TeamManager.Api && \
ConnectionStrings__DefaultConnection="Host=localhost;Port=5433;Database=team_manager_dev;Username=postgres;Password=postgres" \
~/.dotnet/tools/dotnet-ef migrations add <MigrationName>
```

Then run `/deploy` to apply it to both environments.

## Squashing migrations (when drift accumulates)

If dev and prod get out of sync again:
1. Delete all migration files except `AppDbContextModelSnapshot.cs`
2. Clear `AppDbContextModelSnapshot.cs` to a placeholder
3. Generate a fresh InitialCreate (command above)
4. Wipe `__EFMigrationsHistory` on both DBs and insert the new ID
5. Run `/deploy` to verify both are in sync
