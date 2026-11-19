#!/usr/bin/env python3
"""Pobiera nowe posty z serwera i dopisuje je do przeglądu: kopia z MyDevil → posts.json + media/ → review.html.

Użycie (z katalogu głównego repo):  python3 scripts/facebook/refresh_posts.py [data/facebook] [--bez-serwera]
Zwykle nie trzeba go uruchamiać ręcznie: robi to review_server.py przy starcie i przycisk „Pobierz nowe posty”.

Kroki:
  1. Kopia z serwera: ~/.pznowak-posty-kopia/kopia.sh --teraz (ta sama kopia co co 14 dni; instalacja w
     scripts/posty-meta/README.md, sekcja „Kopia na Maca”). --bez-serwera pomija ten krok (np. bez sieci).
  2. import_posty_meta.py: posty, których nie ma w posts.json, z katalogu kopii (CEL z ustawień kopii).
  3. build_review.py, gdy coś doszło, nie ma review.html albo szablon strony jest nowszy (po git pull).
  4. Podpowiedzi modelu dla kart „Nowe od…”: zrzut katalogu z Payload (cms: npm run katalog:snapshot, tylko odczyt),
     classify_posts.py --run (Terra; karty już ocenione biorą wynik z cache) i ponowne build_review.py.
     --bez-podpowiedzi pomija ten krok. Gdy coś się nie uda, przegląd i tak jest gotowy, tylko bez podpowiedzi.
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


def build(root, say):
    b = subprocess.run([sys.executable, str(HERE / "build_review.py"), str(root)], capture_output=True, text=True, timeout=1800)
    if b.returncode != 0:
        say("przebudowa przeglądu nie wyszła: " + (b.stderr or b.stdout).strip()[-600:])
    return b.returncode == 0


def hints(root, say):
    """Zrzut katalogu + podpowiedzi Terry dla kart „Nowe od…”. True, gdy podpowiedzi są gotowe."""
    cms = HERE.parent.parent / "cms"
    say("Czytam katalog z Payload (tylko odczyt)…")
    try:
        k = subprocess.run(["npm", "run", "-s", "katalog:snapshot", "--", "--out", str(Path(root).resolve() / "katalog.json")],
                           cwd=cms, capture_output=True, text=True, timeout=600)
    except (OSError, subprocess.TimeoutExpired) as e:
        say(f"zrzut katalogu nie wyszedł ({e}); podpowiedzi pominięte")
        return False
    if k.returncode != 0:
        say("zrzut katalogu nie wyszedł; podpowiedzi pominięte: " + (k.stderr or k.stdout).strip()[-300:])
        return False
    say((k.stdout.strip().splitlines() or ["katalog gotowy"])[-1].split(" → ")[0])
    say("Model ocenia nowe posty (Terra)…")
    try:
        c = subprocess.run([sys.executable, str(HERE / "classify_posts.py"), "--dir", str(root), "--run"],
                           capture_output=True, text=True, timeout=3600)
    except subprocess.TimeoutExpired:
        say("podpowiedzi trwały ponad godzinę, przerwane")
        return False
    errors = [ln for ln in c.stdout.splitlines() if "BŁĄD" in ln]
    if c.returncode != 0:
        say("podpowiedzi nie wyszły: " + (c.stderr or c.stdout).strip()[-300:])
        return False
    say(f"podpowiedzi gotowe{f', błędy przy {len(errors)} kartach' if errors else ''}")
    return True


def stale_pages(root):
    """Brak stron przeglądu albo szablon nowszy niż strona (np. po git pull z nowym przyciskiem): trzeba przebudować."""
    for template, page in (("review_template.html", "review.html"), ("szczegoly_template.html", "szczegoly.html")):
        out = Path(root) / page
        if not out.exists() or (HERE / template).stat().st_mtime > out.stat().st_mtime:
            return True
    return False


def refresh(root, from_server=True, log=print, with_hints=True):
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
        need_hints = with_hints and (r["added"] or not (root / "classify" / "results.json").exists())
        if r["added"] or stale_pages(root):
            say("Przebudowuję przegląd…")
            if not build(root, say):
                return {"ok": False, "added": r["added"], "rebuilt": False, "lines": lines}
            rebuilt = True
        if need_hints and hints(root, say):
            rebuilt = build(root, say) or rebuilt
        if rebuilt:
            say("przegląd gotowy")
        return {"ok": True, "added": r["added"], "rebuilt": rebuilt, "lines": lines}
    finally:
        RUNNING.release()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    root = Path(args[0]) if args else HERE.parent.parent / "data" / "facebook"
    res = refresh(root, from_server="--bez-serwera" not in sys.argv, with_hints="--bez-podpowiedzi" not in sys.argv)
    sys.exit(0 if res["ok"] else 1)


if __name__ == "__main__":
    main()
