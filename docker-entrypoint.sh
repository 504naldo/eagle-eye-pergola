#!/bin/sh
set -e

# ── Parse DB host + port from DATABASE_URL ────────────────────────────────────
# Expected format: mysql://user:pass@host:port/dbname
DB_HOST=$(echo "$DATABASE_URL" | sed -e 's|^mysql://[^@]*@||' -e 's|:.*||' -e 's|/.*||')
DB_PORT=$(echo "$DATABASE_URL" | sed -e 's|^mysql://[^@]*@[^:]*:||' -e 's|/.*||')
DB_PORT=${DB_PORT:-3306}

echo "[entrypoint] Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  echo "[entrypoint]   not ready — retrying in 2s..."
  sleep 2
done
echo "[entrypoint] MySQL is reachable."

echo "[entrypoint] Running database migrations..."
node scripts/migrate.mjs

echo "[entrypoint] Starting server..."
exec node dist/index.js
