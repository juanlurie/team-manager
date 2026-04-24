#!/bin/bash
# Promote dev images to prod and restart production
set -e
cd "$(dirname "$0")"

echo "▶ Promoting dev → prod"

# Ensure dev images exist
if ! docker image inspect team-manager-api:dev &>/dev/null || ! docker image inspect team-manager-ui:dev &>/dev/null; then
  echo "✗ Dev images not found. Run './dev.sh build' first."
  exit 1
fi

echo "  Tagging images..."
docker tag team-manager-api:dev team-manager-api:prod
docker tag team-manager-ui:dev team-manager-ui:prod

echo "  Restarting prod containers..."
docker compose -f docker-compose.yml up -d

echo "✓ Prod updated → http://localhost:80"
