#!/bin/sh
# Sprzątanie zdjęć od klientów (odpowiednik zadania cron z vercel.json). Crontab na MyDevil, raz na dobę:
#   30 2 * * * /usr/bin/lockf -t 0 ~/pznowak-cms-prod/cron.lock /bin/sh ~/pznowak-cms-prod/cms/scripts/mydevil/cron-sprzatanie.sh >> ~/pznowak-cms-prod/cron.log 2>&1 # pznowak-cms
# CRON_SECRET i SITE_URL czyta z cms/.env.production.local (prawa 600). Sekret idzie do curl przez stdin,
# więc nie widać go w liście procesów ani w logu.
set -eu

CMS_DIR=$(cd "$(dirname "$0")/../.." && pwd)
ENV_FILE=${ENV_FILE:-$CMS_DIR/.env.production.local}

read_env() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

CRON_SECRET=$(read_env CRON_SECRET)
SITE_URL=$(read_env SITE_URL)
SITE_URL=${SITE_URL:-https://pznowak.pl}

if [ -z "$CRON_SECRET" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') cron-sprzatanie: brak CRON_SECRET w $ENV_FILE" >&2
  exit 1
fi

printf '%s cron-sprzatanie: ' "$(date '+%Y-%m-%d %H:%M:%S')"
printf 'header = "Authorization: Bearer %s"\n' "$CRON_SECRET" |
  curl -fsS --max-time 120 -K - "${SITE_URL%/}/api/zgloszenia/zalaczniki/sprzatanie"
echo
