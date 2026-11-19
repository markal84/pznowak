#!/usr/bin/env python3
"""„Zastosuj eksport”: cały łańcuch po „Przygotuj eksport”, uruchamiany z tablicy przeglądu (review_server.py).

Kliknięcie przycisku na tablicy jest świadomym potwierdzeniem Marcina zamiast wpisywania słowa PRODUKCJA. Kroki
(w cms/, każdy jako osobny proces npm, z PZNOWAK_ZAPIS_Z_TABLICY=1, bez terminala):
  1. nowe pierścionki jako szkice         npm run import:fb -- --apply
  2. zdjęcia do galerii kart              npm run import:fb -- --apply --gallery
  3. zdjęcia do istniejących kart         npm run fb:do-istniejacych -- --apply
  4. imię, opisy i parametry (model)      npm run opisz:szkice -- --model --apply
  5. odświeżenie katalogu tablicy         npm run katalog:snapshot (błąd tu nie psuje przebiegu)
Wszystko trafia do szkiców albo wersji roboczych; publikuje zawsze Marcin w panelu. Krok, który nie ma czego robić
(np. brak zdjęć do istniejących kart), jest pomijany. Po błędzie łańcuch staje, a ponowne kliknięcie jest bezpieczne:
import pomija karty, które już są, galerie nie dublują zdjęć, opisy wpisują tylko puste pola.

Stan przebiegu: data/facebook/zastosuj-stan.json, pełny zapis wyjścia: data/facebook/zastosuj-<czas>.log.
Uruchomienie bez tablicy (to samo co przycisk): python3 scripts/facebook/zastosuj_eksport.py [--na-sucho]
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
CMS = REPO / "cms"
SITE = os.environ.get("PZNOWAK_CMS_URL", "https://pznowak.pl").rstrip("/")
KEY_FILE = Path(os.environ.get("PZNOWAK_AUTOMAT_KEY_FILE") or Path.home() / ".config" / "pznowak-cms" / "automat.key")
STATE_NAME = "zastosuj-stan.json"

# (id, etykieta, polecenie npm, limit czasu w s, czy błąd zatrzymuje łańcuch, pole summary – krok pomijany, gdy 0)
STEPS = [
    ("nowe", "Nowe pierścionki jako szkice", ["import:fb", "--", "--apply"], 30 * 60, True, "catalogRings"),
    ("galeria", "Zdjęcia do galerii kart", ["import:fb", "--", "--apply", "--gallery"], 30 * 60, True, "galleryAdditions"),
    ("istniejace", "Zdjęcia do istniejących kart", ["fb:do-istniejacych", "--", "--apply"], 30 * 60, True, "toExisting"),
    ("opisy", "Imię, opisy i parametry (model)", ["opisz:szkice", "--", "--model", "--apply"], 90 * 60, True, None),
    ("katalog", "Odświeżenie katalogu na tablicy", ["katalog:snapshot"], 10 * 60, False, None),
]

LOCK = threading.Lock()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def find_claude():
    """Ta sama kolejność co cms/scripts/opisz-model.ts: PZNOWAK_CLAUDE_BIN, PATH, typowe miejsca na Macu."""
    home = Path.home()
    for cand in [os.environ.get("PZNOWAK_CLAUDE_BIN"), shutil.which("claude"), home / ".local/bin/claude",
                 home / ".claude/local/claude", "/opt/homebrew/bin/claude", "/usr/local/bin/claude"]:
        if cand and os.path.isfile(cand) and os.access(cand, os.X_OK):
            return str(cand)
    return ""


def read_key():
    if os.environ.get("PZNOWAK_AUTOMAT_KEY", "").strip():
        return os.environ["PZNOWAK_AUTOMAT_KEY"].strip()
    try:
        return KEY_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def interpret_me(status, body):
    """Odpowiedź GET /api/users/me z kluczem → (ok, komunikat). Osobno, żeby dało się to sprawdzić testem.

    Konto Automat ma rolę Redaktor, a kolekcja users ma `read: isAdmin`, więc Payload odpowiada na /me z DOBRYM kluczem
    HTTP 403 z błędem w JSON-ie (sprawdzenie dostępu przy odczycie konta). Zły klucz daje 200 i `"user": null`.
    403 bez JSON-a Payloadu (np. strona Cloudflare „error code: 1010”) to blokada po drodze, nie odpowiedź o kluczu.
    """
    try:
        data = json.loads(body or "{}")
    except ValueError:
        data = None
    if status == 200 and isinstance(data, dict):
        user = data.get("user")
        if not user:
            return False, "strona nie rozpoznała tego klucza"
        return True, f"klucz działa (konto {user.get('name') or user.get('email') or user.get('id')})"
    if status == 403 and isinstance(data, dict) and data.get("errors"):
        return True, "klucz działa (konto bez uprawnień administratora, tak ma być)"
    snippet = " ".join((body or "").split())[:80]
    return False, f"strona odpowiedziała HTTP {status}{f' ({snippet})' if snippet else ''}"


def check_key(key, timeout=20):
    """Czy klucz konta Automat działa (GET /api/users/me). Zwraca (ok, komunikat po ludzku)."""
    req = urllib.request.Request(f"{SITE}/api/users/me", headers={
        "Authorization": f"users API-Key {key}", "Accept": "application/json", "User-Agent": "pznowak-tablica/1"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return interpret_me(r.status, r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", "replace")
        except OSError:
            body = ""
        return interpret_me(e.code, body)
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return False, f"brak połączenia ze stroną ({e})"


def save_key(key):
    key = (key or "").strip()
    if not (20 <= len(key) <= 200) or any(c.isspace() for c in key):
        return False, "to nie wygląda na klucz API (wklej sam klucz, bez spacji)"
    ok, msg = check_key(key)
    if not ok:
        return False, f"nie zapisałam: {msg}"
    KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(KEY_FILE.parent, 0o700)
    tmp = KEY_FILE.with_name(KEY_FILE.name + ".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(key + "\n")
    os.replace(tmp, KEY_FILE)
    os.chmod(KEY_FILE, 0o600)
    return True, msg


def export_hash(root):
    p = Path(root) / "catalog-selection.json"
    try:
        return hashlib.sha256(p.read_bytes()).hexdigest()[:16]
    except OSError:
        return ""


def load_state(root):
    try:
        return json.loads((Path(root) / STATE_NAME).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"state": "idle"}


def write_state(root, state):
    p = Path(root) / STATE_NAME
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, p)


def preflight(root):
    """Czego brakuje, zanim łańcuch ruszy. Lista komunikatów po ludzku (pusta = można)."""
    problems = []
    if not (Path(root) / "catalog-selection.json").exists():
        problems.append("Najpierw „Przygotuj eksport” – nie ma jeszcze pliku eksportu.")
    if not (CMS / "node_modules").is_dir():
        problems.append("W cms/ brakuje zainstalowanych pakietów (node_modules) – to jednorazowa instalacja, daj znać Klaudii.")
    if not shutil.which("npm"):
        problems.append("Serwer tablicy nie widzi programu npm (uruchom tablicę z terminala, w którym działa npm).")
    if not read_key():
        problems.append(f"Brak klucza konta Automat. Wklej go w polu poniżej (zapiszę w {KEY_FILE}, tylko dla Ciebie).")
    if not find_claude():
        problems.append("Nie znalazłam programu claude (Claude Code) – bez niego model nie napisze opisów.")
    return problems


def status(root):
    st = load_state(root)
    h = export_hash(root)
    if st.get("state") == "running" and not LOCK.locked():
        st["state"] = "error"
        st["error"] = "przebieg przerwany (serwer tablicy został wyłączony w trakcie) – kliknij jeszcze raz"
    applied = st.get("appliedExport")
    st["exportHash"] = h
    st["pending"] = bool(h) and h != applied and st.get("state") != "running"
    st["missing"] = preflight(root) if st["pending"] or st.get("state") == "error" else []
    st["keyFile"] = str(KEY_FILE)
    st["site"] = SITE
    st["steps"] = st.get("steps") or [{"id": s[0], "label": s[1], "status": "waiting"} for s in STEPS]
    return st


def _summary(root):
    try:
        return json.loads((Path(root) / "catalog-selection.json").read_text(encoding="utf-8")).get("summary", {})
    except (OSError, ValueError):
        return {}


def _tail(text, n=25):
    lines = [ln for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines[-n:])


def run_chain(root, dry=False, log=print):
    """Cały łańcuch (wywoływany w osobnym wątku przez serwer albo z wiersza poleceń)."""
    root = Path(root)
    if not LOCK.acquire(blocking=False):
        return {"ok": False, "error": "przebieg już trwa"}
    try:
        h = export_hash(root)
        summary = _summary(root)
        stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        log_path = root / f"zastosuj-{stamp}.log"
        prev = load_state(root)
        steps = [{"id": s[0], "label": s[1], "status": "waiting"} for s in STEPS]
        st = {"state": "running", "startedAt": now(), "export": h, "appliedExport": prev.get("appliedExport"),
              "log": str(log_path), "steps": steps, "dry": dry}
        write_state(root, st)
        env = {**os.environ, "PZNOWAK_ZAPIS_Z_TABLICY": "1", "FORCE_COLOR": "0", "NO_COLOR": "1"}
        claude = find_claude()
        if claude:
            env["PZNOWAK_CLAUDE_BIN"] = claude
        with open(log_path, "w", encoding="utf-8") as logf:
            for (sid, label, cmd, timeout, fatal, need), step in zip(STEPS, steps):
                if need and not summary.get(need):
                    step.update(status="skipped", note="nic do zrobienia w tym eksporcie")
                    write_state(root, st)
                    continue
                if dry:
                    cmd = [c for c in cmd if c != "--apply"]
                step.update(status="running", startedAt=now())
                write_state(root, st)
                log(f"[zastosuj] {label}: npm run {' '.join(cmd)}")
                logf.write(f"\n===== {label} · npm run {' '.join(cmd)} · {now()} =====\n")
                logf.flush()
                t0 = time.monotonic()
                try:
                    r = subprocess.run(["npm", "run", "--silent", *cmd], cwd=CMS, env=env, stdin=subprocess.DEVNULL,
                                       capture_output=True, text=True, timeout=timeout)
                    out, code = (r.stdout or "") + (r.stderr or ""), r.returncode
                except subprocess.TimeoutExpired as e:
                    out = ((e.stdout or b"").decode("utf-8", "replace") if isinstance(e.stdout, bytes) else (e.stdout or ""))
                    out += f"\n! przekroczony limit czasu ({timeout // 60} min)"
                    code = -1
                except OSError as e:
                    out, code = f"! nie uruchomiłam npm: {e}", -1
                logf.write(out)
                logf.flush()
                step.update(status="done" if code == 0 else "error", seconds=round(time.monotonic() - t0),
                            tail=_tail(out, 12 if code == 0 else 30))
                write_state(root, st)
                if code != 0 and fatal:
                    st.update(state="error", finishedAt=now(), error=f"{label}: nie udało się (szczegóły niżej)")
                    write_state(root, st)
                    return {"ok": False, "error": st["error"]}
        try:
            st["opisy"] = json.loads((root / "opisz-szkice-ostatni.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            st["opisy"] = None
        st.update(state="done", finishedAt=now())
        if not dry:
            st["appliedExport"] = h
        write_state(root, st)
        return {"ok": True}
    except Exception as e:  # noqa: BLE001 – stan ma pokazać każdy błąd, a nie zostać „w toku”
        st = load_state(root)
        st.update(state="error", finishedAt=now(), error=f"nieoczekiwany błąd: {e}")
        write_state(root, st)
        return {"ok": False, "error": str(e)}
    finally:
        LOCK.release()


def start(root, log=print):
    """Start w tle (serwer). Zwraca (kod HTTP, odpowiedź)."""
    missing = preflight(root)
    if missing:
        return 400, {"ok": False, "missing": missing}
    if LOCK.locked():
        return 409, {"ok": False, "error": "przebieg już trwa"}
    threading.Thread(target=run_chain, args=(root,), kwargs={"log": log}, daemon=True).start()
    time.sleep(0.2)
    return 202, {"ok": True}


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(REPO / "data" / "facebook"))
    ap.add_argument("--na-sucho", action="store_true", help="każdy krok bez --apply (podgląd; model i tak pisze teksty)")
    a = ap.parse_args()
    miss = preflight(a.dir)
    if miss:
        sys.exit("\n".join(miss))
    res = run_chain(a.dir, dry=a.na_sucho)
    print(json.dumps(load_state(a.dir).get("steps"), ensure_ascii=False, indent=1))
    sys.exit(0 if res.get("ok") else 1)
