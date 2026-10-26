"""Buduje propozycję katalogu (rings-proposal.json), dane przeglądu (review-data.json) i stronę review.html z eksportu FB.

Użycie: python3 build_review.py data/facebook
Decyzje (selection.json) obsługuje review_server.py; ten skrypt ich nie dotyka.
Przy okazji odświeża miniatury (make_thumbs.py) i podobieństwa zdjęć (hash_images.mjs, similarity.py).
Propozycje połączeń kart („to ten sam pierścionek”) czyta z data/facebook/merge-proposals.json, jeśli plik jest.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

root = Path(sys.argv[1])
posts = json.loads((root / "posts.json").read_text())["posts"]
posts.sort(key=lambda p: p["time"] or 0)
media = sorted(p.name for p in (root / "media").iterdir())

# Indeksy postów w kolejności chronologicznej (jak w stykówkach).
NEW = [
    ("Brylant w szlifie szmaragdowym 0,41 ct", [31, 30, 14]),
    ("Solitaire w białym szatonie", [36, 37]),
    ("Pierścionek z 15 diamentami noszony na dwa sposoby", [38]),
    ("Czarny diament w żółtym złocie", [39]),
    ("Owal z diamentami po bokach (szafir, rubin, diament, szmaragd)", [53]),
    ("Czarny diament w białym złocie", [56]),
    ("Niebieski diament 0,21 ct w stylu art déco", [106, 97]),
    ("Szafir niebiesko-zielony w otoczeniu diamentów", [107, 108]),
    ("Jesień w złocie: szafiry i turmaliny", [109]),
    ("Obrączka eternity z różowymi szafirami", [117]),
    ("Oliwin w szlifie emerald", [120]),
    ("Turmalin arbuzowy z diamentami", [123]),
    ("Trilogy ze szmaragdem", [126]),
    ("Malinowy turmalin w oprawie halo", [131, 127]),
    ("Różowy turmalin w oprawie halo", [134]),
    ("Morganit z diamentami (walentynkowy)", [142, 159]),
    ("Diament 0,5 ct w żółtym złocie", [145]),
    ("Niebieski diament w białym złocie", [162, 150, 147, 144]),
    ("Owalny morganit z diamentami", [148]),
    ("Australijski opal z diamentami", [151, 160]),
    ("Ametyst owalny z diamentami", [165, 156, 152, 196]),
    ("Andaluzyt z diamentami", [153, 161]),
    ("Ametyst w szlifie oktagon z diamentami", [165, 154]),
    ("Agat w owalu z diamentami", [164, 158]),
    ("Morganit z diamentami na szynie pavé", [163]),
    ("Turmalin cytrynowy z diamentami", [169]),
    ("Oliwin w stylu vintage", [189]),
    ("Morganit w oprawie halo", [191, 185]),
    ("Pierścionek „dłoń trzymająca kamień”", [197]),
    ("Diament 0,30 ct z certyfikatem GIA", [198, 190]),
    ("ETERNITY: kamienie kolorowe i brylanty", [1]),
    ("Moissanit 2 ct w odcieniu szampana", [0]),
]
# Zdjęcia posta 165 (ametysty): 1. i 4. oktagon, 2. i 3. owal.
SPLIT = {("Ametyst owalny z diamentami", 165): [1, 2], ("Ametyst w szlifie oktagon z diamentami", 165): [0, 3]}
MAYBE = {
    "Sygnet męski z awenturynem": [44, 43, 42],
    "Sygnet z onyksem": [175],
    "Sygnet z monetą SIC TRANSIT GLORIA MUNDI": [186],
    "Pierścionek zaręczynowy klienta (wyspa)": [182],
    "Pierścionek dla żony": [195],
    "Obrączka eternity odtworzona dla klientki": [137, 138],
    "Pierścionek zwierzęcy (proces)": [75, 76],
}
EXISTING = {  # nazwa w katalogu -> indeksy postów (pierwszy to post zdjęciowy dopasowany po obrazie)
    "Adamas": [2], "Gaia": [3], "Delos": [4], "Egea": [5, 70, 73], "Ione": [6], "Iris": [7], "Pelagia": [8, 16],
    "Helios": [9, 168], "Asteria": [10, 69], "Aria": [17, 28], "Phoebe": [19, 26], "Chryse": [21, 22, 27],
    "Athena": [23, 24, 25], "Dione": [46, 47], "Hestia": [50, 52, 51], "Cyane": [63, 60],
    "Harmonia / Leto (ten sam post)": [64, 62], "Eirene": [65, 61, 66], "Nyx": [67, 58, 68],
    "Terpsichore": [77, 110, 200], "Urania": [98, 92], "Thalassa": [99, 91], "Thalia": [100, 87, 95],
    "Pyrrha": [101, 89], "Daphne": [102, 88], "Euterpe": [103, 93, 104, 199], "Prometheus": [105, 90],
    "Cassiopeia": [116, 96], "Electra": [119, 128], "Maia": [121], "Merope": [124], "Taygete": [132, 130],
    "Celaeno": [133, 125, 83],
}


def files_for(idx, pick=None):
    p = posts[idx]
    photos = [f for f in media if f.startswith(p["post_id"] + "_") and f.endswith(".jpg") and "_thumb" not in f]
    order = [ph["id"] for ph in p["photos"]]
    photos.sort(key=lambda f: order.index(f.split("_")[1].split(".")[0]) if f.split("_")[1].split(".")[0] in order else 99)
    if pick is not None:
        photos = [photos[i] for i in pick if i < len(photos)]
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

keys = [g["key"] for sec in ("new", "maybe", "existing") for g in page_data[sec]]
assert len(keys) == len(set(keys)), "zdublowane klucze kart"

# Propozycje połączeń kart (ręczne, później także z weryfikacji modelem). To tylko podpowiedź w przeglądzie:
# decyzję zapisuje Marcin przyciskiem, ten skrypt selection.json nie dotyka.
card_keys = {g["key"] for sec in ("new", "maybe") for g in page_data[sec]}
page_data["proposals"] = []
prop_path = root / "merge-proposals.json"
if prop_path.exists():
    for p in json.loads(prop_path.read_text(encoding="utf-8")).get("proposals", []):
        if p.get("a") in card_keys and p.get("b") in card_keys and p["a"] != p["b"]:
            page_data["proposals"].append({k: p.get(k, "") for k in ("a", "b", "source", "reason")})
        else:
            print(f"UWAGA: pominięto propozycję połączenia z nieznaną kartą: {p.get('a')} ↔ {p.get('b')}")
(root / "review-data.json").write_text(json.dumps(page_data, ensure_ascii=False, indent=1))

# Miniatury (thumbs/) do szybkiego przeglądu; oryginały w media/ zostają nietknięte.
subprocess.run([sys.executable, str(Path(__file__).parent / "make_thumbs.py"), str(root)], check=False)

template = (Path(__file__).parent / "review_template.html").read_text()
blob = json.dumps(page_data, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--")
(root / "review.html").write_text(template.replace("__DATA__", blob))
print(len(proposal["new"]), len(proposal["maybe"]), len(proposal["existing"]), len(proposal["skipped"]))
