#!/usr/bin/env python3
"""Zdjęcia pierścionków z folderu na Macu → „wirtualne posty” na tablicy przeglądu (sekcja „Nowe od…”).

Użycie (z katalogu głównego repo):
  python3 scripts/facebook/dodaj_lokalne.py ~/Downloads/nowe_pierscionki
  python3 scripts/facebook/dodaj_lokalne.py ~/Downloads/nowe_pierscionki --na-sucho      # tylko pokaż, co zrobi
Opcje: --dir data/facebook, --bez-podpowiedzi (bez zrzutu katalogu i podpowiedzi modelu), --na-sucho.

Jeden pierścionek = jeden podfolder (np. nowe_pierscionki/soliter/, nowe_pierscionki/tanzanit/). Folder bez podfolderów
ze zdjęciami to jeden pierścionek. Zdjęcia: .jpg, .jpeg, .heic, .heif, .png (wielkość liter bez znaczenia; HEIC i PNG
zamienia na JPG przez `sips`). Filmów nie bierze (te przychodzą z postów FB).

Co robi:
  1. kopiuje zdjęcia do data/facebook/manual/<dzisiaj>_mac-<folder>/ i pisze tam manual.json z "fresh": true
     (format w manual_media.py); oryginały zostają nietknięte,
  2. przebudowuje tablicę (build_review.py): każdy podfolder to karta w „Nowe od…” z plakietką „z Maca”,
  3. podpowiedzi modelu dla kart „Nowe od…” jak przy „Pobierz nowe posty” (refresh_posts.hints: zrzut katalogu tylko
     do odczytu + classify_posts.py; karty już ocenione nic nie kosztują).
Dalej jak z postem z FB: decyzja na tablicy (np. „Ten sam co inny post”, żeby połączyć zdjęcia z filmem z FB),
„Przygotuj eksport”, „Zastosuj eksport” (szkice). Skrypt nie zapisuje nic do Payload ani do selection.json.
Pierścionek, którego id już jest w którymś manual.json, jest pomijany, więc polecenie można powtarzać.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import manual_media  # noqa: E402

IMG = {".jpg", ".jpeg", ".heic", ".heif", ".png"}
VID = {".mov", ".mp4", ".m4v"}


def slug(t):
    t = t.lower().replace("ł", "l")
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "bez-nazwy"


def images(folder):
    return sorted((f for f in folder.iterdir() if f.is_file() and not f.name.startswith(".") and f.suffix.lower() in IMG),
                  key=lambda f: f.name.lower())


def rings(src):
    """[(nazwa, [pliki])]: podfoldery ze zdjęciami, a gdy ich nie ma, cały folder jako jeden pierścionek."""
    subs = [d for d in sorted(src.iterdir(), key=lambda d: d.name.lower()) if d.is_dir() and not d.name.startswith(".")]
    out = [(d.name, images(d)) for d in subs]
    out = [(n, f) for n, f in out if f]
    if out:
        loose = images(src)
        return out, loose
    return [(src.name, images(src))], []


def copy_jpg(src, dst, say):
    if src.suffix.lower() in (".jpg", ".jpeg"):
        shutil.copy2(src, dst)
        return True
    r = subprocess.run(["sips", "-s", "format", "jpeg", str(src), "--out", str(dst)], capture_output=True, text=True)
    if r.returncode != 0 or not dst.exists():
        say(f"  nie umiem zamienić {src.name} na JPG (sips): {(r.stderr or r.stdout).strip()[-200:]}")
        return False
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("folder")
    ap.add_argument("--dir", default=str(HERE.parent.parent / "data" / "facebook"))
    ap.add_argument("--bez-podpowiedzi", action="store_true")
    ap.add_argument("--na-sucho", action="store_true")
    a = ap.parse_args()
    say = print
    src = Path(a.folder).expanduser().resolve()
    root = Path(a.dir).resolve()
    if not src.is_dir():
        sys.exit(f"Nie ma folderu {src}")
    if not (root / "posts.json").exists():
        sys.exit(f"{root} nie wygląda na data/facebook (brak posts.json)")

    found, loose = rings(src)
    if loose:
        say(f"UWAGA: {len(loose)} zdjęć leży luzem obok podfolderów ({', '.join(f.name for f in loose[:5])}…); "
            "pomijam je – włóż je do podfolderu pierścionka i uruchom jeszcze raz.")
    vids = [f for f in src.rglob("*") if f.suffix.lower() in VID]
    if vids:
        say(f"UWAGA: pomijam {len(vids)} film(y) – filmy wchodzą z postów FB.")
    known = {c["id"] for c in manual_media.load_manual(root)}
    today = date.today().isoformat()
    base = slug(src.name)
    target = root / "manual" / f"{today}_mac-{base}"
    cards, skipped = [], []
    for name, files in found:
        cid = f"mac-{base}" if name == src.name else f"mac-{base}-{slug(name)}"
        if cid in known:
            skipped.append(name)
            continue
        cards.append({"id": cid, "name": name, "src": files})
    for n in skipped:
        say(f"już na tablicy, pomijam: {n}")
    if not cards:
        say("Nic nowego do dodania.")
        return
    for c in cards:
        say(f"pierścionek „{c['name']}”: {len(c['src'])} zdjęć ({', '.join(f.name for f in c['src'])})")
    if a.na_sucho:
        say(f"(na sucho) zapisałabym {len(cards)} kart do {target}")
        return

    target.mkdir(parents=True, exist_ok=True)
    spec_path = target / "manual.json"
    spec = json.loads(spec_path.read_text(encoding="utf-8")) if spec_path.exists() else {
        "version": 1, "source": f"Mac: {src.name} ({today[8:10]}.{today[5:7]}.{today[:4]})", "date": today,
        "fresh": True, "local": True, "cards": []}
    for c in cards:
        sub = target / slug(c["name"])
        sub.mkdir(exist_ok=True)
        files = []
        for f in c["src"]:
            out = sub / (slug(f.stem) + ".jpg")
            if copy_jpg(f, out, say):
                files.append(f"{sub.name}/{out.name}")
        if not files:
            continue
        spec["cards"].append({"id": c["id"], "title": c["name"].replace("_", " "),
                              "note": f"Zdjęcia z Maca: {src}/{'' if c['name'] == src.name else c['name']}".rstrip("/"),
                              "files": files})
    spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    say(f"zapisane: {spec_path}")

    import refresh_posts  # noqa: E402  (dopiero tu: import nie ma skutków ubocznych, ale nie jest potrzebny na sucho)

    say("Przebudowuję tablicę…")
    if not refresh_posts.build(root, say):
        sys.exit(1)
    if not a.bez_podpowiedzi and refresh_posts.hints(root, say):
        refresh_posts.build(root, say)
    say(f"Gotowe: {len(cards)} pierścionek(i) w „Nowe od…” na tablicy. Odśwież stronę tablicy (Cmd+R).")


if __name__ == "__main__":
    main()
