#!/usr/bin/env python3
"""Pobiera nowe posty z serwera i dopisuje je do przeglądu: kopia z MyDevil → posts.json + media/ → review.html.

Użycie (z katalogu głównego repo):  python3 scripts/facebook/refresh_posts.py [data/facebook] [--bez-serwera]
Zwykle nie trzeba go uruchamiać ręcznie: robi to review_server.py przy starcie i przycisk „Pobierz nowe posty”.

Kroki:
  1. Kopia z serwera: ~/.pznowak-posty-kopia/kopia.sh --teraz (ta sama kopia co co 14 dni; instalacja w
     scripts/posty-meta/README.md, sekcja „Kopia na Maca”). --bez-serwera pomija ten krok (np. bez sieci).
  2. import_posty_meta.py: posty, których nie ma w posts.json, z katalogu kopii (CEL z ustawień kopii).
  3. build_review.py, tylko gdy coś doszło albo nie ma review.html.
Decyzji (selection.json) nie dotyka. Błąd kopii nie przerywa reszty: dopisuje to, co już jest na Macu.
"""
import subprocess
import sys
import threading
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import import_posty_meta  # noqa: E402

KOPIA = Path.home() / ".pznowak-posty-kopia"
DEFAULT_CEL = Path.home() / "PZ Nowak posty"
RUNNING = threading.Lock()


def backup_target():
    """Katalog kopii z ~/.pznowak-posty-kopia/ustawienia.env (linia CEL="…"), bez wykonywania pliku."""
    try:
        for line in (KOPIA / "ustawienia.env").read_text(encoding="utf-8").splitlines():
            if line.startswith("CEL="):
                return Path(line[4:].strip().strip('"').replace("$HOME", str(Path.home()))).expanduser()
    except OSError:
        pass
    return DEFAULT_CEL


def pull_from_server(timeout=1800):
    """(ok, opis). Uruchamia kopię z serwera; jej własne komunikaty są po polsku."""
    script = KOPIA / "kopia.sh"
    if not script.exists():
        return False, ("kopia z serwera nie jest zainstalowana na tym Macu (scripts/posty-meta/README.md, "
                       "„Kopia na Maca”); dopisuję tylko to, co już jest w katalogu kopii")
    try:
        r = subprocess.run(["/bin/bash", str(script), "--teraz"], capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return False, f"kopia z serwera trwała dłużej niż {timeout // 60} min, przerwana"
    out = [ln.split(" ", 2)[-1] for ln in (r.stdout + r.stderr).strip().splitlines() if ln.strip()]
    return r.returncode == 0, (out[-1] if out else f"kopia zakończona kodem {r.returncode}")


def refresh(root, from_server=True, log=print):
    """Zwraca {"ok", "added", "rebuilt", "lines"}. Równoległe wywołanie dostaje ok=False i „już trwa”."""
    root = Path(root)
    if not RUNNING.acquire(blocking=False):
        return {"ok": False, "busy": True, "added": 0, "rebuilt": False, "lines": ["pobieranie już trwa, poczekaj"]}
    lines = []

    def say(msg):
        lines.append(msg)
        log(msg)

    try:
        if from_server:
            say("Pobieram posty z serwera…")
            ok, msg = pull_from_server()
            say(("serwer: " if ok else "serwer (problem): ") + msg)
        cel = backup_target()
        if not (cel / "posty").is_dir():
            say(f"brak katalogu z postami: {cel}/posty")
            return {"ok": False, "added": 0, "rebuilt": False, "lines": lines}
        r = import_posty_meta.import_posts(cel, root)
        for ln in import_posty_meta.summary(r):
            say(ln)
        rebuilt = False
        if r["added"] or not (root / "review.html").exists():
            say("Przebudowuję przegląd…")
            b = subprocess.run([sys.executable, str(HERE / "build_review.py"), str(root)], capture_output=True, text=True, timeout=1800)
            if b.returncode != 0:
                say("przebudowa przeglądu nie wyszła: " + (b.stderr or b.stdout).strip()[-600:])
                return {"ok": False, "added": r["added"], "rebuilt": False, "lines": lines}
            rebuilt = True
            say("przegląd gotowy")
        return {"ok": True, "added": r["added"], "rebuilt": rebuilt, "lines": lines}
    finally:
        RUNNING.release()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    root = Path(args[0]) if args else HERE.parent.parent / "data" / "facebook"
    res = refresh(root, from_server="--bez-serwera" not in sys.argv)
    sys.exit(0 if res["ok"] else 1)


if __name__ == "__main__":
    main()
