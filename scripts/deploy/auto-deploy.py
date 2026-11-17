#!/usr/bin/env python3
"""Nocny auto-deploy pznowak.pl: Hetzner pyta MyDevil, czy origin/main ma nowsze commity niż wdrożone, i je wdraża.

Zwykły skrypt (bez modelu), tylko stdlib Pythona 3. Łączy się kluczem ~/.ssh/pznowak_deploy, który na MyDevil
jest przypięty do cms/scripts/mydevil/deploy-ssh.sh (tylko polecenia "status" i "deploy").
Zasady: brak zmian = nic nie robi; migracje w nowych commitach, brudne drzewo albo brak fast-forward = NIE wdraża,
tylko zapisuje to w wyniku (raport dzienny pokaże ostrzeżenie). Wdraża dokładnie ten commit, który sprawdził status
(nie „najnowszy main w chwili deployu”). Po każdej próbie wdrożenia sprawdza / i /admin (200, kilka prób przez ~3 min).
Nieudany deploy (npm ci/build/restart/health-check) zostawia znacznik nieudany-deploy: kolejnej nocy skrypt ponawia
deploy, nawet gdy MyDevil ma już ten commit (git przesuwa się przed buildem, więc sam status pokazałby „brak zmian”).
Wynik: ~/pznowak-autodeploy/wynik.json, ostatni wdrożony SHA: ~/pznowak-autodeploy/wdrozony-sha.
Uruchomienie: auto-deploy.py [--na-sucho]  (na sucho: tylko status i decyzja, bez wdrożenia, bez zapisu wyniku)
"""
import datetime as dt
import fcntl
import json
import re
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HOME = Path.home()
STATE_DIR = Path(os.environ.get("PZNOWAK_DEPLOY_DIR", HOME / "pznowak-autodeploy"))
MYDEVIL = os.environ.get("PZNOWAK_MYDEVIL", "pznowak@s92.mydevil.net")
SSH_KEY = os.environ.get("PZNOWAK_DEPLOY_KEY", str(HOME / ".ssh/pznowak_deploy"))
SITE = "https://pznowak.pl"
DEPLOY_TIMEOUT_S = 25 * 60
HEALTH_WAIT_S = 180
SHA_RE = re.compile(r"[0-9a-f]{40}")
MARKER = STATE_DIR / "nieudany-deploy"


def ssh(cmd, timeout):
    args = ["ssh", "-i", SSH_KEY, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20", MYDEVIL, cmd]
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout)


def http_status(url):
    req = urllib.request.Request(url, headers={"User-Agent": "pznowak-autodeploy/1", "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # noqa: BLE001
        return type(e).__name__


def health():
    """Lista problemów z / i /admin (pusta = OK). Po restarcie aplikacja startuje na zimno, więc kilka prób."""
    end = time.monotonic() + HEALTH_WAIT_S
    while True:
        bust = f"?autodeploy={int(time.time())}"  # omija ewentualny cache przed stroną
        bad = [f"{p} → {s}" for p in ("/", "/admin") if (s := http_status(SITE + p + bust)) != 200]
        if not bad or time.monotonic() > end:
            return bad
        time.sleep(15)


def decide():
    """Zwraca (status, head, remote, opis) bez wdrażania; head/remote to pełne SHA. status: brak | wdrozyc | migracje | blad"""
    r = ssh("status", 120)
    if r.returncode != 0:
        return "blad", None, None, f"status z MyDevil nie zadziałał (kod {r.returncode}): {r.stderr.strip()[:200]}"
    info = dict(l.split("=", 1) for l in r.stdout.splitlines() if "=" in l)
    try:
        head, remote, n = info["head"], info["remote"], int(info["commity"])
    except (KeyError, ValueError):
        return "blad", None, None, f"nieczytelna odpowiedź statusu: {r.stdout.strip()[:200]}"
    if not (SHA_RE.fullmatch(head) and SHA_RE.fullmatch(remote)):
        return "blad", None, None, f"nieczytelne SHA w statusie: {r.stdout.strip()[:200]}"
    if head == remote or n == 0:
        return "brak", head, remote, "brak nowych commitów na main"
    if info.get("ff") != "1":
        return "blad", head, remote, "main nie jest fast-forwardem względem wdrożonej wersji, deploy ręcznie"
    if info.get("brudne", "0") != "0":
        return "blad", head, remote, f"na MyDevil są zmiany w śledzonych plikach ({info['brudne']}), deploy ręcznie"
    if info.get("migracje", "0") != "0":
        return "migracje", head, remote, f"{n} nowych commitów zawiera migracje ({info['migracje']} plików w cms/src/migrations): deploy i migracje ręcznie"
    return "wdrozyc", head, remote, f"{n} nowych commitów, bez migracji"


def deploy(od, do, ponowienie=False):
    """Wdraża commit do (pełne SHA). Znacznik nieudany-deploy znika tylko po pełnym sukcesie (deploy + health-check)."""
    MARKER.write_text(do + "\n")
    zakres = f"{od[:7]} → {do[:7]}" + (" (ponowienie nieudanego deployu)" if ponowienie else "")
    try:
        r = ssh(f"deploy {do}", DEPLOY_TIMEOUT_S)
        ok, kod, tail = r.returncode == 0, r.returncode, "\n".join((r.stdout + r.stderr).strip().splitlines()[-6:])
    except subprocess.TimeoutExpired:
        ok, kod, tail = False, "timeout", f"brak odpowiedzi przez {DEPLOY_TIMEOUT_S // 60} min"
    if ok:
        time.sleep(10)
    bad = health()
    strona = "strona: / i /admin → 200" if not bad else "STRONA NIE ODPOWIADA 200: " + "; ".join(bad)
    if not ok:
        return "blad", f"deploy {zakres} nieudany (kod {kod}); {strona}; kolejnej nocy spróbuję ponownie:\n{tail}"
    if bad:
        return "blad", f"deploy {zakres} przeszedł, ale {strona}; kolejnej nocy spróbuję ponownie"
    MARKER.unlink(missing_ok=True)
    (STATE_DIR / "wdrozony-sha").write_text(do + "\n")
    return "wdrozono", f"wdrożono {zakres}, / i /admin → 200"


def main():
    dry = "--na-sucho" in sys.argv
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    lock = open(STATE_DIR / ".lock", "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("inny auto-deploy już działa, wychodzę")
        return
    try:
        status, od, do, opis = decide()
        poprzedni_nieudany = MARKER.exists()
        if status == "brak" and poprzedni_nieudany:
            # MyDevil ma już ten commit w git, ale build/restart poprzednio nie przeszedł: budujemy jeszcze raz.
            status, do, opis = "wdrozyc", od, "poprzedni deploy nieudany, ponawiam"
        if dry:
            pass  # na sucho: tylko decyzja
        elif status == "wdrozyc":
            status, opis = deploy(od, do, ponowienie=(od == do))
        elif poprzedni_nieudany:
            opis += f"; UWAGA: poprzedni deploy ({MARKER.read_text().strip()[:7]}) się nie udał, sprawdź stronę"
    except Exception as e:  # noqa: BLE001
        status, od, do, opis = "blad", None, None, f"wyjątek: {type(e).__name__}: {e}"
    od, do = (od[:7] if od else None), (do[:7] if do else None)
    wynik = {"czas": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "status": status, "od": od, "do": do, "opis": opis}
    print(json.dumps(wynik, ensure_ascii=False))
    if not dry:
        tmp = STATE_DIR / "wynik.json.tmp"
        tmp.write_text(json.dumps(wynik, ensure_ascii=False, indent=1))
        tmp.replace(STATE_DIR / "wynik.json")


if __name__ == "__main__":
    main()
