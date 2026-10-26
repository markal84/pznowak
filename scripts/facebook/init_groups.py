"""Jednorazowo: zamienia stare listy NEW/MAYBE/EXISTING/SPLIT (indeksy postów) na data/facebook/groups.json (po post_id).

Użycie: python3 init_groups.py data/facebook [--force]
Listy poniżej to zamrożona kopia z dawnego build_review.py; indeksy odnoszą się do posts.json posortowanego po czasie.
Nie nadpisuje istniejącego groups.json bez --force. Od teraz jedynym źródłem grupowania jest groups.json.
Posty spoza list trafiają do "skipped" (to te, które przegląd pokazywał w sekcji „Pominięte posty”).
"""
import json
import sys
from pathlib import Path

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

root = Path(sys.argv[1])
out = root / "groups.json"
if out.exists() and "--force" not in sys.argv:
    sys.exit(f"{out} już istnieje; nic nie zmieniam (użyj --force, żeby nadpisać)")
posts = json.loads((root / "posts.json").read_text())["posts"]
posts.sort(key=lambda p: p["time"] or 0)
pid = lambda i: posts[i]["post_id"]

new = []
for title, idxs in NEW:
    card = {"title": title, "posts": [pid(i) for i in idxs]}
    pick = {pid(i): SPLIT[(title, i)] for i in idxs if (title, i) in SPLIT}
    if pick:
        card["pick"] = pick  # które zdjęcia posta (numery od 0) należą do tej karty
    new.append(card)
maybe = [{"title": t, "posts": [pid(i) for i in idxs]} for t, idxs in MAYBE.items()]
existing = [{"title": t, "posts": [pid(i) for i in idxs]} for t, idxs in EXISTING.items()]
used = {p for sec in (new, maybe, existing) for c in sec for p in c["posts"]}
skipped = [p["post_id"] for p in posts if p["post_id"] not in used]
out.write_text(json.dumps({"version": 1, "new": new, "maybe": maybe, "existing": existing, "skipped": skipped}, ensure_ascii=False, indent=1) + "\n")
print(f"groups.json: {len(new)} nowych, {len(maybe)} do decyzji, {len(existing)} w katalogu, {len(skipped)} pominiętych")
