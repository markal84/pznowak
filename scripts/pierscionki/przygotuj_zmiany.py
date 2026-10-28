#!/usr/bin/env python3
"""Zlecenie K, pkt 3, 4 i 6: plan zmian danych pierścionków. TYLKO PODGLĄD (nic nie zapisuje w CMS).

Wejście: odpowiedź GET /products?all=true (środowisko, z którego bierzemy karty) i wyniki Terry z
`ocena_kamieni_terra.py`. Wyjście: tabele „pierścionek / było / będzie” na ekranie oraz plik planu JSON, który
(po decyzji) czyta `cms/scripts/k-zastosuj-dane.ts` (domyślnie też podgląd; zapis tylko na stagingu).

  python3 -I scripts/pierscionki/przygotuj_zmiany.py --produkty produkty.json --terra data/pierscionki-k/terra-oceny.json --plan data/pierscionki-k/plan.json

Zasady: nazwy złota z listy Żółte / Żółte z białym / Białe (jak w filtrze na stronie). Samo „Złoto” i „Złoty” dostaje
kolor z oceny zdjęć. Ocena poniżej PROG % albo kolor spoza listy (np. różowe) NIE trafia do planu: wiersz jest
oznaczony „do rzutu oka”. Adresy: czysty adres z nazwy karty (`merope-2` → `merope`, `pierscionek-12` → `athena`).
"""
import argparse, json, re, unicodedata
from pathlib import Path

PROG = 80
GOLD = {"zolte": "Żółte", "zolte-biale": "Żółte z białym", "biale": "Białe"}
STONE_COLOR_NAME = {"niebieskie": "niebieski", "zielone": "zielony", "rozowe": "różowy", "fioletowe": "fioletowy", "zolte": "żółty"}


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
    ap.add_argument("--plan", help="gdzie zapisać plan JSON (poza gitem)")
    a = ap.parse_args()
    products = json.load(open(a.produkty))["products"]
    terra = {r["slug"]: r for r in json.load(open(a.terra))["results"]} if a.terra else {}
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
            if t and "gold_color" in t:
                g, c = t["gold_color"], t.get("confidence", 0)
                if g in GOLD and c >= PROG:
                    change["metal"] = GOLD[g]
                    gold_rows.append((p["name"], p["metal"], GOLD[g], f"zdjęcia, Terra {c}%"))
                else:
                    gold_rows.append((p["name"], p["metal"], f"? ({g}, {c}%)", "DO RZUTU OKA"))
            else:
                gold_rows.append((p["name"], p["metal"], "? (brak oceny)", "DO RZUTU OKA"))
        # --- kamień (tylko karty bez kamienia)
        if not p["stone"].strip():
            if t and "stone" in t:
                c, s, col = t.get("confidence", 0), t["stone"], t["stone_color"]
                if c >= PROG and s and s != "brak":
                    change["stone"] = s[0].upper() + s[1:]
                    stone_rows.append((p["name"], "-", change["stone"], col, f"Terra {c}%"))
                else:
                    stone_rows.append((p["name"], "-", f"? ({s})", col, f"DO RZUTU OKA, Terra {c}%"))
            else:
                stone_rows.append((p["name"], "-", "? (brak oceny)", "-", "DO RZUTU OKA"))
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
    table("Kamień dla kart bez kamienia (pkt 4)", ["pierścionek", "było", "będzie", "kolor w filtrze", "źródło"], stone_rows)
    table("Adresy (pkt 6)", ["pierścionek", "teraz", "proponowany", "powód"], slug_rows)
    print(f"\nzmian w planie: {len(plan)} kart")
    if a.plan:
        Path(a.plan).parent.mkdir(parents=True, exist_ok=True)
        Path(a.plan).write_text(json.dumps(plan, ensure_ascii=False, indent=1))
        print("zapisano plan:", a.plan)


if __name__ == "__main__":
    main()
