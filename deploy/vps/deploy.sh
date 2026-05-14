#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/fakenews-insight}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"

if ! git diff --quiet -- deploy/vps/Caddyfile deploy/vps/deploy.sh; then
	git stash push -m "auto-deploy-stash" -- deploy/vps/Caddyfile deploy/vps/deploy.sh
fi

git pull --ff-only origin "$BRANCH"
git lfs pull
sudo docker compose -f deploy/vps/docker-compose.yml --env-file deploy/vps/.env up -d --build
