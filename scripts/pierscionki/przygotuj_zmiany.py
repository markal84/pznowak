#!/usr/bin/env python3
"""Zlecenie K, pkt 3, 4 i 6: plan zmian danych pierścionków. TYLKO PODGLĄD (nic nie zapisuje w CMS).

Wejście: odpowiedź GET /products?all=true (środowisko, z którego bierzemy karty) i wyniki Terry z
`ocena_kamieni_terra.py`. Wyjście: tabele „pierścionek / było / będzie” na ekranie oraz plik planu JSON, który
(po decyzji) czyta `cms/scripts/k-zastosuj-dane.ts` (domyślnie też podgląd; zapis tylko na stagingu).

  python3 -I scripts/pierscionki/przygotuj_zmiany.py --produkty produkty.json --terra data/pierscionki-k/terra-oceny.json --plan data/pierscionki-k/plan.json

Zasady: nazwy złota z listy Żółte / Żółte z białym / Białe (jak w filtrze na stronie). Kamień bierzemy z TREŚCI POSTA FB
powiązanego z kartą (`selection.json`: `nazwa@post_id` → `posts.json` → `text`), nie z oceny zdjęć (zmiana K2). Kolor złota
też z posta, gdy go podaje; samo „Złoto” / „Złoty” bez koloru w poście dostaje kolor z oceny zdjęć (Terra). Ocena
poniżej PROG % albo kolor spoza listy NIE trafia do planu: wiersz jest oznaczony „do rzutu oka”. Terra jest też
rezerwą dla karty bez posta (Leto). Adresy: czysty adres z nazwy karty (`merope-2` → `merope`, `pierscionek-12` → `athena`).

  python3 -I scripts/pierscionki/przygotuj_zmiany.py --produkty ... --terra ... --selection data/facebook/selection.json \\
      --posty data/facebook/posts.json --plan data/pierscionki-k/plan.json
"""
import argparse, json, re, unicodedata
from pathlib import Path

PROG = 80
GOLD = {"zolte": "Żółte", "zolte-biale": "Żółte z białym", "biale": "Białe"}
STONE_COLOR_NAME = {"niebieskie": "niebieski", "zielone": "zielony", "rozowe": "różowy", "fioletowe": "fioletowy", "zolte": "żółty"}

# Kamienie rozpoznawane w tekście posta: (wzorzec, nazwa w zapisie karty). Kolejność wystąpienia w tekście = kamień główny pierwszy.
STONES = [
    (r"mystic\s+topaz", "Mystic topaz"),
    (r"turmalin\w*\s+ró[żz]ow\w*|ró[żz]ow\w*\s+turmalin\w*", "Turmalin różowy"),
    (r"szmaragd\w*", "Szmaragd"),
    (r"(?:ró[żz]nokolorow\w*|kolorow\w*)\s+szafir\w*", "Szafiry kolorowe"),
    (r"szafir\w*", "Szafir"),
    (r"oliwin\w*", "Oliwin"),
    (r"tanzanit\w*", "Tanzanit"),
    (r"granat\w*", "Granat"),
    (r"rubin\w*", "Rubin"),
    (r"ametyst\w*", "Ametyst"),
]
# Kolor filtra z nazwy kamienia: ta sama logika co `stoneGroup()` w cms/src/lib/catalog.ts (kamień wymieniony pierwszy wygrywa).
STONE_RULES = [
    (r"oliwk|oliwin", "zielone"), (r"ró[żz]ow", "rozowe"), (r"szafir|topaz|tanzanit|b[łl][ęe]kitn|london|niebiesk", "niebieskie"),
    (r"szmaragd|zielon", "zielone"), (r"rubin|morganit|granat|czerwon", "rozowe"), (r"ametyst|fiolet", "fioletowe"),
    (r"cytryn|[żz][óo][łl]t", "zolte"), (r"bezbarw", "bezbarwne"),
]
MULTICOLOR = r"mystic|wielobarw|r[óo][żz]nokolor"


def stone_group(stone):
    t = stone.lower()
    if not t.strip() or re.search(MULTICOLOR, t): return None
    best = None
    for pat, g in STONE_RULES:
        m = re.search(pat, t)
        if m and (best is None or m.start() < best[0]): best = (m.start(), g)
    if best: return best[1]
    return "bezbarwne" if "diament" in t else None


OFFER = re.compile(r"mogę|możliwość|mozliwosc|wersji|zamów|zamow|innym|innego|innych|bądź|badz|pomysł")


def post_facts(text):
    """Tekst posta bez zdań o możliwościach („Ten model mogę stworzyć też ze szmaragdami”): te kamienie nie są na zdjęciu."""
    segments = re.split(r"[.!?\n]+", text)
    return " ".join(x for x in segments if not OFFER.search(x.lower()))


def stone_from_post(text):
    """Kamienie z treści posta: (zapis typu „Turmalin różowy i diamenty”, liczba kamieni szlachetnych poza diamentami)."""
    low = post_facts(text).lower()
    found, used = [], []
    for pat, name in STONES:
        m = re.search(pat, low)
        if m and not any(a < m.end() and m.start() < b for a, b in used):
            found.append((m.start(), name)); used.append((m.start(), m.end()))
    names = [n for _, n in sorted(found)]
    if re.search(r"czarn\w+\s+diamen", low): diam = ["diamenty", "czarne diamenty"]
    elif "diamen" in low: diam = ["diamenty"]
    else: diam = []
    parts = names + diam
    if not parts: return None, 0
    parts = [parts[0][0].upper() + parts[0][1:]] + [x[0].lower() + x[1:] for x in parts[1:]]
    text_out = parts[0] if len(parts) == 1 else (", ".join(parts[:-1]) + " i " + parts[-1] if len(parts) > 2 else f"{parts[0]} i {parts[1]}")
    return text_out, len(names)


def gold_from_post(text):
    """Kolor złota, gdy post wprost opisuje ten pierścionek („w białym i żółtym złocie”). Podpowiedzi „idealny do złota…” pomijamy."""
    low = re.sub(r"idealny do[^.]*\.?", "", post_facts(text).lower())
    if re.search(r"(bia\w+\s+i\s+[żz]ółt\w+|[żz]ółt\w+\s+i\s+bia\w+)\s+z[łl]oc", low): return "zolte-biale"
    if re.search(r"w\s+bia[łl]\w+\s+z[łl]oc|z[łl]oto\s+bia[łl]e", low): return "biale"
    if re.search(r"w\s+[żz]ółt\w+\s+z[łl]oc|z[łl]oto\s+[żz]ółte", low): return "zolte"
    return None


# Decyzje Marcina z 29.10 dla kart „do rzutu oka” (Terra < 80%, brak posta): mają pierwszeństwo przed oceną i postem.
RECZNE = {
    "Electra": {"metal": "Żółte"},
    "Leto": {"metal": "Żółte z białym", "stone": "Kamień różowy"},
    "Terpsichore": {"metal": "Żółte"},
}


def slugify(name):
    t = unicodedata.normalize("NFKD", name.lower().replace("ł", "l")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def gold_from_text(metal):
    t = (metal or "").lower().strip()
    yellow, white = bool(re.search(r"(żó|zo|żo|zó)łt", t)), bool(re.search(r"bia[łl]", t))
    if yellow and white: return "zolte-biale"
    if white: return "biale"
    if yellow: return "zolte"
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--produkty", required=True)
    ap.add_argument("--terra")
    ap.add_argument("--selection", help="data/facebook/selection.json (karta → post)")
    ap.add_argument("--posty", help="data/facebook/posts.json (treść postów)")
    ap.add_argument("--plan", help="gdzie zapisać plan JSON (poza gitem)")
    a = ap.parse_args()
    products = json.load(open(a.produkty))["products"]
    terra = {r["slug"]: r for r in json.load(open(a.terra))["results"]} if a.terra else {}
    post_of = {}
    if a.selection and a.posty:
        posts = {p["post_id"]: p.get("text", "") for p in json.load(open(a.posty))["posts"]}
        sel = json.load(open(a.selection))
        for key in list(sel.get("existing", {})) + list(sel.get("cards", {})):
            name, _, pid = key.partition("@")
            if pid in posts: post_of.setdefault(name.lower(), posts[pid])
    names = [slugify(p["name"]) for p in products]
    plan, gold_rows, stone_rows, slug_rows = [], [], [], []
    for p in products:
        change, t = {}, terra.get(p["slug"])
        # --- złoto
        gid = gold_from_text(p["metal"])
        if gid:
            if p["metal"] != GOLD[gid]:
                change["metal"] = GOLD[gid]
                gold_rows.append((p["name"], p["metal"], GOLD[gid], "z istniejącego zapisu"))
        elif p["metal"].strip():
            pg = gold_from_post(post_of.get(p["name"].lower(), ""))
            if pg:
                change["metal"] = GOLD[pg]
                gold_rows.append((p["name"], p["metal"], GOLD[pg], "treść posta FB"))
            elif t and "gold_color" in t:
                g, c = t["gold_color"], t.get("confidence", 0)
                if g in GOLD and c >= PROG:
                    change["metal"] = GOLD[g]
                    gold_rows.append((p["name"], p["metal"], GOLD[g], f"zdjęcia, Terra {c}%"))
                else:
                    gold_rows.append((p["name"], p["metal"], f"? ({g}, {c}%)", "DO RZUTU OKA"))
            else:
                gold_rows.append((p["name"], p["metal"], "? (brak oceny)", "DO RZUTU OKA"))
        # --- kamień: z treści posta; Terra tylko dla karty bez posta (i tylko pod PROG)
        post_text = post_of.get(p["name"].lower())
        from_post, gems = stone_from_post(post_text) if post_text else (None, 0)
        have = p["stone"].strip()
        tstone = f'{t["stone"]} ({t.get("confidence", 0)}%)' if t and "stone" in t else "-"
        if from_post and have and not gems:
            pass  # post wymienia same diamenty, a karta ma już kamień kolorowy: nic do porównania
        elif from_post:
            main = from_post.split(" i ")[0].split(",")[0].lower()
            have_main = have.lower().split(" i ")[0].split(",")[0]
            if not have or have_main in main and have_main != main:
                # pusty kamień albo doprecyzowanie („Topaz” → „Mystic topaz”): zapisujemy kamień z posta
                change["stone"] = from_post
                stone_rows.append((p["name"], have or "-", tstone, from_post, stone_group(from_post) or "bez koloru (wielobarwny)", "treść posta FB"))
            elif main in have.lower():
                stone_rows.append((p["name"], have, tstone, have, stone_group(have) or "bez koloru", "zostaje (post zgodny z zapisem)"))
            else:
                stone_rows.append((p["name"], have, tstone, f"? (post: {from_post})", stone_group(have) or "-", "POST ≠ ZAPIS: DO RZUTU OKA, nic nie zmieniam"))
        elif not have:
            if t and "stone" in t:
                c, st, col = t.get("confidence", 0), t["stone"], t["stone_color"]
                stone_rows.append((p["name"], "-", tstone, f"? ({st})", col, f"BRAK POSTA; Terra {c}%: DO RZUTU OKA"))
            else:
                stone_rows.append((p["name"], "-", "-", "? (brak posta i oceny)", "-", "DO RZUTU OKA"))
        # --- decyzje ręczne (nadpisują)
        for field, value in RECZNE.get(p["name"], {}).items():
            if p[field] != value:
                change[field] = value
                (gold_rows if field == "metal" else stone_rows).append((p["name"], p[field] or "-", *( ("-",) if field == "stone" else ()), value, *( ("-",) if field == "stone" else ()), "decyzja Marcina 29.10"))
            else:
                change.pop(field, None)
        # --- adres
        want = slugify(p["name"])
        if p["slug"] != want and names.count(want) == 1:
            change["slug"] = want
            why = "stary adres ze starej strony (kopia WordPress: końcówka -2)" if re.fullmatch(r".+-2", p["slug"]) and not p["slug"].startswith("pierscionek-") \
                else "numer ze starej strony zamiast nazwy"
            slug_rows.append((p["name"], p["slug"], want, why))
        if change:
            plan.append({"slug": p["slug"], "id": p["id"], "name": p["name"], "set": change})

    def table(title, head, rows):
        print(f"\n### {title}\n| " + " | ".join(head) + " |\n|" + "---|" * len(head))
        for r in rows: print("| " + " | ".join(str(x) for x in r) + " |")
    table("Kolory złota (pkt 3/4)", ["pierścionek", "było", "będzie", "źródło"], gold_rows)
    table("Kamień: post mówi / Terra mówi / będzie (pkt 4)", ["pierścionek", "było", "Terra mówi", "będzie (post)", "kolor w filtrze", "źródło"], stone_rows)
    table("Adresy (pkt 6)", ["pierścionek", "teraz", "proponowany", "powód"], slug_rows)
    print(f"\nzmian w planie: {len(plan)} kart")
    if a.plan:
        Path(a.plan).parent.mkdir(parents=True, exist_ok=True)
        Path(a.plan).write_text(json.dumps(plan, ensure_ascii=False, indent=1))
        print("zapisano plan:", a.plan)


if __name__ == "__main__":
    main()
