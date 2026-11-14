#!/bin/sh
# Wdrożenie nowej wersji na MyDevil: sh cms/scripts/mydevil/deploy.sh <domena> [gałąź]
#   np. sh ~/pznowak-cms-prod/cms/scripts/mydevil/deploy.sh pznowak.pl
# Kroki: git pull (tylko fast-forward) → npm ci --ignore-scripts → build → restart domeny.
# Restart następuje tylko po udanym buildzie. Uwaga: build nadpisuje katalog .next działającej strony,
# więc przez ok. minutę pojedyncze odsłony mogą zwrócić błąd – wdrażać poza godzinami pracy pracowni.
# Nie dotyka bazy (bez migracji i seedów) ani plików .env*.local, tmp/ i .zalaczniki-lokalne/.
set -eu

DOMAIN=${1:?podaj domenę, np. pznowak.pl}
BRANCH=${2:-main}
CMS_DIR=$(cd "$(dirname "$0")/../.." && pwd)
ROOT_DIR=$(cd "$CMS_DIR/.." && pwd)
NODE_BIN=${NODE_BIN:-/usr/local/bin/node24}
NPM_CLI=${NPM_CLI:-/usr/local/lib/node_modules/npm/bin/npm-cli.js}

cd "$ROOT_DIR"
BEFORE=$(git rev-parse --short HEAD)
git fetch --quiet origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"
AFTER=$(git rev-parse --short HEAD)
echo "deploy: $BEFORE -> $AFTER"

cd "$CMS_DIR"
if [ "$BEFORE" != "$AFTER" ] && git diff --quiet "$BEFORE" "$AFTER" -- package-lock.json && [ -d node_modules ]; then
  echo "deploy: package-lock.json bez zmian – pomijam npm ci"
else
  "$NODE_BIN" "$NPM_CLI" ci --ignore-scripts --no-audit --no-fund
fi

sh "$CMS_DIR/scripts/mydevil/build.sh"
devil www restart "$DOMAIN"
echo "deploy: gotowe ($AFTER), domena $DOMAIN zrestartowana"
