"""Podobieństwo zdjęć po dHash: „na stronie” (stary katalog) i „możliwy dubel” (między kartami).

Używane przez build_review.py. Wymaga hashes.json z hash_images.mjs. Tylko stdlib.

Progi dobrane na danych (zob. raport G2):
  d <= SAME            to samo zdjęcie (rozmiar, kompresja, lekka korekta)
  SAME < d <= SIMILAR  „podobne?”: przycięte, przerobione albo inne ujęcie z tej samej sesji (do oceny okiem)
  d > SIMILAR          inne zdjęcie
Dubli między kartami szukamy ostrożniej: pary 11-18 między różnymi pierścionkami to głównie szum (podobne tło
i światło), więc pojedyncza para musi mieć d <= SAME, a „podobne” liczą się dopiero przy dwóch różnych parach
d <= DUP_SIMILAR.
Odległość to minimum z trzech porównań: całość-całość, środek 80 % FB-całość, całość FB-środek 80 % (przycięcia).
"""
import itertools
import json
import os
import re
from pathlib import Path

SAME = 10
SIMILAR = 18
DUP_SIMILAR = 14
MIN_BITS, MAX_BITS = 10, 54  # prawie jednolite obrazy (puste klatki) dają losowe hashe: pomijamy


def _h(s):
    return int(s, 16)


def _ok(h):
    return MIN_BITS <= _h(h["f"]).bit_count() <= MAX_BITS


def dist(a, b):
    """(najmniejsza odległość, metoda, odległość całość-całość)."""
    full = (_h(a["f"]) ^ _h(b["f"])).bit_count()
    cands = [(full, "całość"), ((_h(a["c"]) ^ _h(b["f"])).bit_count(), "kadr FB"), ((_h(a["f"]) ^ _h(b["c"])).bit_count(), "kadr strony")]
    d, m = min(cands)
    return d, m, full


def ring_names(title):
    t = re.sub(r"\(.*?\)", "", title)
    return [x.strip() for x in t.split("/") if x.strip()]


def group_images(g, hashes):
    out = [(f, hashes["fb"][f]) for f in g["photos"] if f in hashes["fb"]]
    for v in g["videos"]:
        stem = v["file"][:-4]
        for s in (25, 50, 75):
            k = f"frames/{stem}_{s}.jpg"
            if k in hashes["fb"]:
                out.append((k, hashes["fb"][k]))
    return [(f, h) for f, h in out if _ok(h)]


def compute(root, legacy_dir, data):
    root, legacy_dir = Path(root), Path(legacy_dir)
    hashes = json.loads((root / "hashes.json").read_text())
    coll = json.loads((legacy_dir / "collection.json").read_text())
    prod_imgs, owner = {}, {}
    for p in coll["products"]:
        imgs = [os.path.basename(i) for i in p.get("images", []) if os.path.basename(i) in hashes["legacy"]]
        prod_imgs[p["name"]] = {"images": imgs, "video": bool(p.get("video"))}
        for i in imgs:
            owner.setdefault(i, p["name"])
    for gimg in coll.get("gallery", []):
        b = os.path.basename(gimg.get("image", ""))
        if b in hashes["legacy"]:
            owner.setdefault(b, "galeria")
    legacy_all = [(i, hashes["legacy"][i]) for i in hashes["legacy"] if _ok(hashes["legacy"][i])]

    def best(h, cands):
        r = None
        for i, lh in cands:
            d, m, full = dist(h, lh)
            if r is None or d < r["d"]:
                r = {"d": d, "img": i, "method": m, "dFull": full}
        return r

    stats = {"hist": {}, "cropChanged": 0, "cropCrossSame": 0, "cropCrossSimilar": 0, "photos": 0}
    existing = {}
    for g in data["existing"]:
        names = ring_names(g["title"])
        found = [n for n in names if n in prod_imgs]
        own = [(i, hashes["legacy"][i]) for n in found for i in prod_imgs[n]["images"] if _ok(hashes["legacy"][i])]
        files = {}
        for f in g["photos"]:
            h = hashes["fb"].get(f)
            if not h or not _ok(h):
                continue
            stats["photos"] += 1
            bo = best(h, own) if own else None
            if bo:
                stats["hist"][bo["d"]] = stats["hist"].get(bo["d"], 0) + 1
                if bo["d"] < bo["dFull"]:
                    stats["cropChanged"] += 1
                    stats["cropCrossSame"] += bo["dFull"] > SAME >= bo["d"]
                    stats["cropCrossSimilar"] += bo["dFull"] > SIMILAR >= bo["d"]
            if bo and bo["d"] <= SIMILAR:
                files[f] = {"level": "on" if bo["d"] <= SAME else "similar", "d": bo["d"], "img": bo["img"], "product": owner.get(bo["img"]), "method": bo["method"]}
                continue
            ba = best(h, legacy_all)
            if ba and ba["d"] <= SAME:  # dopasowanie do innego produktu: tylko pewne (11-18 to tu szum)
                files[f] = {"level": "on", "d": ba["d"], "img": ba["img"], "product": owner.get(ba["img"]), "method": ba["method"], "other": True}
        existing[g["key"]] = {
            "products": found, "unmapped": [n for n in names if n not in prod_imgs],
            "siteVideo": any(prod_imgs[n]["video"] for n in found), "siteImages": len(own), "files": files,
        }

    new_on_site = {}
    for sec in ("new", "maybe"):
        for g in data[sec]:
            hits = {}
            for f in g["photos"]:
                h = hashes["fb"].get(f)
                if h and _ok(h):
                    b = best(h, legacy_all)
                    if b and b["d"] <= SAME:
                        hits[f] = {"level": "on", "d": b["d"], "img": b["img"], "product": owner.get(b["img"]), "method": b["method"]}
            if hits:
                new_on_site[g["key"]] = hits

    groups = [(s, g) for s in ("new", "maybe", "existing") for g in data[s]]
    label = {}
    for s in ("new", "maybe"):
        for i, g in enumerate(data[s]):
            label[g["key"]] = ("D" if s == "maybe" else "") + str(i + 1)
    imgs = {g["key"]: group_images(g, hashes) for _, g in groups}
    dups, excluded, spec_noise, matrix = {}, [], [], {}
    for (sa, A), (sb, B) in itertools.combinations(groups, 2):
        if sa == "existing" and sb == "existing":
            continue
        pairs = []
        for fa, ha in imgs[A["key"]]:
            for fb, hb in imgs[B["key"]]:
                if fa == fb:
                    continue
                d, _, _ = dist(ha, hb)
                if d <= SIMILAR:
                    pairs.append((d, fa, fb))
        if not pairs and sa == "existing":
            continue
        pairs.sort()
        matrix[(A["key"], B["key"])] = pairs[0][0] if pairs else None
        if not pairs:
            continue

        def distinct(limit):
            ua, ub, out = set(), set(), []
            for d, fa, fb in pairs:
                if d <= limit and fa not in ua and fb not in ub:
                    ua.add(fa), ub.add(fb), out.append((d, fa, fb))
            return out

        close, sim14, sim18 = [p for p in pairs if p[0] <= SAME], distinct(DUP_SIMILAR), distinct(SIMILAR)
        shared = {p["post_id"] for p in A["posts"]} & {p["post_id"] for p in B["posts"]}
        if close or len(sim14) >= 2:
            if shared:
                excluded.append({"a": A["title"], "b": B["title"], "why": "wspólny post (celowo rozdzielone karty)"})
                continue
            level = "close" if close else "similar"
            top = [{"a": fa, "b": fb, "d": d} for d, fa, fb in (close[:3] if close else sim14[:3])]
            dups.setdefault(A["key"], []).append({"other": B["key"], "level": level, "pairs": top})
            dups.setdefault(B["key"], []).append({"other": A["key"], "level": level, "pairs": [{"a": p["b"], "b": p["a"], "d": p["d"]} for p in top]})
        elif len(sim18) >= 2:
            spec_noise.append({"a": A["title"], "b": B["title"], "d": [p[0] for p in sim18[:3]]})

    # kontrola grup o podobnych tytułach (do raportu)
    title_groups = {}
    for kw in ("morganit", "ametyst", "niebieski", "turmalin", "szafir", "oliwin", "diament"):
        members = [g for s, g in groups if s != "existing" and kw in g["title"].lower()]
        rows = []
        for A, B in itertools.combinations(members, 2):
            d = matrix.get((A["key"], B["key"]), matrix.get((B["key"], A["key"])))
            rows.append({"a": A["title"], "b": B["title"], "minD": d})
        title_groups[kw] = {"cards": [g["title"] for g in members], "pairs": rows}

    result = {
        "thresholds": {"same": SAME, "similar": SIMILAR, "dupSimilar": DUP_SIMILAR},
        "labels": label, "existing": existing, "newOnSite": new_on_site, "dups": dups,
    }
    report = {"stats": stats, "excludedSharedPost": excluded, "specRuleNoise": spec_noise, "titleGroups": title_groups}
    return result, report
