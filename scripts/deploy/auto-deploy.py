#!/usr/bin/env python3
"""Nocny auto-deploy pznowak.pl: Hetzner pyta MyDevil, czy origin/main ma nowsze commity niż wdrożone, i je wdraża.

Zwykły skrypt (bez modelu), tylko stdlib Pythona 3. Łączy się kluczem ~/.ssh/pznowak_deploy, który na MyDevil
jest przypięty do cms/scripts/mydevil/deploy-ssh.sh (tylko polecenia "status" i "deploy").
Zasady: brak zmian = nic nie robi; migracje w nowych commitach, brudne drzewo albo brak fast-forward = NIE wdraża,
tylko zapisuje to w wyniku (raport dzienny pokaże ostrzeżenie). Po wdrożeniu sprawdza / i /admin (200).
Wynik: ~/pznowak-autodeploy/wynik.json, ostatni wdrożony SHA: ~/pznowak-autodeploy/wdrozony-sha.
Uruchomienie: auto-deploy.py [--na-sucho]  (na sucho: tylko status i decyzja, bez wdrożenia, bez zapisu wyniku)
"""
import datetime as dt
import fcntl
import json
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


def ssh(cmd, timeout):
    args = ["ssh", "-i", SSH_KEY, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20", MYDEVIL, cmd]
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout)


def http_status(url):
    req = urllib.request.Request(url, headers={"User-Agent": "pznowak-autodeploy/1"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # noqa: BLE001
        return type(e).__name__


def decide():
    """Zwraca (status, od, do, opis) bez wdrażania. status: brak | wdrozyc | migracje | blad"""
    r = ssh("status", 120)
    if r.returncode != 0:
        return "blad", None, None, f"status z MyDevil nie zadziałał (kod {r.returncode}): {r.stderr.strip()[:200]}"
    info = dict(l.split("=", 1) for l in r.stdout.splitlines() if "=" in l)
    try:
        head, remote, n = info["head"], info["remote"], int(info["commity"])
    except (KeyError, ValueError):
        return "blad", None, None, f"nieczytelna odpowiedź statusu: {r.stdout.strip()[:200]}"
    if head == remote or n == 0:
        return "brak", head[:7], remote[:7], "brak nowych commitów na main"
    if info.get("ff") != "1":
        return "blad", head[:7], remote[:7], "main nie jest fast-forwardem względem wdrożonej wersji, deploy ręcznie"
    if info.get("brudne", "0") != "0":
        return "blad", head[:7], remote[:7], f"na MyDevil są zmiany w śledzonych plikach ({info['brudne']}), deploy ręcznie"
    if info.get("migracje", "0") != "0":
        return "migracje", head[:7], remote[:7], f"{n} nowych commitów zawiera migracje ({info['migracje']} plików w cms/src/migrations): deploy i migracje ręcznie"
    return "wdrozyc", head[:7], remote[:7], f"{n} nowych commitów, bez migracji"


def deploy(od, do):
    r = ssh("deploy", DEPLOY_TIMEOUT_S)
    tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-6:])
    if r.returncode != 0:
        return "blad", f"deploy zakończony kodem {r.returncode}:\n{tail}"
    time.sleep(10)
    bad = [f"{p} → {s}" for p in ("/", "/admin") if (s := http_status(SITE + p)) != 200]
    if bad:
        return "blad", "po wdrożeniu strona nie odpowiada 200: " + "; ".join(bad)
    (STATE_DIR / "wdrozony-sha").write_text(do + "\n")
    return "wdrozono", f"wdrożono {od} → {do}, / i /admin → 200"


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
        if status == "wdrozyc" and not dry:
            status, opis = deploy(od, do)
    except Exception as e:  # noqa: BLE001
        status, od, do, opis = "blad", None, None, f"wyjątek: {type(e).__name__}: {e}"
    wynik = {"czas": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "status": status, "od": od, "do": do, "opis": opis}
    print(json.dumps(wynik, ensure_ascii=False))
    if not dry:
        tmp = STATE_DIR / "wynik.json.tmp"
        tmp.write_text(json.dumps(wynik, ensure_ascii=False, indent=1))
        tmp.replace(STATE_DIR / "wynik.json")


if __name__ == "__main__":
    main()
