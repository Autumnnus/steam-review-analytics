#!/usr/bin/env sh
set -eu

REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_BIND="${REDIS_BIND:-127.0.0.1}"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/data/redis}"

mkdir -p "${REDIS_DATA_DIR}"

redis-server \
  --bind "${REDIS_BIND}" \
  --port "${REDIS_PORT}" \
  --dir "${REDIS_DATA_DIR}" \
  --save "" \
  --appendonly no \
  --daemonize yes

exec bun run index.ts
