#!/bin/sh
# Budowanie pznowak-cms na MyDevil (FreeBSD). Uruchamiać: sh cms/scripts/mydevil/build.sh
# Bez cross-env i bez node_modules/.bin (konto nie wykonuje plików z katalogu domowego) – Next przez systemowy Node.
# Zmienne (w tym SITE_ENV=production, potrzebne JUŻ przy budowaniu) Next czyta z cms/.env.production.local.
# Nie uruchamia migracji ani seedów; baza jest tylko czytana przy generowaniu stron.
set -eu

CMS_DIR=$(cd "$(dirname "$0")/../.." && pwd)
ROOT_DIR=$(cd "$CMS_DIR/.." && pwd)
NODE_BIN=${NODE_BIN:-/usr/local/bin/node24}

mkdir -p "$ROOT_DIR/tmp"
cd "$CMS_DIR"

if [ ! -f .env.production.local ]; then
  echo "build.sh: brak cms/.env.production.local" >&2
  exit 1
fi
if ! grep -q '^SITE_ENV=' .env.production.local; then
  echo "build.sh: uwaga – brak SITE_ENV w .env.production.local (strona zbuduje się z noindex)" >&2
fi

export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export TMPDIR="$ROOT_DIR/tmp"
# FreeBSD: kompilator SWC w WebAssembly (pakiet @next/swc-wasm-nodejs w wersji = wersja next).
export NEXT_TEST_WASM=1
export NEXT_TEST_WASM_DIR="$CMS_DIR/node_modules/@next/swc-wasm-nodejs"
# Limit pamięci procesu na MyDevil to 4 GB.
export NODE_OPTIONS="--no-deprecation --max-old-space-size=3500"
# Serwer współdzielony: mniej procesów roboczych (next.config.mjs → experimental.cpus).
export BUILD_CPUS="${BUILD_CPUS:-2}"

exec "$NODE_BIN" node_modules/next/dist/bin/next build --webpack
