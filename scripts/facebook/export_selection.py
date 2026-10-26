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

Pierścienie „Już w katalogu” oznaczone „kompletne – bez zmian” są pomijane w całości (decyzje zdjęć zostają w
selection.json, ale eksport ich nie widzi). Karty z polem sameAs (to ten sam pierścionek co inna karta) są łączone:
zdjęcia, filmy i posty trafiają do karty docelowej (mergedFrom), o ile obie mają decyzję „katalog”.
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
sim = data.get("sim") or {}

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
complete_rings = 0
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
            for p in photos:
                if p in sim.get("newOnSite", {}).get(g["key"], {}):
                    warnings.append(f"„{label}”: zdjęcie {p} wygląda na już obecne na stronie ({sim['newOnSite'][g['key']][p]['product']})")
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
    if e.get("complete"):
        complete_rings += 1
        continue
    media = e.get("media", {})
    files = [(f, "photo") for f in g["photos"]] + [(v["file"], "video") for v in g["videos"]]
    add = [(f, k) for f, k in files if media.get(f) == "gallery"]
    for f, k in files:
        if media.get(f) == "material":
            add_material(g, f, k, "istniejący pierścionek", {"key": g["key"], "title": g["title"]})
    on_site = (sim.get("existing", {}).get(g["key"]) or {}).get("files", {})
    for f, k in add:
        if on_site.get(f, {}).get("level") == "on":
            warnings.append(f"„{g['title']}”: zdjęcie {f} oznaczone „do galerii”, ale wygląda na już obecne na stronie (d={on_site[f]['d']})")
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

def merge_catalog():
    """Łączy karty oznaczone sameAs z kartą docelową (obie muszą być w katalogu)."""
    by_key = {c["key"]: c for c in catalog}
    away = set()
    for k in by_key:
        path, cur = [], k
        while cards.get(cur, {}).get("sameAs") and cards[cur]["sameAs"] != cur and cur not in path:
            path.append(cur)
            cur = cards[cur]["sameAs"]
        if cur in path:  # cykl: korzeniem jest najmniejszy klucz z cyklu
            cur = min(path[path.index(cur):])
        if cur == k:
            continue
        if cur not in by_key:
            warnings.append(f"„{by_key[k]['name']}”: oznaczona jako ten sam pierścionek co karta spoza katalogu ({cur}), nie łączę")
            continue
        t, c = by_key[cur], by_key[k]
        for field in ("photos", "videos"):
            t[field] += [x for x in c[field] if x not in t[field]]
        have = {p["postId"] for p in t["posts"]}
        t["posts"] += [p for p in c["posts"] if p["postId"] not in have]
        if c["note"]:
            t["note"] = (t["note"] + "\n" if t["note"] else "") + f"[{c['name']}] {c['note']}"
        t.setdefault("mergedFrom", []).append({"key": c["key"], "name": c["name"]})
        away.add(k)
    return [c for c in catalog if c["key"] not in away], len(away)


catalog, merged = merge_catalog()

out = {
    "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "selectionRev": sel.get("rev", 0),
    "summary": {
        "catalogRings": len(catalog), "galleryAdditions": len(additions), "materials": len(materials),
        "cardsUndecided": undecided, "cardsRejected": rejected, "ringsCompleteNoChange": complete_rings, "cardsMerged": merged,
        "warnings": len(warnings),
    },
    "catalog": catalog,
    "galleryAdditions": additions,
    "materials": materials,
    "warnings": warnings,
}
(root / "catalog-selection.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
s = out["summary"]
print(f"catalog-selection.json: {s['catalogRings']} pierścionków do katalogu, {s['galleryAdditions']} uzupełnień galerii, "
      f"{s['materials']} materiałów; połączonych kart: {merged}; kompletnych pierścionków (pominięte): {complete_rings}; "
      f"nieprzejrzanych kart: {undecided}; ostrzeżeń: {s['warnings']}")
