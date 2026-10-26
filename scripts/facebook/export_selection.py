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
selection.json, ale eksport ich nie widzi). Karty z polem sameAs (to ten sam pierścionek co inna karta) dołączają
do karty docelowej: liczy się tylko jej decyzja, nazwa i okładka, a zdjęcia, filmy i posty obu kart trafiają do jednego
wpisu (mergedFrom). Decyzja pliku: najpierw zapisana w karcie docelowej, potem w karcie, z której plik pochodzi, na końcu
dziedziczona z decyzji karty docelowej. Tak samo liczy to przegląd (review_template.html).
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


CARDS = {g["key"]: g for sec in ("new", "maybe") for g in data[sec]}


def root_of(key):
    """Karta docelowa łańcucha sameAs; w cyklu korzeniem jest najmniejszy klucz (jak w przeglądzie)."""
    path, cur = [], key
    while cards.get(cur, {}).get("sameAs") in CARDS and cur not in path:
        path.append(cur)
        cur = cards[cur]["sameAs"]
    if cur in path:
        cur = min(path[path.index(cur):])
    return cur


MEMBERS = {}
for k in CARDS:
    if root_of(k) != k:
        MEMBERS.setdefault(root_of(k), []).append(k)


def card_eff(key, file):
    """Decyzja pliku w grupie połączonych kart, której korzeniem jest key."""
    for k in [key, *MEMBERS.get(key, [])]:
        v = (cards.get(k) or {}).get("media", {}).get(file)
        if v:
            return v
    return INHERIT.get((cards.get(key) or {}).get("decision"))


catalog, additions, materials, seen = [], [], [], set()
complete_rings = 0
undecided = rejected = 0


def add_material(group, file, kind, origin, source):
    if file in seen:
        return
    seen.add(file)
    materials.append({"file": f"media/{file}", "kind": kind, "origin": origin, "source": source, "post": post_of(group, file)})


merged = 0
for k, g in CARDS.items():
    sid = (cards.get(k) or {}).get("sameAs")
    if sid and sid not in CARDS:
        warnings.append(f"„{g['title']}”: połączona z kartą, której nie ma w przeglądzie ({sid}), traktuję jako osobną")
    if root_of(k) != k:
        merged += 1
        continue
    sec = "new" if g in data["new"] else "maybe"
    e = cards.get(k) or {}
    dec = e.get("decision")
    label = g["title"]
    if not dec:
        undecided += 1
    elif dec == "reject":
        rejected += 1
    group = [g] + [CARDS[m] for m in MEMBERS.get(k, [])]
    owner, files = {}, []
    for gg in group:
        for f, kind in [(f, "photo") for f in gg["photos"]] + [(v["file"], "video") for v in gg["videos"]]:
            if f not in owner:
                owner[f] = gg
                files.append((f, kind))
    cat = [(f, kind) for f, kind in files if card_eff(k, f) == "catalog"]
    for f, kind in files:
        if card_eff(k, f) == "material":
            add_material(owner[f], f, kind, "karta", {"key": k, "title": label})
    if dec == "catalog":
        photos = [f for f, kind in cat if kind == "photo"]
        videos = [f for f, kind in cat if kind == "video"]
        cover = e.get("cover") if e.get("cover") in photos else (photos[0] if photos else None)
        for p in photos:
            on_site = sim.get("newOnSite", {}).get(owner[p]["key"], {})
            if p in on_site:
                warnings.append(f"„{label}”: zdjęcie {p} wygląda na już obecne na stronie ({on_site[p]['product']})")
        if not photos:
            warnings.append(f"„{label}”: karta w katalogu, ale bez zdjęć oznaczonych „w katalogu”")
        if cover:
            photos = [cover] + [p for p in photos if p != cover]
        note = e.get("note", "")
        posts, have = [], set()
        for gg in group:
            for p in posts_out(gg):
                if p["postId"] not in have:
                    have.add(p["postId"])
                    posts.append(p)
        item = {
            "key": k, "name": (e.get("name") or "").strip() or label, "titleOpus": label, "note": note,
            "section": sec, "cover": f"media/{cover}" if cover else None,
            "photos": [f"media/{p}" for p in photos], "videos": [f"media/{v}" for v in videos], "posts": posts,
        }
        if len(group) > 1:
            item["mergedFrom"] = []
            for m in group[1:]:
                me = cards.get(m["key"]) or {}
                item["mergedFrom"].append({"key": m["key"], "name": (me.get("name") or "").strip() or m["title"], "ownDecision": me.get("decision")})
                if me.get("note"):
                    item["note"] = (item["note"] + "\n" if item["note"] else "") + f"[{m['title']}] {me['note']}"
        catalog.append(item)
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
