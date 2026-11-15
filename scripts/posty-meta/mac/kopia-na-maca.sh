#!/bin/bash
# Kopia postów pracowni z serwera MyDevil na Maca.
#
# Po instalacji macOS (launchd) uruchamia ten skrypt raz dziennie, a skrypt kopiuje dane tylko wtedy, gdy od
# ostatniej udanej kopii minęło CO_ILE_DNI dni. Gdy Mac był wyłączony albo nie było sieci, próbuje następnego dnia.
# Kopia tylko dokłada pliki (niczego nie kasuje na Macu). Po udanej kopii zapisuje na serwerze znacznik
# .kopia-na-maca: dopiero wtedy serwer może usunąć posty starsze niż RETENTION_DAYS (posty.env).
#
#   bash kopia-na-maca.sh --instaluj ["/ścieżka/na/kopię"]   instalacja (raz) + pierwsza kopia od razu
#   bash ~/.pznowak-posty-kopia/kopia.sh --teraz             kopia od razu, bez czekania na termin
#   bash ~/.pznowak-posty-kopia/kopia.sh --status            kiedy była ostatnia kopia, kiedy następna
#   bash ~/.pznowak-posty-kopia/kopia.sh --odinstaluj        wyłączenie (kopia na Macu zostaje)
#
# Ustawienia po instalacji: ~/.pznowak-posty-kopia/ustawienia.env (CEL, CO_ILE_DNI, GODZINA, SERWER, ZRODLO).
set -u

KATALOG="$HOME/.pznowak-posty-kopia"
USTAWIENIA="$KATALOG/ustawienia.env"
OSTATNIA="$KATALOG/ostatnia-kopia"
LOG="$KATALOG/kopia.log"
KLUCZ="$HOME/.ssh/pznowak_posty_kopia"
ETYKIETA="pl.pznowak.posty-kopia"
PLIST="$HOME/Library/LaunchAgents/$ETYKIETA.plist"

# Wartości domyślne (nadpisuje je ustawienia.env).
SERWER="pznowak@s92.mydevil.net"
ZRODLO="pznowak-posty/dane"
CEL="$HOME/PZ Nowak posty"
CO_ILE_DNI=14
GODZINA=12
[ -f "$USTAWIENIA" ] && . "$USTAWIENIA"

SSH_OPCJE="-i $KLUCZ -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -o ServerAliveInterval=30"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }
powiadom() { /usr/bin/osascript -e "display notification \"$1\" with title \"Posty PZ Nowak\"" >/dev/null 2>&1 || true; }
zdalnie() { ssh $SSH_OPCJE "$SERWER" "$@"; }

instaluj() {
  mkdir -p "$KATALOG" "$HOME/.ssh" "$HOME/Library/LaunchAgents"
  chmod 700 "$HOME/.ssh"
  if [ -n "${1:-}" ]; then CEL="$1"; fi
  if [ "$0" != "$KATALOG/kopia.sh" ]; then cp "$0" "$KATALOG/kopia.sh"; fi
  chmod 755 "$KATALOG/kopia.sh"
  cat > "$USTAWIENIA" <<USTAW
# Ustawienia kopii postów z serwera na tego Maca. Po zmianie nic nie trzeba restartować,
# z wyjątkiem GODZINA (wtedy jeszcze raz: bash ~/.pznowak-posty-kopia/kopia.sh --instaluj).
# Dokąd kopiować (katalog na tym Macu; najlepiej w katalogu domowym, nie w Dokumentach ani na Biurku).
CEL="$CEL"
# Co ile dni robić kopię.
CO_ILE_DNI=$CO_ILE_DNI
# O której godzinie Mac sprawdza, czy już czas na kopię (gdy śpi, sprawdzi po obudzeniu).
GODZINA=$GODZINA
# Serwer i katalog z danymi skryptu postów (DATA_DIR z posty.env, względem katalogu domowego na serwerze).
SERWER="$SERWER"
ZRODLO="$ZRODLO"
USTAW
  echo "Ustawienia: $USTAWIENIA"
  echo "Kopia będzie w: $CEL"

  # Osobny klucz SSH tylko do tej kopii (bez hasła, bo kopia działa sama, bez Ciebie).
  if [ ! -f "$KLUCZ" ]; then
    ssh-keygen -q -t ed25519 -N "" -C "kopia postow pznowak (Mac)" -f "$KLUCZ" || { echo "Nie udało się utworzyć klucza SSH."; exit 1; }
  fi
  if ! zdalnie true 2>/dev/null; then
    echo
    echo "Dodaję klucz do serwera. Za chwilę serwer zapyta o hasło do konta $SERWER (jak przy zwykłym ssh), ostatni raz."
    cat "$KLUCZ.pub" | ssh -o ConnectTimeout=20 "$SERWER" 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys' \
      || { echo "Nie udało się dodać klucza na serwerze."; exit 1; }
    zdalnie true || { echo "Klucz dodany, ale logowanie nim nie działa. Wklej mi ten komunikat."; exit 1; }
  fi
  zdalnie "test -d '$ZRODLO' && command -v rsync >/dev/null" \
    || { echo "Na serwerze nie ma katalogu ~/$ZRODLO albo programu rsync. Wklej mi ten komunikat."; exit 1; }
  echo "Logowanie do serwera kluczem działa."

  cat > "$PLIST" <<P
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ETYKIETA</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$KATALOG/kopia.sh</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>$GODZINA</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
P
  launchctl bootout "gui/$(id -u)/$ETYKIETA" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST" || { echo "Nie udało się włączyć harmonogramu (launchctl)."; exit 1; }
  echo "Harmonogram włączony: codziennie o $GODZINA:00 Mac sprawdza, czy minęło $CO_ILE_DNI dni od ostatniej kopii."
  echo
  echo "Pierwsza kopia teraz (przy dużej ilości filmów może chwilę potrwać)…"
  kopiuj | tee -a "$LOG"
  exit "${PIPESTATUS[0]}"
}

odinstaluj() {
  launchctl bootout "gui/$(id -u)/$ETYKIETA" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Kopia wyłączona. Skopiowane posty zostają w: $CEL"
  echo "Bez kopii serwer przestanie kasować stare posty (czekają na kopię) i po kilku tygodniach przyśle o tym mail."
}

status() {
  echo "Kopia do: $CEL, co $CO_ILE_DNI dni, sprawdzanie o $GODZINA:00"
  if [ -f "$OSTATNIA" ]; then
    t=$(cat "$OSTATNIA")
    echo "Ostatnia udana kopia: $(date -r "$t" '+%Y-%m-%d %H:%M')"
    echo "Następna: od $(date -r $((t + CO_ILE_DNI * 86400)) '+%Y-%m-%d')"
  else
    echo "Kopii jeszcze nie było."
  fi
  launchctl print "gui/$(id -u)/$ETYKIETA" >/dev/null 2>&1 && echo "Harmonogram: włączony" || echo "Harmonogram: WYŁĄCZONY"
}

kopiuj() {
  if ! mkdir "$KATALOG/.blokada" 2>/dev/null; then
    log "kopia już trwa, pomijam"
    return 0
  fi
  trap 'rmdir "$KATALOG/.blokada" 2>/dev/null' EXIT
  if ! mkdir -p "$CEL" 2>/dev/null; then
    log "BŁĄD: nie mogę utworzyć katalogu $CEL (dysk odłączony?)"
    powiadom "Kopia postów nie wyszła: brak katalogu $CEL"
    return 1
  fi
  # Czas rozpoczęcia według zegara serwera: posty zapisane później trafią dopiero do następnej kopii.
  start=$(zdalnie 'date +%s') || {
    log "BŁĄD: brak połączenia z serwerem, spróbuję jutro"
    powiadom "Kopia postów: brak połączenia z serwerem, spróbuję jutro"
    return 1
  }
  log "kopiuję $SERWER:$ZRODLO → $CEL"
  if ! rsync -a --exclude '.posty.lock' --exclude '*.part' --exclude '*.tmp-*' --exclude '.kopia-na-maca' \
      -e "ssh $SSH_OPCJE" "$SERWER:$ZRODLO/" "$CEL/"; then
    log "BŁĄD: rsync nie skończył kopii, spróbuję jutro"
    powiadom "Kopia postów nie wyszła, spróbuję jutro (szczegóły: $LOG)"
    return 1
  fi
  if ! zdalnie "printf '%s\n' $start > '$ZRODLO/.kopia-na-maca'"; then
    log "UWAGA: kopia zrobiona, ale nie udało się zapisać znacznika na serwerze; spróbuję jutro"
    return 1
  fi
  echo "$start" > "$OSTATNIA"
  ile=$(ls "$CEL/posty" 2>/dev/null | wc -l | tr -d ' ')
  log "kopia gotowa, postów na Macu: $ile ($CEL)"
  powiadom "Kopia postów gotowa (postów na Macu: $ile)"
  return 0
}

case "${1:-}" in
  --instaluj) instaluj "${2:-}" ;;
  --odinstaluj) odinstaluj ;;
  --status) status ;;
  --teraz) kopiuj ;;
  "")
    # Uruchomienie z harmonogramu: tylko gdy minęło CO_ILE_DNI dni (godzina zapasu na przesunięcia).
    if [ -f "$OSTATNIA" ] && [ $(( $(date +%s) - $(cat "$OSTATNIA") )) -lt $(( CO_ILE_DNI * 86400 - 3600 )) ]; then exit 0; fi
    kopiuj
    # Log nie rośnie bez końca.
    if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 1000 ]; then tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; fi
    ;;
  *) sed -n '2,15p' "$0"; exit 2 ;;
esac
