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
set -e
cd "$(dirname "$0")"

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
  *)
    echo "Usage: $0 [up|down|build|logs|dev|dev:down|dev:build|dev:logs]"
    ;;
esac
