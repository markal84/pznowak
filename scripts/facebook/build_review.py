"""Buduje propozycję katalogu (rings-proposal.json) i stronę przeglądu (review.html) z eksportu FB."""
import html
import json
import subprocess
import sys
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

E = html.escape


def card(r, n=None):
    imgs = "".join(f'<a href="media/{E(f)}" target="_blank"><img loading="lazy" src="media/{E(f)}"></a>' for f in r.get("photos", []))
    frames = ""
    if not r.get("photos"):
        for v in r.get("videos", [])[:2]:
            frames += f'<img loading="lazy" class="frame" src="frames/{E(v[:-4])}_50.jpg">'
    vids = "".join(
        f'<figure><video controls preload="none" poster="frames/{E(v[:-4])}_25.jpg" src="media/{E(v)}"></video>'
        f'<figcaption class="{"low" if (q := video_height(v)) < 720 else ""}">{q}p</figcaption></figure>'
        for v in r.get("videos", [])
    )
    ps = "".join(
        f'<details><summary>#{p["idx"]} · {E(p["date"] or "brak daty")} · <a href="https://www.facebook.com/{p["post_id"]}" target="_blank">post</a></summary><p>{E(p["text"]) or "<i>bez tekstu</i>"}</p></details>'
        for p in r["posts"]
    )
    head = f"{n}. " if n else ""
    return f'<section><h3>{head}{E(r["title"])}</h3><div class="media">{imgs}{frames}{vids}</div>{ps}</section>'


skipped = "".join(
    f'<li>#{p["idx"]} {E(p["date"])} — {E(" ".join(p["text"].split())[:140]) or "<i>bez tekstu</i>"}</li>' for p in proposal["skipped"]
)
existing = "".join(
    f'<li><b>{E(r["title"])}</b>: posty {", ".join("#" + str(p["idx"]) for p in r["posts"])}</li>' for r in proposal["existing"]
)
page = f"""<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Przegląd pierścionków z FB</title><style>
:root{{color-scheme:light dark;--bg:#faf8f5;--fg:#222;--card:#fff;--line:#ddd}}
@media (prefers-color-scheme:dark){{:root{{--bg:#161616;--fg:#eee;--card:#222;--line:#333}}}}
body{{font:15px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);margin:0 auto;max-width:1200px;padding:16px}}
section{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin:14px 0}}
h3{{margin:0 0 8px}} .media{{display:flex;flex-wrap:wrap;gap:6px}}
.media img,.media video{{height:200px;width:auto;border-radius:6px;object-fit:cover;background:#000}}
figure{{margin:0;position:relative}} figcaption{{position:absolute;top:6px;left:6px;background:#000a;color:#fff;font-size:12px;padding:1px 6px;border-radius:4px}} figcaption.low{{background:#c00}}
details p{{white-space:pre-wrap;margin:4px 0 8px}} summary{{cursor:pointer;color:#888}}
</style></head><body>
<h1>Pierścionki z fanpage'a: propozycja do katalogu</h1>
<p>Eksport z {E(json.loads((root / 'posts.json').read_text())['exportedAt'][:10])}: {len(posts)} postów z mediami. Numery #N to kolejność chronologiczna postów.</p>
<h2>Nowe pierścionki ({len(proposal['new'])})</h2>{''.join(card(r, i + 1) for i, r in enumerate(proposal['new']))}
<h2>Do decyzji: pierścionki klientów, sygnety ({len(proposal['maybe'])})</h2>{''.join(card(r, 'D' + str(i + 1)) for i, r in enumerate(proposal['maybe']))}
<h2>Już w katalogu ({len(proposal['existing'])})</h2><ul>{existing}</ul>
<h2>Pominięte posty ({len(proposal['skipped'])})</h2><ul>{skipped}</ul>
</body></html>"""
(root / "review.html").write_text(page)
print(len(proposal["new"]), len(proposal["maybe"]), len(proposal["existing"]), len(proposal["skipped"]))
