#!/bin/bash
# Kopie zapasowe pznowak.pl na Hetznerze (model pull: ten serwer sam ściąga dane).
#   pznowak-backup            pełna kopia: baza + zdjęcia Blob + dane z MyDevil (raz na dobę)
#   pznowak-backup --db-only  tylko baza (cron: 8:15, 14:15 i 20:15 czasu serwera; katalog nazywa się baza-co-6h z dawnych planów)
# Pełne kopie to migawki w ~/backups/pznowak-full/migawki/<czas>/ (pliki dowiązane twardo do luster w _lustro/,
# więc 10 migawek zajmuje niewiele więcej niż jedna). Zostaje 10 ostatnich udanych.
set -u
umask 077
ROOT="${PZNOWAK_BACKUP_ROOT:-$HOME/backups/pznowak-full}"
CONF="$HOME/.config/pznowak-backup"
IMAGE="${PZNOWAK_POSTGRES_IMAGE:-postgres:18-alpine}"
KEEP_FULL=10
KEEP_DB=12
MIN_FREE_KB=$((3 * 1024 * 1024))
MODE=full; [ "${1:-}" = "--db-only" ] && MODE=db
MYDEVIL="pznowak@s92.mydevil.net"
SSH_RSYNC="ssh -i $HOME/.ssh/pznowak_backup_pull -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20"
HERE="$(cd "$(dirname "$0")" && pwd)"
ts() { date -u +%FT%TZ; }
log() { printf '%s %s\n' "$(ts)" "$*"; }

mkdir -p "$ROOT/migawki" "$ROOT/baza-co-6h" "$ROOT/_lustro"
exec 9>"$ROOT/.lock"
flock -n 9 || { log "Kopia już trwa, pomijam."; exit 0; }

free_kb=$(df -Pk "$ROOT" | awk 'NR==2{print $4}')
[ "$free_kb" -ge "$MIN_FREE_KB" ] || { log "BŁĄD: za mało miejsca (${free_kb} KB wolnych)"; exit 1; }

dump_db() { # $1 = plik .env, $2 = zmienna, $3 = plik docelowy
  local out="$3" base; base="$(basename "$3")"
  docker run --rm --user "$(id -u):$(id -g)" --env-file "$1" -e "VAR=$2" -e "OUT=$base" \
    -v "$(dirname "$out"):/b" "$IMAGE" \
    sh -eu -c 'pg_dump "$(printenv "$VAR")" --format=custom --compress=9 --no-owner --no-privileges --file="/b/$OUT.partial"' || return 1
  docker run --rm --user "$(id -u):$(id -g)" -v "$(dirname "$out"):/b:ro" "$IMAGE" \
    pg_restore --list "/b/$base.partial" >/dev/null || return 1
  mv "$out.partial" "$out"
  # test sensowności: dump musi zawierać dane tabeli zdjęć
  local toc; toc="$(docker run --rm --user "$(id -u):$(id -g)" -v "$(dirname "$out"):/b:ro" "$IMAGE" pg_restore --list "/b/$base")" || return 1
  case "$toc" in *'TABLE DATA public cms_media'*) ;; *) return 1 ;; esac
}
prune() { # $1 katalog, $2 ile zostawić, $3 wzorzec
  ls -1d "$1"/$3 2>/dev/null | sort | head -n -"$2" | xargs -r rm -rf
}

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FAIL=0

if [ "$MODE" = db ]; then
  if dump_db "$CONF/live.env" DATABASE_URL_LIVE "$ROOT/baza-co-6h/live-$STAMP.dump"; then
    sha256sum "$ROOT/baza-co-6h/live-$STAMP.dump" > "$ROOT/baza-co-6h/live-$STAMP.dump.sha256"
    prune "$ROOT/baza-co-6h" "$KEEP_DB" 'live-*.dump'; prune "$ROOT/baza-co-6h" "$KEEP_DB" 'live-*.dump.sha256'
    log "Baza OK: live-$STAMP.dump"
  else rm -f "$ROOT/baza-co-6h/live-$STAMP.dump"*; log "BŁĄD: dump bazy"; exit 1; fi
  exit 0
fi

# skrypt i blob_sync.py muszą leżeć w tym samym katalogu (np. oba w ~/bin); bez tego pełna kopia pada po cichu każdej nocy
[ -r "$HERE/blob_sync.py" ] || { log "BŁĄD: brak $HERE/blob_sync.py (skopiuj go obok skryptu kopii)"; exit 1; }

SNAP="$ROOT/migawki/$STAMP"
mkdir -p "$SNAP"
log "Start pełnej kopii $STAMP"

# 1. Baza: żywa (to, z czego korzysta strona) oraz stara gałąź production (archiwum)
dump_db "$CONF/live.env" DATABASE_URL_LIVE "$SNAP/baza-zywa.dump" || { log "BŁĄD: dump żywej bazy"; FAIL=1; }
if [ -r "$CONF/database.env" ]; then
  dump_db "$CONF/database.env" DATABASE_URL_UNPOOLED "$SNAP/baza-stara-galaz-production.dump" || { log "OSTRZEŻENIE: dump starej gałęzi nie wyszedł"; rm -f "$SNAP"/baza-stara*; }
fi

# 2. Zdjęcia: Vercel Blob (publiczny katalog i prywatne załączniki od klientów)
set -a; . "$CONF/blob.env"; set +a
python3 "$HERE/blob_sync.py" BLOB_READ_WRITE_TOKEN "$ROOT/_lustro/blob-katalog" || { log "BŁĄD: Blob katalog"; FAIL=1; }
python3 "$HERE/blob_sync.py" ATTACHMENTS_BLOB_READ_WRITE_TOKEN "$ROOT/_lustro/blob-zalaczniki" || { log "BŁĄD: Blob załączniki"; FAIL=1; }

# 3. MyDevil: dane postów z FB, konfiguracja produkcji, wejścia aplikacji (rsync tylko do odczytu)
mkdir -p "$ROOT/_lustro/mydevil/posty-dane" "$ROOT/_lustro/mydevil/konfiguracja"
rsync -a --delete -e "$SSH_RSYNC" "$MYDEVIL:pznowak-posty/dane/" "$ROOT/_lustro/mydevil/posty-dane/" || { log "BŁĄD: rsync posty"; FAIL=1; }
for f in pznowak-cms-prod/cms/.env.production.local pznowak-posty/posty.env; do
  rsync -a -e "$SSH_RSYNC" "$MYDEVIL:$f" "$ROOT/_lustro/mydevil/konfiguracja/$(basename "$f")" || { log "BŁĄD: rsync $f"; FAIL=1; }
done
for d in pznowak.pl; do
  rsync -a -e "$SSH_RSYNC" "$MYDEVIL:domains/$d/public_nodejs/app.js" "$ROOT/_lustro/mydevil/konfiguracja/app.js-$d" 2>/dev/null || true
done

# 4. Migawka = dowiązania twarde do luster
cp -al "$ROOT/_lustro/." "$SNAP/"

if [ "$FAIL" -eq 0 ] && [ -s "$SNAP/baza-zywa.dump" ]; then
  (cd "$SNAP" && sha256sum baza-*.dump > SHA256SUMS)
  touch "$SNAP/OK"
  ls -1d "$ROOT"/migawki/*/ 2>/dev/null | sed 's#/$##' | sort | while read -r d; do [ -e "$d/OK" ] && echo "$d"; done | head -n -"$KEEP_FULL" | xargs -r rm -rf
  # zostają tylko migawki udane; nieudane starsze niż 2 dni znikają
  find "$ROOT/migawki" -mindepth 1 -maxdepth 1 -type d ! -exec test -e '{}/OK' \; ! -name "$STAMP" -mtime +2 -exec rm -rf {} + 2>/dev/null
  log "Pełna kopia OK: $SNAP ($(du -sh --apparent-size "$SNAP" | cut -f1) logicznie, $(du -sh "$ROOT" | cut -f1) na dysku)"
else
  touch "$SNAP/NIEUDANA"
  log "BŁĄD: pełna kopia $STAMP nieudana, szczegóły wyżej"
  exit 1
fi
