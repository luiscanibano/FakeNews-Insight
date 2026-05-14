#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/fakenews-insight}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
git lfs pull
docker compose -f deploy/vps/docker-compose.yml --env-file deploy/vps/.env up -d --build