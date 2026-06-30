# Deploy

Build and run the local environment, applying any pending migrations. Real prod runs on a
separate k3s cluster (see `k8s/`) and isn't deployed by this command — that happens via
the CI/k3s pipeline outside this repo's scripts.

## Steps

1. Build and start the local environment (runs migrations automatically):
   ```bash
   cd /opt/services/team-manager && ./dev.sh up
   ```

2. Verify the migration completed cleanly:
   ```bash
   docker compose -f docker-compose.yml logs migrate 2>&1 | grep -E "Applying|No migrations|applied|fail|error"
   ```
   - If any `fail` or `error` — stop and investigate.
   - "No migrations were applied" is fine if there are no new migrations.

## Adding a new migration

When you add a new EF migration, generate it against the local DB using:

```bash
cd /opt/services/team-manager/src/TeamManager.Api && \
ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=team_manager;Username=${DB_USER};Password=${DB_PASSWORD}" \
~/.dotnet/tools/dotnet-ef migrations add <MigrationName>
```

Then run `/deploy` to apply it locally before it goes out via the k3s pipeline.

## Squashing migrations (when drift accumulates)

If the local DB and the migration files get out of sync:
1. Delete all migration files except `AppDbContextModelSnapshot.cs`
2. Clear `AppDbContextModelSnapshot.cs` to a placeholder
3. Generate a fresh InitialCreate (command above)
4. Wipe `__EFMigrationsHistory` and insert the new ID
5. **Important:** Any schema changes that exist in the new InitialCreate but are missing from the live DB must be applied manually with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` — marking a migration as applied does NOT run it
6. Run `/deploy` to verify
