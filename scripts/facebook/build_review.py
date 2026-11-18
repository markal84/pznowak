"""Buduje propozycję katalogu (rings-proposal.json), dane przeglądu (review-data.json) i stronę review.html z eksportu FB.

Użycie: python3 build_review.py data/facebook
Decyzje (selection.json) obsługuje review_server.py; ten skrypt ich nie dotyka.
Przy okazji odświeża miniatury (make_thumbs.py) i podobieństwa zdjęć (hash_images.mjs, similarity.py).
Propozycje połączeń kart („to ten sam pierścionek”) czyta z data/facebook/merge-proposals.json, jeśli plik jest.
Media spoza FB (data/facebook/manual/*/manual.json) i znaczniki treści AI (ai-flags.json): zob. manual_media.py.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import manual_media  # noqa: E402

root = Path(sys.argv[1])
# Media spoza FB trafiają do media/ przed wszystkim innym, żeby miniatury i hashe podobieństwa objęły je jak zdjęcia z FB.
MANUAL = manual_media.load_manual(root)
if MANUAL:
    print(f"media spoza FB: {len(MANUAL)} kart, skopiowano {manual_media.sync_media(root, MANUAL)} plików do media/")
MANUAL_EXTRA = manual_media.extras_by_post(MANUAL)
posts = json.loads((root / "posts.json").read_text())["posts"]
posts.sort(key=lambda p: p["time"] or 0)
media = sorted(p.name for p in (root / "media").iterdir())

# Grupowanie postów w karty leży w groups.json (adresowane po post_id, nie po numerze w kolejności).
# Format: {"version":1, "new":[{"title","posts":[post_id,..],"pick":{post_id:[nr zdjęcia,..]}}], "maybe":[..], "existing":[..],
#          "skipped":[post_id,..]}. Pierwszy jednorazowy zapis robi init_groups.py; dalej plik edytuje się ręcznie/skryptem.
# Post, którego nie ma w żadnej karcie ani w "skipped", jest nowy: dostaje własną kartę w sekcji „Nowe od DD.MM”.
groups = json.loads((root / "groups.json").read_text(encoding="utf-8"))
by_id = {p["post_id"]: i for i, p in enumerate(posts)}
assert len(by_id) == len(posts), "zdublowane post_id w posts.json"
for sec in ("new", "maybe", "existing"):
    for card in groups[sec]:
        for pid in card["posts"]:
            assert pid in by_id, f"groups.json: post {pid} (karta „{card['title']}”) nie istnieje w posts.json"
NEW = [(c["title"], [by_id[p] for p in c["posts"]]) for c in groups["new"]]
# Zdjęcia posta przypisane do konkretnej karty (np. post z dwoma ametystami rozdzielony na dwie karty).
SPLIT = {(c["title"], by_id[pid]): pick for c in groups["new"] for pid, pick in c.get("pick", {}).items()}
MAYBE = {c["title"]: [by_id[p] for p in c["posts"]] for c in groups["maybe"]}
EXISTING = {c["title"]: [by_id[p] for p in c["posts"]] for c in groups["existing"]}
assert len(MAYBE) == len(groups["maybe"]) and len(EXISTING) == len(groups["existing"]), "zdublowany tytuł karty w groups.json"
KNOWN = {p for sec in ("new", "maybe", "existing") for c in groups[sec] for p in c["posts"]} | set(groups.get("skipped", []))
FRESH = [i for i, p in enumerate(posts) if p["post_id"] not in KNOWN]


def files_for(idx, pick=None):
    p = posts[idx]
    photos = [f for f in media if f.startswith(p["post_id"] + "_") and f.endswith(".jpg") and "_thumb" not in f]
    order = [ph["id"] for ph in p["photos"]]
    photos.sort(key=lambda f: order.index(f.split("_")[1].split(".")[0]) if f.split("_")[1].split(".")[0] in order else 99)
    if pick is not None:
        photos = [photos[i] for i in pick if i < len(photos)]
    photos = photos + [f for f in MANUAL_EXTRA.get(p["post_id"], []) if f in media]
    videos = [f for f in media if f.startswith(p["post_id"] + "_") and f.endswith(".mp4")]
    return photos, videos


def video_height(name):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(root / "media" / name)],
        capture_output=True, text=True,
    ).stdout.strip().split("\n")[0].strip(",")
    w, h = (int(x) for x in out.split(",")[:2])
    return min(w, h)


def post_info(idx):
    p = posts[idx]
    return {"idx": idx, "post_id": p["post_id"], "date": (p["date"] or "")[:10], "text": p["text"]}


EMOJI = re.compile("[\u2190-\u2bff\u2600-\u27bf\u3030\u303d\u3297\u3299\u200d\ufe0f\U0001f000-\U0001faff\U000e0020-\U000e007f]")


def fresh_title(post, maxlen=70):
    """Tytuł roboczy karty nowego posta: pierwsze zdanie tekstu bez emoji i hasztagów, przycięte do maxlen znaków."""
    t = EMOJI.sub(" ", post["text"] or "")
    t = re.sub(r"(?<!\w)#\w+", " ", t)
    t = re.sub(r"https?://\S+", " ", t)
    t = re.sub(r"[ \t]+", " ", t).strip()
    first = next((ln.strip() for ln in t.splitlines() if ln.strip()), "")
    m = re.match(r"(.+?[.!?…])(\s|$)", first)
    first = (m.group(1) if m else first).strip(" -–—•*:;,.")
    if not first:
        d = (post["date"] or "")[:10]
        return f"Post z {d[8:10]}.{d[5:7]} (bez opisu)"
    if len(first) > maxlen:
        first = first[:maxlen].rsplit(" ", 1)[0].rstrip(" ,;:-–—") + "…"
    return first


def ddmm(date):
    return f"{date[8:10]}.{date[5:7]}"


proposal = {"new": [], "maybe": [], "existing": []}
for name, idxs in NEW:
    photos, videos = [], []
    for i in idxs:
        ph, vi = files_for(i, SPLIT.get((name, i)))
        photos += ph
        videos += vi
    proposal["new"].append({"title": name, "posts": [post_info(i) for i in idxs], "photos": photos, "videos": videos})
for name, idxs in MAYBE.items():
    photos, videos = [], []
    for i in idxs:
        ph, vi = files_for(i)
        photos += ph
        videos += vi
    proposal["maybe"].append({"title": name, "posts": [post_info(i) for i in idxs], "photos": photos, "videos": videos})
for name, idxs in EXISTING.items():
    proposal["existing"].append({"title": name, "posts": [post_info(i) for i in idxs]})
if FRESH:
    # Nowe od ostatniego grupowania: jedna karta na post, w kolejności chronologicznej. Etykieta sekcji z daty najstarszego z nich.
    proposal["fresh"] = []
    for i in FRESH:
        ph, vi = files_for(i)
        proposal["fresh"].append({"title": fresh_title(posts[i]), "posts": [post_info(i)], "photos": ph, "videos": vi})
used = {p["idx"] for sec in proposal.values() for r in sec for p in r["posts"]}
proposal["skipped"] = [post_info(i) for i in range(len(posts)) if i not in used]
(root / "rings-proposal.json").write_text(json.dumps(proposal, ensure_ascii=False, indent=1))


def slug(title):
    t = title.lower().replace("ł", "l")
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def video_info(name):
    stem = name[:-4]
    poster = f"frames/{stem}_25.jpg"
    return {"file": name, "q": video_height(name), "poster": poster if (root / poster).exists() else None}


def group(key, idxs, photos, videos, title=None):
    g = {"key": key, "posts": [post_info(i) for i in idxs], "photos": photos, "videos": [video_info(v) for v in videos]}
    if title is not None:
        g["title"] = title
    return g


def card_key(r):
    return f"{slug(r['title'])}@{r['posts'][0]['post_id']}"


def with_key(r):
    return group(card_key(r), [p["idx"] for p in r["posts"]], r.get("photos", []), r.get("videos", []), r["title"])


page_data = {
    "exportedAt": json.loads((root / "posts.json").read_text())["exportedAt"][:10],
    "nPosts": len(posts),
    "new": [with_key(r) for r in proposal["new"]],
    "maybe": [with_key(r) for r in proposal["maybe"]],
    "existing": [],
    "skipped": [],
}
if FRESH:
    page_data["freshSince"] = ddmm(min(post_info(i)["date"] for i in FRESH))
    page_data["fresh"] = [with_key(r) for r in proposal["fresh"]]
for card in manual_media.standalone_cards(MANUAL):
    # Osobna karta ze źródła ręcznego: na końcu „Nowych pierścionków”, więc numery wcześniejszych kart się nie zmieniają.
    g = {"key": f"{slug(card['title'])}@{manual_media.pseudo_post_id(card['id'])}", "title": card["title"],
         "posts": [manual_media.pseudo_post(card)], "photos": [n for _, n in card["files"]], "videos": [], "manualCard": card["source"]}
    page_data["new"].append(g)
for r in proposal["existing"]:
    photos, videos = [], []
    for p in r["posts"]:
        ph, vi = files_for(p["idx"])
        photos += ph
        videos += vi
    page_data["existing"].append(group(card_key(r), [p["idx"] for p in r["posts"]], photos, videos, r["title"]))
for p in proposal["skipped"]:
    ph, vi = files_for(p["idx"])
    g = group(p["post_id"], [p["idx"]], ph, vi)
    g.update(idx=p["idx"], post_id=p["post_id"], date=p["date"], text=p["text"])
    page_data["skipped"].append(g)

# Podobieństwo zdjęć (plakietki „na stronie” i „możliwy dubel”). Bez node/sharp strona działa, tylko bez plakietek.
legacy = root.parent / "legacy"
try:
    subprocess.run(["node", str(Path(__file__).parent / "hash_images.mjs"), str(legacy), str(root)], check=True)
    sys.path.insert(0, str(Path(__file__).parent))
    import similarity

    page_data["sim"], sim_report = similarity.compute(root, legacy, page_data)
    (root / "similarity-report.json").write_text(json.dumps(sim_report, ensure_ascii=False, indent=1))
except (OSError, subprocess.CalledProcessError, KeyError) as e:
    print(f"UWAGA: bez plakietek podobieństwa ({e})")

keys = [g["key"] for sec in ("new", "maybe", "existing", "fresh") for g in page_data.get(sec, [])]
assert len(keys) == len(set(keys)), "zdublowane klucze kart"

# Propozycje połączeń kart (ręczne, później także z weryfikacji modelem). To tylko podpowiedź w przeglądzie:
# decyzję zapisuje Marcin przyciskiem, ten skrypt selection.json nie dotyka.
card_keys = {g["key"] for sec in ("new", "maybe", "fresh") for g in page_data.get(sec, [])}
page_data["proposals"] = []
prop_path = root / "merge-proposals.json"
if prop_path.exists():
    for p in json.loads(prop_path.read_text(encoding="utf-8")).get("proposals", []):
        if p.get("a") in card_keys and p.get("b") in card_keys and p["a"] != p["b"]:
            page_data["proposals"].append({k: p.get(k, "") for k in ("a", "b", "source", "reason")})
        else:
            print(f"UWAGA: pominięto propozycję połączenia z nieznaną kartą: {p.get('a')} ↔ {p.get('b')}")
# Weryfikacja modelem (etap B, vision/results.json): plakietki i propozycje; osobny moduł, tu tylko wywołanie.
sys.path.insert(0, str(Path(__file__).parent))
__import__("vision_merge").add(root, page_data)
# Podpowiedzi Terry (classify_posts.py → classify/results.json): co zrobić z kartą względem katalogu. Tylko podpowiedź.
hints_path = root / "classify" / "results.json"
if hints_path.exists():
    hints = json.loads(hints_path.read_text(encoding="utf-8")).get("cards", {})
    page_data["hints"] = {k: v for k, v in hints.items() if k in card_keys and v.get("result")}
# Istniejące karty z katalog.json (zrzut: npm run katalog:snapshot) do pola „dodaj do karty…” w przeglądzie.
snap_path = root / "katalog.json"
page_data["catalogProducts"] = []
if snap_path.exists():
    page_data["catalogProducts"] = sorted(
        ({"slug": x["slug"], "name": x["name"]} for x in json.loads(snap_path.read_text(encoding="utf-8")).get("products", []) if not x.get("archived")),
        key=lambda x: x["name"].lower())
# Karty katalogu, o których mówią podpowiedzi (cel + kandydaci): zdjęcie, kamień, status i warianty, żeby przegląd
# pokazał je obok zdjęć posta zamiast samej nazwy. Tylko to, co potrzebne, żeby review-data.json nie puchło.
page_data["catalogCards"] = {}
if snap_path.exists():
    snap_products = json.loads(snap_path.read_text(encoding="utf-8")).get("products", [])
    # „Już w karcie”: liczone tu ze świeżego katalogu (zdjęcia karty, wariantów i facebookKey wskazują post), a nie tylko
    # z przeliczenia podpowiedzi, które mogło powstać przed dodaniem wariantu. Dopisuje do fromPost, niczego nie zabiera.
    post_ids = {g["key"]: {p["post_id"] for p in g.get("posts", [])} for sec in ("new", "maybe", "fresh") for g in page_data.get(sec, [])}

    def from_post(x, key):
        if x.get("facebookKey") == key:
            return True
        imgs = list(x.get("media") or []) + [m for v in x.get("variants") or [] for m in [v.get("image")] + list(v.get("moreImages") or [])]
        return any(m and not m.get("video") and any(pid in (m.get("source") or "") for pid in post_ids.get(key, ())) for m in imgs)
    for key, h in page_data.get("hints", {}).items():
        have = set(h.get("fromPost") or [])
        have |= {x["slug"] for x in snap_products if from_post(x, key)}
        h["fromPost"] = sorted(have)
    wanted = {s for h in page_data.get("hints", {}).values()
              for s in [((h.get("result") or {}).get("product"))] + list(h.get("candidates") or []) if s}
    for x in snap_products:
        if x.get("slug") not in wanted:
            continue
        media = x.get("media") or []
        page_data["catalogCards"][x["slug"]] = {
            "name": x.get("name"), "status": x.get("status"), "stone": x.get("stone") or "", "metal": x.get("metal") or "",
            "thumb": (media[0] or {}).get("url") if media else None,
            "variants": [{"stone": v.get("stone"), "vis": bool(v.get("isVisualization")), "thumb": (v.get("image") or {}).get("url")}
                         for v in (x.get("variants") or [])][:8],
        }
manual_media.annotate_manual(page_data, MANUAL)
for w in manual_media.annotate_ai(page_data, manual_media.load_ai(root)):
    print("UWAGA:", w)
(root / "review-data.json").write_text(json.dumps(page_data, ensure_ascii=False, indent=1))

# Miniatury (thumbs/) do szybkiego przeglądu; oryginały w media/ zostają nietknięte.
subprocess.run([sys.executable, str(Path(__file__).parent / "make_thumbs.py"), str(root)], check=False)

template = (Path(__file__).parent / "review_template.html").read_text()
if FRESH:
    # Sekcja „Nowe od DD.MM” pojawia się w stronie tylko wtedy, gdy są nowe posty (bez nich review.html zostaje bajt w bajt taki jak dawniej).
    for old, new in (
        ("  ['existing', 'Już w katalogu', 'existing', 'W katalogu'],\n",
         "  ['fresh', 'Nowe od ' + D.freshSince, 'card', 'Nowe od ' + D.freshSince],\n  ['existing', 'Już w katalogu', 'existing', 'W katalogu'],\n"),
        ("for (const sec of ['new', 'maybe']) G.filter(", "for (const sec of ['new', 'maybe', 'fresh']) G.filter("),
        ("(sec === 'maybe' ? 'D' : '')", "(sec === 'maybe' ? 'D' : sec === 'fresh' ? 'N' : '')"),
    ):
        assert old in template, f"szablon review_template.html się zmienił, nie znaleziono: {old.strip()}"
        template = template.replace(old, new)
blob = json.dumps(page_data, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--")
(root / "review.html").write_text(template.replace("__DATA__", blob))
print(len(proposal["new"]), len(proposal["maybe"]), len(proposal["existing"]), len(proposal["skipped"]), *([f"nowe od {page_data['freshSince']}: {len(FRESH)}"] if FRESH else []))
