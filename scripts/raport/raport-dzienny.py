#!/usr/bin/env python3
"""Codzienny raport z Hetznera dla pznowak.pl: zwykły skrypt, bez modelu, jeden mail dziennie.

Sprawdza: stronę i /admin, wiek kopii zapasowych, wolne miejsce, skrypt postów FB na MyDevil
(przez SSH tylko do odczytu), kontenery Dockera. Tylko stdlib Pythona 3.
Konfiguracja: ~/.config/pznowak-raport/smtp.env (chmod 600), patrz README.md.
Uruchomienie: raport-dzienny.py [--na-sucho]   (na sucho: wypisuje mail na ekran, nic nie wysyła)
"""
import datetime as dt
import json
import os
import re
import shutil
import smtplib
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from email.message import EmailMessage
from pathlib import Path

HOME = Path.home()
CONF = Path(os.environ.get("PZNOWAK_RAPORT_CONF", HOME / ".config/pznowak-raport/smtp.env"))
BACKUP_ROOT = Path(os.environ.get("PZNOWAK_BACKUP_ROOT", HOME / "backups/pznowak-full"))
MYDEVIL = os.environ.get("PZNOWAK_MYDEVIL", "pznowak@s92.mydevil.net")
SSH_KEY = os.environ.get("PZNOWAK_SSH_KEY", str(HOME / ".ssh/pznowak_backup_pull"))
SITE = "https://pznowak.pl"
FULL_MAX_H, DB_MAX_H, DISK_MIN_GB = 26, 7, 5
EXPECTED_CONTAINERS = [c for c in os.environ.get("PZNOWAK_KONTENERY", "").split(",") if c]

OK, WARN, ERR = "OK", "UWAGA", "BŁĄD"
rows = []  # (poziom, sekcja, tekst)


def add(level, section, text):
    rows.append((level, section, text))


def now():
    return dt.datetime.now(dt.timezone.utc)


def age_h(ts):
    return (now() - ts).total_seconds() / 3600


def http_status(url):
    req = urllib.request.Request(url, headers={"User-Agent": "pznowak-raport/1"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # noqa: BLE001
        return f"{type(e).__name__}"


def check_site():
    for path in ("/", "/admin"):
        s = http_status(SITE + path)
        add(OK if s == 200 else ERR, "Strona", f"{SITE}{path} → {s}")


def check_backups():
    snaps = sorted((BACKUP_ROOT / "migawki").glob("*/OK")) if (BACKUP_ROOT / "migawki").exists() else []
    if snaps:
        t = dt.datetime.fromtimestamp(snaps[-1].stat().st_mtime, dt.timezone.utc)
        h = age_h(t)
        add(OK if h < FULL_MAX_H else ERR, "Kopie", f"pełna kopia: {h:.1f} h temu ({snaps[-1].parent.name}), limit {FULL_MAX_H} h")
    else:
        add(ERR, "Kopie", "brak udanej pełnej kopii (migawki/*/OK)")
    dumps = sorted((BACKUP_ROOT / "baza-co-6h").glob("live-*.dump")) if (BACKUP_ROOT / "baza-co-6h").exists() else []
    if dumps:
        h = age_h(dt.datetime.fromtimestamp(dumps[-1].stat().st_mtime, dt.timezone.utc))
        add(OK if h < DB_MAX_H else ERR, "Kopie", f"kopia bazy co 6 h: {h:.1f} h temu ({dumps[-1].name}), limit {DB_MAX_H} h")
    else:
        add(ERR, "Kopie", "brak kopii bazy co 6 h")
    free = shutil.disk_usage(HOME).free / 1e9
    add(OK if free >= DISK_MIN_GB else WARN, "Dysk", f"wolne {free:.1f} GB (próg {DISK_MIN_GB} GB)")


def rsync_live():
    """Pobiera na żywo stan.json, indeks.json i posty.log z MyDevil przez rsync (klucz kopii wpuszcza tylko rsync do odczytu,
    więc zwykłego polecenia przez SSH nie wykonamy). Zwraca słownik jak z lustra albo None."""
    import tempfile
    ssh = f"ssh -i {SSH_KEY} -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20"
    with tempfile.TemporaryDirectory() as tmp:
        for remote in ("pznowak-posty/dane/stan.json", "pznowak-posty/dane/indeks.json", "pznowak-posty/posty.log"):
            r = subprocess.run(["rsync", "-a", "-e", ssh, f"{MYDEVIL}:{remote}", tmp + "/"], capture_output=True, text=True, timeout=90)
            if r.returncode != 0 and remote.endswith("stan.json"):
                return None
        try:
            st = json.loads((Path(tmp) / "stan.json").read_text())
        except Exception:  # noqa: BLE001
            return None
        try:
            ix = json.loads((Path(tmp) / "indeks.json").read_text())
        except Exception:  # noqa: BLE001
            ix = None
        yesterday = (now() - dt.timedelta(hours=26)).strftime("%Y-%m-%d")
        lines = []
        try:
            for l in (Path(tmp) / "posty.log").read_text(errors="replace").splitlines()[-400:]:
                if l[:10] >= yesterday and ("BŁĄD" in l or "problem:" in l.lower() or re.search(r"\b[1-9]\d* problem", l)):
                    lines.append(l)
        except Exception:  # noqa: BLE001
            pass
        return {"stan": {k: st.get(k) for k in ("lastRunAt", "lastSuccessAt", "failStreak")}, "indeks": ix, "log": lines[-5:]}


def parse_iso(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def check_posts():
    source = "na żywo przez rsync"
    try:
        data = rsync_live()
    except Exception:  # noqa: BLE001
        data = None
    if data is None:
        # zapas: lustro z ostatniej pełnej kopii (do 24 h starości), bez logu
        mirror = BACKUP_ROOT / "_lustro/mydevil/posty-dane"
        try:
            st = json.loads((mirror / "stan.json").read_text())
            ix = json.loads((mirror / "indeks.json").read_text())
            data = {"stan": {k: st.get(k) for k in ("lastRunAt", "lastSuccessAt", "failStreak")}, "indeks": ix, "log": []}
            source = "lustro z kopii (do 24 h starości; rsync nie odpowiedział)"
            add(WARN, "Posty FB", "rsync z MyDevil nie zadziałał, dane z lustra kopii zapasowej")
        except Exception as e:  # noqa: BLE001
            add(ERR, "Posty FB", f"nie mogę odczytać stanu skryptu postów ({type(e).__name__})")
            return
    stan = data.get("stan") or {}
    ok_at = parse_iso(stan.get("lastSuccessAt"))
    if ok_at:
        h = age_h(ok_at)
        ref = now()
        if source.startswith("lustro"):  # lustro jest z chwili ostatniej pełnej kopii: mierzymy wiek względem niej
            snaps = sorted((BACKUP_ROOT / "migawki").glob("*/OK"))
            if snaps:
                ref = dt.datetime.fromtimestamp(snaps[-1].stat().st_mtime, dt.timezone.utc)
        gap = (ref - ok_at).total_seconds() / 3600
        add(OK if gap < 12 else ERR, "Posty FB", f"ostatnie udane uruchomienie: {h:.1f} h temu ({source})" + (f"; w chwili kopii minęło {gap:.1f} h" if source.startswith("lustro") else ""))
    else:
        add(ERR, "Posty FB", "brak udanego uruchomienia w stan.json")
    if stan.get("failStreak"):
        add(WARN, "Posty FB", f"nieudane uruchomienia z rzędu: {stan['failStreak']}")
    for line in data.get("log") or []:
        add(WARN, "Posty FB", f"log: {line[:200]}")
    rows_ix = (data.get("indeks") or {}).get("posts") or []
    cutoff = now() - dt.timedelta(hours=24)
    new = [p for p in rows_ix if (parse_iso(p.get("created_time")) or cutoff) >= cutoff]
    add(OK, "Posty FB", f"nowych postów z ostatnich 24 h: {len(new)}")
    for p in new[:5]:
        add(OK, "Posty FB", f"  • {(p.get('excerpt') or '')[:80]} {p.get('permalink') or ''}")


def check_docker():
    try:
        r = subprocess.run(["docker", "ps", "-a", "--format", "{{.Names}}\t{{.Status}}"], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            add(ERR, "Docker", "docker ps nie działa: " + r.stderr.strip()[:150])
            return
    except Exception as e:  # noqa: BLE001
        add(ERR, "Docker", f"docker niedostępny ({type(e).__name__})")
        return
    seen = {}
    for line in r.stdout.splitlines():
        name, _, status = line.partition("\t")
        seen[name] = status
        up = status.startswith("Up") and "unhealthy" not in status
        # kontenery jednorazowe (np. pg_dump) znikają same (--rm); zatrzymane inne zgłaszamy
        add(OK if up else WARN, "Docker", f"{name}: {status}")
    for want in EXPECTED_CONTAINERS:
        if want not in seen:
            add(ERR, "Docker", f"brak kontenera {want}")
    if not seen:
        add(WARN, "Docker", "brak kontenerów")


PAYLOAD_KEY = Path(os.environ.get("PZNOWAK_PAYLOAD_KEY", HOME / ".config/pznowak-raport/automat.key"))
DRAFT_COLLECTIONS = [("products", "pierścionki"), ("works", "realizacje"), ("gallery-items", "galeria")]


def check_drafts():
    """Liczba szkiców w Payload (konto „Automat", tylko odczyt). Pomijane, dopóki nie ma pliku z kluczem."""
    if not PAYLOAD_KEY.exists():
        return
    key = PAYLOAD_KEY.read_text().strip()
    parts, failed = [], False
    for slug, label in DRAFT_COLLECTIONS:
        url = f"{SITE}/api/{slug}?where[_status][equals]=draft&limit=1&depth=0"
        req = urllib.request.Request(url, headers={"Authorization": f"users API-Key {key}", "User-Agent": "pznowak-raport/1"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                parts.append(f"{label}: {json.load(r).get('totalDocs', '?')}")
        except urllib.error.HTTPError as e:
            failed = True
            parts.append(f"{label}: błąd {e.code}")
        except Exception as e:  # noqa: BLE001
            failed = True
            parts.append(f"{label}: {type(e).__name__}")
    add(WARN if failed else OK, "Payload", "szkice czekające na publikację: " + ", ".join(parts))


DEPLOY_RESULT = Path(os.environ.get("PZNOWAK_DEPLOY_DIR", HOME / "pznowak-autodeploy")) / "wynik.json"


def check_deploy():
    """Wynik nocnego auto-deployu (scripts/deploy/auto-deploy.py). Pomijane, dopóki auto-deploy nie jest zainstalowany."""
    if not DEPLOY_RESULT.parent.exists():
        return
    try:
        w = json.loads(DEPLOY_RESULT.read_text())
    except Exception:  # noqa: BLE001
        add(WARN, "Deploy", "brak wyniku nocnego auto-deployu (wynik.json)")
        return
    h = age_h(parse_iso(w["czas"]))
    zakres = f" ({w['od']} → {w['do']})" if w.get("od") and w.get("do") else ""
    level = {"brak": OK, "wdrozono": OK, "migracje": WARN}.get(w["status"], ERR)
    label = {"brak": "brak zmian", "wdrozono": "wdrożono", "migracje": "NIE wdrożono (migracje)"}.get(w["status"], "BŁĄD")
    add(level, "Deploy", f"{label}{zakres}: {w['opis']} [{h:.1f} h temu]")
    if h > 30:
        add(WARN, "Deploy", f"wynik jest stary ({h:.0f} h): cron auto-deployu nie działa?")


def load_env(path):
    env = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def build():
    worst = ERR if any(r[0] == ERR for r in rows) else WARN if any(r[0] == WARN for r in rows) else OK
    icon = {OK: "✅", WARN: "⚠️", ERR: "❌"}[worst]
    subject = f"{icon} PZ Nowak: raport z Hetznera {dt.date.today():%d.%m.%Y}" + ("" if worst == OK else f" ({worst})")
    lines, section = [], None
    for lvl, sec, txt in rows:
        if sec != section:
            lines += ["", sec.upper()]
            section = sec
        lines.append(f" {({OK: '✓', WARN: '!', ERR: '✗'})[lvl]} {txt}")
    if not PAYLOAD_KEY.exists():
        lines += ["", "Sprawdzenie szkiców w Payload: jeszcze nie włączone (czeka na klucz konta „Automat”)."]
    return subject, "\n".join(lines).strip() + "\n"


def send(subject, body):
    env = load_env(CONF)
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = env["SMTP_FROM"], env["RAPORT_TO"], subject
    msg.set_content(body)
    port = int(env.get("SMTP_PORT", "465"))
    ctx = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(env["SMTP_HOST"], port, context=ctx, timeout=30) as s:
            s.login(env["SMTP_USER"], env["SMTP_PASS"]); s.send_message(msg)
    else:
        with smtplib.SMTP(env["SMTP_HOST"], port, timeout=30) as s:
            s.starttls(context=ctx); s.login(env["SMTP_USER"], env["SMTP_PASS"]); s.send_message(msg)


def main():
    for fn in (check_site, check_backups, check_posts, check_docker, check_deploy, check_drafts):
        try:
            fn()
        except Exception as e:  # noqa: BLE001  jedno sprawdzenie nie może zepsuć reszty raportu
            add(ERR, fn.__name__, f"wyjątek: {type(e).__name__}: {e}")
    subject, body = build()
    if "--na-sucho" in sys.argv:
        print(subject + "\n\n" + body)
        return
    send(subject, body)
    print(f"{now():%F %T} UTC: mail wysłany: {subject}")


if __name__ == "__main__":
    main()
