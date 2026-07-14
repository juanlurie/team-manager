#!/bin/bash
# Local environment management.
# Real prod runs on a separate k3s cluster (see k8s/) and isn't managed by this script.
#
# Commands:
#   up            Start prod-like env on port 80 (default)
#   down          Stop prod-like env
#   build [args]  Rebuild prod-like images
#   logs [svc]    Tail prod-like logs
#   dev           Build and start dev env on port 8081 (API: 5002, separate DB)
#   dev:down      Stop dev env
#   dev:build     Rebuild dev images
#   dev:logs      Tail dev logs
#   test [args]   Run the .NET unit tests (in a one-off SDK container; no local SDK needed)
#   migrate:add <Name>   Generate an EF migration (in a one-off SDK container)
#   migrate:apply        Rebuild the migrate image and apply migrations to the dev DB
set -e
cd "$(dirname "$0")"

# One-off .NET SDK container for tests/migrations (machine has no local .NET SDK).
SDK_IMG="mcr.microsoft.com/dotnet/sdk:9.0"
# Windows path on Git Bash (pwd -W), POSIX path elsewhere -- Docker Desktop needs the Windows form.
REPO="$(pwd -W 2>/dev/null || pwd)"

case "${1:-up}" in
  up)
    echo "▶ Starting local environment..."
    docker compose -f docker-compose.yml up -d --build
    echo "✓ Running → http://localhost:80"
    ;;
  down)
    docker compose -f docker-compose.yml down
    ;;
  build)
    shift
    docker compose -f docker-compose.yml build "$@"
    ;;
  logs)
    docker compose -f docker-compose.yml logs -f "${2:-}"
    ;;
  dev)
    echo "▶ Starting dev environment..."
    docker compose -f docker-compose.dev.yml up -d --build
    echo "✓ Running → http://localhost:8081  (API → http://localhost:5002)"
    ;;
  dev:down)
    docker compose -f docker-compose.dev.yml down
    ;;
  dev:build)
    shift
    docker compose -f docker-compose.dev.yml build "$@"
    ;;
  dev:logs)
    docker compose -f docker-compose.dev.yml logs -f "${2:-}"
    ;;
  test)
    shift
    echo "▶ Running unit tests ($SDK_IMG)... first run restores packages (cached in the tm-nuget volume)."
    # -v tm-nuget: persistent NuGet cache so repeat runs are fast. Extra args pass through (e.g. --filter ...).
    MSYS_NO_PATHCONV=1 docker run --rm \
      -v "$REPO/src:/src" \
      -v tm-nuget:/root/.nuget/packages \
      -w /src/TeamManager.Tests \
      "$SDK_IMG" dotnet test --nologo "$@"
    ;;
  migrate:add)
    NAME="${2:?Usage: $0 migrate:add <MigrationName>}"
    echo "▶ Generating EF migration '$NAME' ($SDK_IMG)..."
    MSYS_NO_PATHCONV=1 docker run --rm \
      -v "$REPO/src/TeamManager.Api:/src" \
      -v tm-nuget:/root/.nuget/packages \
      -w /src \
      "$SDK_IMG" bash -c "dotnet tool install --global dotnet-ef >/dev/null 2>&1; export PATH=\$PATH:/root/.dotnet/tools; dotnet restore && dotnet ef migrations add $NAME"
    echo "✓ Migration '$NAME' created under src/TeamManager.Api/Migrations. Apply it with: $0 migrate:apply"
    ;;
  migrate:apply)
    echo "▶ Applying migrations to the dev database (rebuilds the migrate image first)..."
    docker compose -f docker-compose.dev.yml build migrate
    docker compose -f docker-compose.dev.yml run --rm migrate
    echo "✓ Migrations applied."
    ;;
  *)
    echo "Usage: $0 [up|down|build|logs|dev|dev:down|dev:build|dev:logs|test|migrate:add <Name>|migrate:apply]"
    ;;
esac
