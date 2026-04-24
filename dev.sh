#!/bin/bash
# Build and start the dev environment (port 8081)
set -e
cd "$(dirname "$0")"

case "${1:-up}" in
  up)
    echo "▶ Starting dev environment..."
    docker compose -p tm-dev -f docker-compose.dev.yml up -d --build
    echo "✓ Dev running → http://localhost:8081"
    ;;
  down)
    docker compose -p tm-dev -f docker-compose.dev.yml down
    ;;
  build)
    docker compose -p tm-dev -f docker-compose.dev.yml build
    ;;
  logs)
    docker compose -p tm-dev -f docker-compose.dev.yml logs -f "${2:-}"
    ;;
  *)
    echo "Usage: $0 [up|down|build|logs]"
    ;;
esac
