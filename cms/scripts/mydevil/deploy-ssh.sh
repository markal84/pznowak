#!/bin/sh
# Wejście dla kluczowego SSH z Hetznera (auto-deploy): klucz w authorized_keys ma przypięte
#   command="sh $HOME/pznowak-cms-prod/cms/scripts/mydevil/deploy-ssh.sh",restrict ssh-ed25519 AAAA...
# więc z tym kluczem da się wykonać wyłącznie dwie rzeczy: "status" (tylko odczyt) i "deploy <pełne SHA>".
# "deploy <SHA>" wdraża dokładnie ten commit (musi być na origin/main), a nie main z chwili deployu: commit z migracjami,
# który doszedłby między statusem a deployem, nie wejdzie. Gołe "deploy" zostaje dla starej kopii auto-deploy.py.
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
  "deploy "*)
    SHA=${SSH_ORIGINAL_COMMAND#deploy }
    case "$SHA" in
      *[!0-9a-f]*|"") echo "niepoprawne SHA" >&2; exit 2 ;;
    esac
    if [ "${#SHA}" -ne 40 ]; then echo "niepoprawne SHA" >&2; exit 2; fi
    git fetch --quiet origin main
    if ! git merge-base --is-ancestor "$SHA" origin/main 2>/dev/null; then
      echo "commit $SHA nie należy do origin/main" >&2
      exit 2
    fi
    exec sh "$ROOT/cms/scripts/mydevil/deploy.sh" pznowak.pl main "$SHA"
    ;;
  *)
    echo "niedozwolone polecenie" >&2
    exit 2
    ;;
esac
