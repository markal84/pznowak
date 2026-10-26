#!/usr/bin/env python3
"""Eksport decyzji z przeglądu FB do data/facebook/catalog-selection.json.

Użycie:  python3 scripts/facebook/export_selection.py [data/facebook]
Czyta review-data.json (z build_review.py) i selection.json (z review_server.py). Tylko zapisuje plik wynikowy;
import do CMS-a to osobne zadanie.

Wynik:
  catalog            pierścionki do katalogu (decyzja karty „katalog”, co najmniej jedno zdjęcie „w katalogu”).
                     photos: okładka pierwsza, reszta w kolejności z karty; videos: filmy „w katalogu”.
  galleryAdditions   zdjęcia/filmy z postów pierścionków, które już są w katalogu, oznaczone „dodaj do galerii”.
  materials          wszystko oznaczone „materiał” (płaska lista, bez duplikatów, z postem źródłowym).
  warnings           niespójności (np. zdjęcie „w katalogu” w karcie, która nie jest katalogowa).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent.parent / "data" / "facebook")
data = json.loads((root / "review-data.json").read_text(encoding="utf-8"))
sel_path = root / "selection.json"
sel = json.loads(sel_path.read_text(encoding="utf-8")) if sel_path.exists() else {}
cards, existing, skipped = sel.get("cards", {}), sel.get("existing", {}), sel.get("skipped", {})

INHERIT = {"catalog": "catalog", "material": "material", "reject": "skip"}
warnings = []


def post_of(group, file):
    pid = file.split("_")[0]
    p = next((p for p in group["posts"] if p["post_id"] == pid), group["posts"][0])
    return {"postId": p["post_id"], "date": p["date"], "url": f"https://www.facebook.com/{p['post_id']}", "text": p["text"]}


def posts_out(group):
    return [{"postId": p["post_id"], "date": p["date"], "url": f"https://www.facebook.com/{p['post_id']}", "text": p["text"]} for p in group["posts"]]


def card_eff(entry, file):
    media = (entry or {}).get("media", {})
    return media.get(file) or INHERIT.get((entry or {}).get("decision"))


catalog, additions, materials, seen = [], [], [], set()
undecided = rejected = 0


def add_material(group, file, kind, origin, source):
    if file in seen:
        return
    seen.add(file)
    materials.append({"file": f"media/{file}", "kind": kind, "origin": origin, "source": source, "post": post_of(group, file)})


for sec in ("new", "maybe"):
    for g in data[sec]:
        e = cards.get(g["key"])
        dec = (e or {}).get("decision")
        label = g["title"]
        if not dec:
            undecided += 1
        elif dec == "reject":
            rejected += 1
        files = [(f, "photo") for f in g["photos"]] + [(v["file"], "video") for v in g["videos"]]
        cat = [(f, k) for f, k in files if card_eff(e, f) == "catalog"]
        for f, k in files:
            if card_eff(e, f) == "material":
                add_material(g, f, k, "karta", {"key": g["key"], "title": label})
        if dec == "catalog":
            photos = [f for f, k in cat if k == "photo"]
            videos = [f for f, k in cat if k == "video"]
            cover = e.get("cover") if e.get("cover") in photos else (photos[0] if photos else None)
            if not photos:
                warnings.append(f"„{label}”: karta w katalogu, ale bez zdjęć oznaczonych „w katalogu”")
            if cover:
                photos = [cover] + [p for p in photos if p != cover]
            catalog.append({
                "key": g["key"], "name": (e.get("name") or "").strip() or label, "titleOpus": label, "note": e.get("note", ""),
                "section": sec, "cover": f"media/{cover}" if cover else None,
                "photos": [f"media/{p}" for p in photos], "videos": [f"media/{v}" for v in videos], "posts": posts_out(g),
            })
        elif cat:
            warnings.append(f"„{label}”: {len(cat)} plik(ów) „w katalogu”, ale karta ma decyzję „{dec or '?'}”, pominięto")

for g in data["existing"]:
    e = existing.get(g["key"]) or {}
    media = e.get("media", {})
    files = [(f, "photo") for f in g["photos"]] + [(v["file"], "video") for v in g["videos"]]
    add = [(f, k) for f, k in files if media.get(f) == "gallery"]
    for f, k in files:
        if media.get(f) == "material":
            add_material(g, f, k, "istniejący pierścionek", {"key": g["key"], "title": g["title"]})
    if add:
        additions.append({
            "key": g["key"], "ring": g["title"],
            "photos": [f"media/{f}" for f, k in add if k == "photo"], "videos": [f"media/{f}" for f, k in add if k == "video"],
            "posts": posts_out(g),
        })

for g in data["skipped"]:
    if (skipped.get(g["key"]) or {}).get("decision") == "material":
        for f in g["photos"]:
            add_material(g, f, "photo", "pominięty post", {"key": g["key"], "title": f"post #{g['idx']}"})
        for v in g["videos"]:
            add_material(g, v["file"], "video", "pominięty post", {"key": g["key"], "title": f"post #{g['idx']}"})

# decyzje, których nie ma już w review-data.json
known = {"cards": {g["key"] for s in ("new", "maybe") for g in data[s]}, "existing": {g["key"] for g in data["existing"]},
         "skipped": {g["key"] for g in data["skipped"]}}
for b, keys in known.items():
    for k in sel.get(b, {}):
        if k not in keys:
            warnings.append(f"osierocona decyzja {b}/{k} (pominięta w eksporcie)")

out = {
    "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "selectionRev": sel.get("rev", 0),
    "summary": {
        "catalogRings": len(catalog), "galleryAdditions": len(additions), "materials": len(materials),
        "cardsUndecided": undecided, "cardsRejected": rejected, "warnings": len(warnings),
    },
    "catalog": catalog,
    "galleryAdditions": additions,
    "materials": materials,
    "warnings": warnings,
}
(root / "catalog-selection.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
s = out["summary"]
print(f"catalog-selection.json: {s['catalogRings']} pierścionków do katalogu, {s['galleryAdditions']} uzupełnień galerii, "
      f"{s['materials']} materiałów; nieprzejrzanych kart: {undecided}; ostrzeżeń: {s['warnings']}")
