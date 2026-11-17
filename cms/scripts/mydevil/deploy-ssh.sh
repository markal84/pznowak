#!/bin/sh
# Wejście dla kluczowego SSH z Hetznera (auto-deploy): klucz w authorized_keys ma przypięte
#   command="sh $HOME/pznowak-cms-prod/cms/scripts/mydevil/deploy-ssh.sh",restrict ssh-ed25519 AAAA...
# więc z tym kluczem da się wykonać wyłącznie dwie rzeczy: "status" (tylko odczyt) i "deploy".
set -eu
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
case "${SSH_ORIGINAL_COMMAND:-}" in
  status)
    git fetch --quiet origin main
    echo "head=$(git rev-parse HEAD)"
    echo "remote=$(git rev-parse origin/main)"
    echo "commity=$(git rev-list --count HEAD..origin/main)"
    echo "ff=$(git merge-base --is-ancestor HEAD origin/main && echo 1 || echo 0)"
    echo "brudne=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
    echo "migracje=$(git diff --name-only HEAD origin/main -- cms/src/migrations | wc -l | tr -d ' ')"
    ;;
  deploy)
    exec sh "$ROOT/cms/scripts/mydevil/deploy.sh" pznowak.pl
    ;;
  *)
    echo "niedozwolone polecenie" >&2
    exit 2
    ;;
esac
