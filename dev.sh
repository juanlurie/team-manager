#!/bin/bash
# Build and start the local environment (port 80). Real prod runs on a separate k3s cluster
# (see k8s/) and isn't managed by this script.
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
  *)
    echo "Usage: $0 [up|down|build|logs]"
    ;;
esac
