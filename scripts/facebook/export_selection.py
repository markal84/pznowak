#!/usr/bin/env python3
"""Eksport decyzji z przeglądu FB do data/facebook/catalog-selection.json.

Użycie:  python3 scripts/facebook/export_selection.py [data/facebook]
Czyta review-data.json (z build_review.py) i selection.json (z review_server.py). Tylko zapisuje plik wynikowy;
import do CMS-a to osobne zadanie (cms: npm run fb:do-istniejacych i import-fb-catalog, zawsze jako szkic).
Ta sama logika (compute) odpowiada przeglądowi na pytanie „co się stanie z tym postem” (GET /api/plan w review_server.py),
więc tablica pokazuje dokładnie to, co zrobi eksport.

Wynik:
  catalog            pierścionki do katalogu (decyzja karty „katalog”, co najmniej jedno zdjęcie „w katalogu”).
                     photos: okładka pierwsza, reszta w kolejności z karty; videos: filmy „w katalogu”.
  galleryAdditions   zdjęcia/filmy z postów pierścionków, które już są w katalogu, oznaczone „dodaj do galerii”,
                     i karty „dodaj do karty…” bez wariantu.
  videoOnly          karty „nowa karta” z samym filmem (bez zdjęć): nie tworzą szkicu, bo to dodatek do istniejącej karty.
  toExisting         zdjęcia do konkretnej istniejącej karty → cms: npm run fb:do-istniejacych (wersje robocze):
                       - „dodaj do karty…” z wariantem kamienia (action dodatek albo zamiast-wizualizacji z pola action),
                       - karty „katalog” z podpowiedzią Terry dla istniejącej karty (dodatek / zamiast-wizualizacji /
                         nowy-wariant, classify_posts.py), chyba że w przeglądzie zaznaczono „to nowy pierścionek” (newRing).
  alreadyInCatalog   karty, których zdjęcia już są w karcie katalogu (np. szkic zrobiony wcześniej z tego posta).
  materials          wszystko oznaczone „materiał” (płaska lista, bez duplikatów, z postem źródłowym).
  warnings           niespójności (np. zdjęcie „w katalogu” w karcie, która nie jest katalogowa).

Wpis karty w selection.json (cards[klucz]):
  decision   catalog = NOWA karta (szkic w CMS), addto = do istniejącej karty, material, reject; brak = nieprzejrzana.
  newRing    true: „to nowy pierścionek” mimo podpowiedzi modelu, że to istniejąca karta (bez tego „katalog” z taką
             podpowiedzią idzie do toExisting, jak dawniej).
  target     addto: nazwa karty z katalogu; product: jej slug (pewniejszy niż nazwa, gdy jest).
  variant    addto: kamień wariantu (np. Turmalin); action: zamiast-wizualizacji, gdy prawdziwe zdjęcie ma zastąpić
             wizualizację tego wariantu (domyślnie dodatek).
  media      {plik: catalog|gallery|material|skip} ręczne decyzje zdjęć; reszta dziedziczy z decyzji karty.
  cover, name, note, sameAs, notSame, complete (sekcja existing) jak dotąd.
Nowa karta dostaje nazwę tylko z przeglądu (własna) albo z kanonu; tytuł posta nigdy nie jest nazwą
(name = "" → import zostawia nazwę i opis do uzupełnienia). Opis nigdy nie jest kopią posta.

Pierścienie „Już w katalogu” oznaczone „kompletne – bez zmian” są pomijane w całości (decyzje zdjęć zostają w
selection.json, ale eksport ich nie widzi). Karty z polem sameAs (to ten sam pierścionek co inna karta) dołączają
do karty docelowej: liczy się tylko jej decyzja, nazwa i okładka, a zdjęcia, filmy i posty obu kart trafiają do jednego
wpisu (mergedFrom). Decyzja pliku: najpierw zapisana w karcie docelowej, potem w karcie, z której plik pochodzi, na końcu
dziedziczona z decyzji karty docelowej. Tak samo liczy to przegląd.

Pliki oznaczone jako treść AI (ai-flags.json, zob. manual_media.py) nie trafiają do catalog ani galleryAdditions, dopóki
w ai-flags.json nie ma "allow": true (jawna decyzja Marcina); w materials dostają "ai": true. Każde wykluczenie to ostrzeżenie.
Posty ręczne (manual-<id>, media spoza FB) mają url null i pole source.
"""
import json
import unicodedata
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import manual_media  # noqa: E402

INHERIT = {"catalog": "catalog", "addto": "gallery", "material": "material", "reject": "skip"}
TARGETED = ("dodatek", "zamiast-wizualizacji", "nowy-wariant")
CARD_SECTIONS = ("new", "maybe", "fresh")


def load_canon():
    """Imiona z kanonu (zlecenie S): karta bez własnej nazwy dostaje imię, gdy tytuł pasuje do wzorca z nazwy-kanon.json."""
    return json.loads((HERE / "nazwy-kanon.json").read_text(encoding="utf-8"))["rules"]


def canon_name(title, canon):
    for rule in canon:
        if re.search(rule["match"], title, re.IGNORECASE):
            return rule["name"]
    return ""


def own_name(e, label, canon):
    """Nazwa nowej karty: własna z przeglądu (nie sam tytuł posta) albo z kanonu; inaczej pusta, do uzupełnienia."""
    own = (e.get("name") or "").strip()
    return "" if own == label.strip() else own or canon_name(label, canon)


def post_out(p):
    out = {"postId": p["post_id"], "date": p["date"], "url": None if manual_media.is_manual_post(p["post_id"]) else f"https://www.facebook.com/{p['post_id']}", "text": p["text"]}
    if p.get("source"):
        out["source"] = p["source"]
    return out


def post_of(group, file):
    pid = file.split("_")[0]
    return post_out(next((p for p in group["posts"] if p["post_id"] == pid), group["posts"][0]))


def posts_out(group):
    return [post_out(p) for p in group["posts"]]


def unique_posts(groups):
    seen, out = set(), []
    for gg in groups:
        for p in posts_out(gg):
            if p["postId"] not in seen:
                seen.add(p["postId"])
                out.append(p)
    return out


def compute(data, sel, canon=None):
    """Liczy wynik eksportu bez zapisu. Zwraca (out, outcomes).

    outcomes: {klucz karty (new/maybe/fresh): {"kind": ..., ...}} – co eksport zrobi z kartą, do pokazania w przeglądzie.
    kind: undecided | merged | already | new | toExisting | gallery | material | reject | problem.
    """
    canon = load_canon() if canon is None else canon
    cards, existing, skipped = sel.get("cards", {}), sel.get("existing", {}), sel.get("skipped", {})
    sim = data.get("sim") or {}
    ai_blocked = {f for sec in (*CARD_SECTIONS, "existing") for g in data.get(sec, []) for f, a in g.get("ai", {}).items() if not a.get("allow")}
    ai_all = {f for sec in (*CARD_SECTIONS, "existing") for g in data.get(sec, []) for f in g.get("ai", {})}
    CARDS = {g["key"]: g for sec in CARD_SECTIONS for g in data.get(sec, [])}
    SEC = {g["key"]: sec for sec in CARD_SECTIONS for g in data.get(sec, [])}
    # Podpowiedzi Terry (classify_posts.py): karta „katalog” z podpowiedzią dla istniejącej karty idzie do toExisting,
    # a karta, której zdjęcia już są w katalogu (fromPost), nie tworzy drugiego szkicu.
    HINTS = data.get("hints") or {}
    # Karty, których post już jest w katalogu (facebookKey albo źródło zdjęcia; build_review.py, ze świeżego katalog.json).
    IN_CATALOG = data.get("inCatalog") or {}
    NAMES = {x["slug"]: x["name"] for x in data.get("catalogProducts", [])}
    # Pliki z FB, które już są w kartach (build_review.py, ze świeżego katalog.json) i szkice zrobione wcześniej z posta.
    FILES = data.get("catalogFiles") or {}
    DRAFTS = data.get("draftsFromPost") or {}
    warnings, outcomes = [], {}

    def settle(o, slug, variant, photos, videos, action):
        """Co z planu już jest w karcie: wszystko → „already” (kolumna „Już w katalogu”), sam film do wariantu, którego
        nie ma (albo ma tylko wizualizację) → „waiting”. Plik nadal idzie do eksportu: import i tak go nie zdubluje."""
        cf = FILES.get(slug)
        if not cf:
            return o
        have = set(cf.get("files") or [])
        v = (cf.get("variants") or {}).get(unicodedata.normalize("NFC", variant.strip().lower())) if variant else None
        has_video = bool(v and v.get("video")) if variant else bool(cf.get("video"))
        left_photos = [p for p in photos if p not in have]
        left_videos = [x for x in videos if x not in have and not has_video]
        name = o.get("productName") or NAMES.get(slug, slug)
        if not left_photos and not left_videos:
            return {"kind": "already", "product": slug, "productName": name, "settled": True}
        if variant and action == "dodatek" and (v is None or v.get("vis")) and not left_photos:
            return {"kind": "waiting", "product": slug, "productName": name, "variant": variant, "videos": len(left_videos),
                    "reason": "variant-missing" if v is None else "variant-visualization"}
        if variant and v is None and left_photos:
            o = {**o, "createsVariant": True}
        return o

    def warn(key, msg):
        warnings.append(msg)
        if key in outcomes:
            outcomes[key].setdefault("warnings", []).append(msg)

    def root_of(key):
        """Karta docelowa łańcucha sameAs; w cyklu korzeniem jest najmniejszy klucz (jak w przeglądzie)."""
        path, cur = [], key
        while cards.get(cur, {}).get("sameAs") in CARDS and cur not in path:
            path.append(cur)
            cur = cards[cur]["sameAs"]
        if cur in path:
            cur = min(path[path.index(cur):])
        return cur

    roots = {k: root_of(k) for k in CARDS}
    members = {}
    for k, r in roots.items():
        if r != k:
            members.setdefault(r, []).append(k)

    def card_eff(key, file):
        """Decyzja pliku w grupie połączonych kart, której korzeniem jest key."""
        for kk in [key, *members.get(key, [])]:
            v = (cards.get(kk) or {}).get("media", {}).get(file)
            if v:
                return v
        return INHERIT.get((cards.get(key) or {}).get("decision"))

    def slug_for(e):
        target = (e.get("target") or "").strip()
        if e.get("product") in NAMES:
            return e["product"]
        return next((x["slug"] for x in data.get("catalogProducts", []) if x["name"].strip().lower() == target.lower() or x["slug"] == target), "")

    catalog, additions, materials, seen = [], [], [], set()
    video_only, to_existing, already = [], [], []
    complete_rings = undecided = rejected = merged = 0

    def add_material(group, file, kind, origin, source):
        if file in seen:
            return
        seen.add(file)
        m = {"file": f"media/{file}", "kind": kind, "origin": origin, "source": source, "post": post_of(group, file)}
        if file in ai_all:
            m["ai"] = True
        materials.append(m)

    for k, g in CARDS.items():
        sid = (cards.get(k) or {}).get("sameAs")
        if sid and sid not in CARDS:
            warnings.append(f"„{g['title']}”: połączona z kartą, której nie ma w przeglądzie ({sid}), traktuję jako osobną")
        if roots[k] != k:
            merged += 1
            outcomes[k] = {"kind": "merged", "root": roots[k]}
            continue
        sec = SEC[k]
        e = cards.get(k) or {}
        dec = e.get("decision")
        label = g["title"]
        hint = HINTS.get(k) or {}
        h = hint.get("result") or {}
        hint_already = bool(h.get("product") and h["product"] in (hint.get("fromPost") or []))
        # Karta bez decyzji, której zdjęcia już są w katalogu (podpowiedź „już w katalogu”), ale z plikiem zaznaczonym ręcznie „w katalogu”
        # (np. film z dołączonej karty): to jawna decyzja o pliku, więc liczy się jak „katalog” (film trafi do tej karty, nie zginie).
        if not dec and hint_already and any(
                v == "catalog" for kk in [k, *members.get(k, [])] for v in ((cards.get(kk) or {}).get("media") or {}).values()):
            dec = "catalog"
        group = [g] + [CARDS[m] for m in members.get(k, [])]
        owner, files = {}, []
        for gg in group:
            for f, kind in [(f, "photo") for f in gg["photos"]] + [(v["file"], "video") for v in gg["videos"]]:
                if f not in owner:
                    owner[f] = gg
                    files.append((f, kind))
        if not dec:
            if hint_already:
                outcomes[k] = {"kind": "already", "product": h["product"], "productName": hint.get("productName") or NAMES.get(h["product"], h["product"])}
            elif IN_CATALOG.get(k):
                outcomes[k] = {"kind": "already", "product": IN_CATALOG[k][0], "productName": NAMES.get(IN_CATALOG[k][0], IN_CATALOG[k][0])}
            else:
                undecided += 1
                outcomes[k] = {"kind": "undecided"}
        elif dec == "reject":
            rejected += 1
            outcomes[k] = {"kind": "reject"}
        elif dec == "material":
            outcomes[k] = {"kind": "material"}
        else:
            outcomes[k] = {"kind": "problem"}
        cat = [(f, kind) for f, kind in files if card_eff(k, f) == "catalog"]
        for f, _ in [c for c in cat if c[0] in ai_blocked]:
            warn(k, f"„{label}”: {f} ma oznaczenie treści AI – wykluczone z katalogu (zgoda: \"allow\": true w ai-flags.json)")
        cat = [c for c in cat if c[0] not in ai_blocked]
        mat = 0
        for f, kind in files:
            if card_eff(k, f) == "material":
                mat += 1
                add_material(owner[f], f, kind, "karta", {"key": k, "title": label})
        if dec == "material":
            outcomes[k]["files"] = mat
        if dec == "catalog":
            photos = [f for f, kind in cat if kind == "photo"]
            videos = [f for f, kind in cat if kind == "video"]
            cover = e.get("cover") if e.get("cover") in photos else (photos[0] if photos else None)
            for p in photos:
                on_site = sim.get("newOnSite", {}).get(owner[p]["key"], {})
                if p in on_site:
                    warn(k, f"„{label}”: zdjęcie {p} wygląda na już obecne na stronie ({on_site[p]['product']})")
            if not photos:
                warn(k, f"„{label}”: karta w katalogu, ale bez zdjęć oznaczonych „w katalogu”")
            if cover:
                photos = [cover] + [p for p in photos if p != cover]
            posts = unique_posts(group)
            item = {
                "key": k, "name": own_name(e, label, canon), "titleOpus": label, "note": e.get("note", ""),
                "section": sec, "cover": f"media/{cover}" if cover else None,
                "photos": [f"media/{p}" for p in photos], "videos": [f"media/{v}" for v in videos], "posts": posts,
            }
            if hint_already:
                name = hint.get("productName") or h["product"]
                already.append({"key": k, "title": label, "product": h["product"], "productName": name})
                outcomes[k] = {"kind": "already", "product": h["product"], "productName": name}
                if videos:
                    # Zdjęcia już są w karcie, ale film (np. z dołączonej karty innego posta) nie: dodatek tylko z filmem.
                    # Import pomija film, który karta już ma, więc ponowny eksport niczego nie dubluje.
                    to_existing.append({**item, "photos": [], "cover": None, "action": "dodatek", "product": h["product"],
                                        "productName": name, "variant": "",
                                        "confidence": h.get("confidence"), "reason": "film do karty, której zdjęcia już są w katalogu"})
                    outcomes[k]["videos"] = len(videos)
                continue
            if not photos:
                # Sam film nie jest nowym pierścionkiem: dodatek do karty z podpowiedzi albo do ręcznego wskazania w przeglądzie.
                prod = h.get("product") and (hint.get("productName") or h["product"])
                if prod and videos:
                    additions.append({"key": k, "ring": prod, "photos": [], "videos": [f"media/{v}" for v in videos], "posts": posts})
                    outcomes[k] = {"kind": "gallery", "ring": prod, "photos": 0, "videos": len(videos)}
                    warn(k, f"„{label}”: sam film, bez zdjęć – zamiast nowej karty dodany do „{prod}” (podpowiedź modelu, do sprawdzenia)")
                elif videos:
                    video_only.append({"key": k, "title": label, "videos": [f"media/{v}" for v in videos], "posts": posts})
                    outcomes[k] = {"kind": "problem", "reason": "video-only"}
                    warn(k, f"„{label}”: sam film, bez zdjęć – nie tworzę nowej karty; wskaż w przeglądzie „dodaj do karty…”")
                else:
                    outcomes[k] = {"kind": "problem", "reason": "no-files"}
                continue
            if h.get("category") in TARGETED and h.get("product") and not e.get("newRing"):
                item.update(action=h["category"], product=h["product"], productName=hint.get("productName") or h["product"],
                            variant=h.get("variant") or "", confidence=h.get("confidence"), reason=h.get("reason") or "")
            if len(group) > 1:
                item["mergedFrom"] = []
                for m in group[1:]:
                    me = cards.get(m["key"]) or {}
                    item["mergedFrom"].append({"key": m["key"], "name": (me.get("name") or "").strip() or m["title"], "ownDecision": me.get("decision")})
                    if me.get("note"):
                        item["note"] = (item["note"] + "\n" if item["note"] else "") + f"[{m['title']}] {me['note']}"
            if item.get("action"):
                to_existing.append(item)
                outcomes[k] = settle({"kind": "toExisting", "action": item["action"], "product": item["product"], "productName": item["productName"],
                                      "variant": item["variant"], "photos": len(photos), "videos": len(videos), "fromHint": True},
                                     item["product"], item["variant"], photos, videos, item["action"])
            else:
                catalog.append(item)
                outcomes[k] = {"kind": "new", "photos": len(photos), "videos": len(videos), "name": item["name"]}
                if IN_CATALOG.get(k):
                    # Szkic z tego posta już jest (np. z wcześniejszego importu): import go pominie, przegląd pokazuje „w katalogu”.
                    outcomes[k] = {"kind": "already", "product": IN_CATALOG[k][0], "productName": NAMES.get(IN_CATALOG[k][0], IN_CATALOG[k][0])}
        elif dec == "addto":
            target = (e.get("target") or "").strip()
            sel_files = [(f, kind) for f, kind in files if card_eff(k, f) == "gallery" and f not in ai_blocked]
            photos, videos = [f for f, kind in sel_files if kind == "photo"], [f for f, kind in sel_files if kind == "video"]
            if not target:
                outcomes[k] = {"kind": "problem", "reason": "no-target"}
                warn(k, f"„{label}”: decyzja „dodaj do karty…” bez wskazanej karty – pominięta")
            elif photos or videos:
                posts = unique_posts(group)
                variant = (e.get("variant") or "").strip()
                if variant:
                    # Film/zdjęcia do WARIANTU karty (np. Hesperia → Turmalin). Decyzja zostaje w selection.json: gdy wariantu jeszcze nie ma
                    # albo ma tylko wizualizację, import czeka (fb:do-istniejacych) i zrobi swoje przy kolejnym uruchomieniu.
                    # action zamiast-wizualizacji: prawdziwe zdjęcia zastępują wizualizację tego wariantu (wybór w przeglądzie).
                    slug = slug_for(e)
                    if not slug:
                        outcomes[k] = {"kind": "problem", "reason": "unknown-target", "target": target}
                        warn(k, f"„{label}”: nie znaleziono karty „{target}” w katalog.json (npm run katalog:snapshot) – wariant „{variant}” pominięty")
                    else:
                        action = "zamiast-wizualizacji" if e.get("action") == "zamiast-wizualizacji" else "dodatek"
                        reason = ("ręczna decyzja w przeglądzie (prawdziwe zdjęcie zamiast wizualizacji)" if action != "dodatek"
                                  else "ręczna decyzja w przeglądzie (dodaj do karty + wariant)")
                        to_existing.append({"key": k, "name": label, "titleOpus": label, "note": e.get("note", ""), "cover": None, "photos": [f"media/{p}" for p in photos],
                                            "videos": [f"media/{v}" for v in videos], "posts": posts, "action": action, "product": slug, "productName": target,
                                            "variant": variant, "confidence": None, "reason": reason})
                        outcomes[k] = settle({"kind": "toExisting", "action": action, "product": slug, "productName": target, "variant": variant,
                                              "photos": len(photos), "videos": len(videos)}, slug, variant, photos, videos, action)
                else:
                    additions.append({"key": k, "ring": target, "photos": [f"media/{p}" for p in photos], "videos": [f"media/{v}" for v in videos], "posts": posts})
                    outcomes[k] = settle({"kind": "gallery", "ring": target, "product": slug_for(e), "photos": len(photos), "videos": len(videos)},
                                         slug_for(e), "", photos, videos, "dodatek")
            else:
                outcomes[k] = {"kind": "problem", "reason": "no-files"}
        elif cat:
            warn(k, f"„{label}”: {len(cat)} plik(ów) „w katalogu”, ale karta ma decyzję „{dec or '?'}”, pominięto")

    # Szkic zrobiony wcześniej z posta, który teraz idzie gdzie indziej (np. „nowa karta” zmieniona na wariant Hesperii):
    # import go nie usuwa (usuwanie zostaje u Marcina), opisy go pomijają, tablica pokazuje go do usunięcia.
    orphans = []
    for k, o in outcomes.items():
        if o.get("kind") in ("new", "merged", "undecided"):
            continue
        for d in DRAFTS.get(k, []):
            if d.get("slug") == o.get("product"):
                continue
            where = o.get("productName") or o.get("ring") or {"material": "materiałów", "reject": "pominiętych"}.get(o["kind"], "innej karty")
            o.setdefault("orphanDrafts", []).append(d)
            orphans.append({**d, "key": k, "post": CARDS[k]["title"], "now": where})
            warn(k, f"„{CARDS[k]['title']}”: szkic „{d.get('name') or d.get('slug')}” (#{d.get('id')}) powstał wcześniej z tego posta, "
                    f"a teraz post idzie do: {where} – ten szkic jest zbędny, usuń go w panelu")

    for g in data["existing"]:
        e = existing.get(g["key"]) or {}
        if e.get("complete"):
            complete_rings += 1
            continue
        media = e.get("media", {})
        files = [(f, "photo") for f in g["photos"]] + [(v["file"], "video") for v in g["videos"]]
        add = [(f, k) for f, k in files if media.get(f) == "gallery"]
        for f, _ in [a for a in add if a[0] in ai_blocked]:
            warnings.append(f"„{g['title']}”: {f} ma oznaczenie treści AI – wykluczone z galerii (zgoda: \"allow\": true w ai-flags.json)")
        add = [a for a in add if a[0] not in ai_blocked]
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
    known = {"cards": set(CARDS), "existing": {g["key"] for g in data["existing"]},
             "skipped": {g["key"] for g in data["skipped"]}}
    for b, keys in known.items():
        for k in sel.get(b, {}):
            if k not in keys:
                warnings.append(f"osierocona decyzja {b}/{k} (pominięta w eksporcie)")

    out = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "selectionRev": sel.get("rev", 0),
        "summary": {
            "catalogRings": len(catalog), "videoOnly": len(video_only), "toExisting": len(to_existing), "alreadyInCatalog": len(already),
            "galleryAdditions": len(additions), "materials": len(materials),
            "cardsUndecided": undecided, "cardsRejected": rejected, "ringsCompleteNoChange": complete_rings, "cardsMerged": merged,
            "warnings": len(warnings),
        },
        "catalog": catalog,
        "videoOnly": video_only,
        "toExisting": to_existing,
        "alreadyInCatalog": already,
        "galleryAdditions": additions,
        "materials": materials,
        "orphanDrafts": orphans,
        "warnings": warnings,
    }
    return out, outcomes


def load(root):
    root = Path(root)
    data = json.loads((root / "review-data.json").read_text(encoding="utf-8"))
    sel_path = root / "selection.json"
    sel = json.loads(sel_path.read_text(encoding="utf-8")) if sel_path.exists() else {}
    return data, sel


def summary_line(out):
    s = out["summary"]
    return (f"catalog-selection.json: {s['catalogRings']} pierścionków do katalogu, {s['toExisting']} do istniejących kart "
            f"(już w katalogu: {s['alreadyInCatalog']}), {s['galleryAdditions']} uzupełnień galerii, "
            f"{s['materials']} materiałów; połączonych kart: {s['cardsMerged']}; kompletnych pierścionków (pominięte): {s['ringsCompleteNoChange']}; "
            f"nieprzejrzanych kart: {s['cardsUndecided']}; ostrzeżeń: {s['warnings']}")


def main(argv):
    root = Path(argv[1] if len(argv) > 1 else HERE.parent.parent / "data" / "facebook")
    out, _ = compute(*load(root))
    (root / "catalog-selection.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(summary_line(out))


if __name__ == "__main__":
    main(sys.argv)
