#!/bin/sh

set -eu

umask 077

BACKUP_ROOT="${PZNOWAK_BACKUP_ROOT:-/home/marcin/backups/pznowak-neon}"
ENV_FILE="${PZNOWAK_BACKUP_ENV:-/home/marcin/.config/pznowak-backup/database.env}"
POSTGRES_IMAGE="${PZNOWAK_POSTGRES_IMAGE:-postgres:18-alpine}"
RETENTION_DAYS="${PZNOWAK_BACKUP_RETENTION_DAYS:-30}"
LOCK_DIR="$BACKUP_ROOT/.backup-running"

mkdir -p "$BACKUP_ROOT"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  printf '%s Backup already running; skipping.\n' "$(date -u +%FT%TZ)"
  exit 0
fi

partial_path=""
cleanup() {
  if [ -n "$partial_path" ]; then
    rm -f "$partial_path"
  fi
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

if [ ! -r "$ENV_FILE" ]; then
  printf '%s Missing backup environment file: %s\n' "$(date -u +%FT%TZ)" "$ENV_FILE" >&2
  exit 1
fi

if ! grep -q '^DATABASE_URL_UNPOOLED=' "$ENV_FILE"; then
  printf '%s DATABASE_URL_UNPOOLED is not configured in %s\n' "$(date -u +%FT%TZ)" "$ENV_FILE" >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
filename="pznowak-neon-$timestamp.dump"
partial_filename=".$filename.partial"
partial_path="$BACKUP_ROOT/$partial_filename"
final_path="$BACKUP_ROOT/$filename"

docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env-file "$ENV_FILE" \
  --env "BACKUP_FILE=$partial_filename" \
  --volume "$BACKUP_ROOT:/backups" \
  "$POSTGRES_IMAGE" \
  sh -eu -c 'pg_dump "$DATABASE_URL_UNPOOLED" --format=custom --compress=9 --no-owner --no-privileges --file="/backups/$BACKUP_FILE"'

docker run --rm \
  --user "$(id -u):$(id -g)" \
  --volume "$BACKUP_ROOT:/backups:ro" \
  "$POSTGRES_IMAGE" \
  pg_restore --list "/backups/$partial_filename" >/dev/null

mv "$partial_path" "$final_path"
partial_path=""
chmod 600 "$final_path"
sha256sum "$final_path" >"$final_path.sha256"
chmod 600 "$final_path.sha256"

find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'pznowak-neon-*.dump' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'pznowak-neon-*.dump.sha256' -mtime "+$RETENTION_DAYS" -delete

size_bytes="$(wc -c <"$final_path" | tr -d ' ')"
printf '%s Backup completed: %s (%s bytes)\n' "$(date -u +%FT%TZ)" "$final_path" "$size_bytes"
