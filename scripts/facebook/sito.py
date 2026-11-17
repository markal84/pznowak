#!/usr/bin/env python3
"""Darmowe sito postów FB (etap 2): zdjęcia nowych postów najpierw porównujemy z katalogiem, dopiero resztę ocenia model.

Dla każdego nowego posta (review-data.json, sekcja „fresh”):
  1. odciski zdjęć (hashes.json z hash_images.mjs, dHash) porównujemy z odciskami zdjęć katalogu
     (progi i miara z similarity.py: d <= 10 to samo zdjęcie, uwzględniając przycięcia),
  2. status posta:
       rozpoznany   wszystkie zdjęcia są już w katalogu → zapis który pierścionek i które zdjęcie; model niepotrzebny
       czesciowo    część zdjęć już jest w katalogu, reszta nie → do kolejki modelu, ze wskazówką, do której karty pasuje
       nowy         żadnego zdjęcia nie ma w katalogu → do kolejki modelu
       bez-zdjec    brak użytecznych zdjęć (sam tekst, puste klatki) → nic nie robimy, model nie pomoże
  3. kolejka modelu: jedno wywołanie na post, wynik zapisany razem z odciskiem zestawu zdjęć (ten sam zestaw
     w innym poście nie kosztuje drugi raz), twardy dzienny limit wywołań. Po limicie reszta czeka do jutra.

Model woła wymienny adapter (sito_adapters.py): domyślnie `wylaczony`, więc bez --adapter nic nie jest wołane.
Skrypt NIE zapisuje do Payload ani do żywej bazy i nie rusza decyzji w selection.json. Wynik to tylko pliki w
data/facebook/classify/sito/ (sito.json, raport.md, wyniki.json, limit.json, katalog-odciski.json).

Użycie (z katalogu głównego repo):
  node scripts/facebook/hash_images.mjs data/legacy data/facebook          # odciski zdjęć FB (jak do przeglądu)
  cd cms && npm run katalog:snapshot && cd ..                               # katalog.json (tylko odczyt)
  python3 scripts/facebook/sito.py --odciski-katalogu                       # raz po zmianie katalogu: odciski jego zdjęć
  python3 scripts/facebook/sito.py                                          # samo sito, bez modelu (za darmo)
  python3 scripts/facebook/sito.py --adapter claude-haiku --run             # + model dla nierozpoznanych, do limitu
Opcje: --dir, --sekcje fresh,new,maybe, --limit-dzienny N (domyślnie 15), --przelicz (ignoruj cache wyników).
"""
import argparse
import hashlib
import json
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import similarity  # noqa: E402  (progi SAME/SIMILAR i dist z przeglądu)

SAME, SIMILAR = similarity.SAME, similarity.SIMILAR
WERSJA_ODCISKU = 1  # zmiana progów albo sposobu liczenia odcisku zestawu → stare wyniki przestają pasować
LIMIT_DZIENNY = 15
DOMYSLNE_SEKCJE = ("fresh",)
KOLEJKA = ("nowy", "czesciowo")  # statusy, które idą do modelu


def teraz():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def czytaj(path, domyslnie=None):
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else domyslnie


def zapisz(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path)


# ---------- odciski ----------
def odleglosc(a, b):
    """Jak similarity.dist, ale odcisk bez „c” (kadr 80 %) traktuje jak „c” = „f”."""
    a = {"f": a["f"], "c": a.get("c", a["f"])}
    b = {"f": b["f"], "c": b.get("c", b["f"])}
    return similarity.dist(a, b)[0]


def dhash_pliku(path, crop=False):
    """dHash 64 bity (9×8, skala szarości) przez ffmpeg; crop=True: środek 80 % kadru. None, gdy się nie da."""
    vf = ("crop=iw*0.8:ih*0.8," if crop else "") + "scale=9:8,format=gray"
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", vf, "-frames:v", "1", "-f", "rawvideo", "-"],
                       capture_output=True, timeout=60)
    px = r.stdout
    if len(px) < 72:
        return None
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | (1 if px[y * 9 + x] > px[y * 9 + x + 1] else 0)
    return f"{bits:016x}"


def odciski_pliku(path):
    f, c = dhash_pliku(path), dhash_pliku(path, crop=True)
    return {"f": f, "c": c} if f and c else None


def zdjecia_katalogu(p):
    """(klucz, opis, plik-źródło) wszystkich zdjęć karty katalogu: zdjęcia karty, zdjęcie wariantu i jego dodatkowe."""
    out = []
    for m in p.get("media", []):
        if m and not m.get("video"):
            out.append((f"{p['slug']}/{m['id']}", {"variant": None, "isVisualization": False}, m))
    for v in p.get("variants", []):
        for m in [v.get("image")] + list(v.get("moreImages") or []):
            if m and not m.get("video"):
                out.append((f"{p['slug']}/{m['id']}", {"variant": v.get("stone"), "isVisualization": bool(v.get("isVisualization"))}, m))
    return out


def zbuduj_odciski_katalogu(root, katalog, pobierz, liczenie=odciski_pliku):
    """Odciski zdjęć katalogu → classify/sito/katalog-odciski.json. pobierz(m) zwraca lokalny plik albo None.
    Nie liczy ponownie zdjęć, które już mają odcisk (id zdjęcia w Payload się nie zmienia)."""
    plik = Path(root) / "classify" / "sito" / "katalog-odciski.json"
    stare = czytaj(plik, {"images": {}})["images"]
    nowe, brak = {}, 0
    for p in katalog:
        for klucz, opis, m in zdjecia_katalogu(p):
            if klucz in nowe:
                continue
            if klucz in stare and stare[klucz].get("f"):
                nowe[klucz] = {**stare[klucz], **opis, "slug": p["slug"], "name": p["name"]}
                continue
            lok = pobierz(m)
            h = liczenie(lok) if lok else None
            if not h:
                brak += 1
                continue
            nowe[klucz] = {**h, **opis, "slug": p["slug"], "name": p["name"]}
    zapisz(plik, {"about": "Odciski zdjęć katalogu (dHash, ffmpeg) dla sito.py; bez zapisu do Payload.", "takenAt": teraz(), "images": nowe})
    return plik, len(nowe), brak


# ---------- sito ----------
def zdjecia_posta(g, hashes):
    """[(plik, odcisk)] zdjęć i klatek filmów posta, które mają odcisk i nie są pustym kadrem; + pliki bez odcisku."""
    uzyteczne = similarity.group_images(g, hashes)
    wszystkie = list(g.get("photos", []))
    bez = [f for f in wszystkie if f not in hashes["fb"]]
    return uzyteczne, bez


def najlepsze_trafienie(h, indeks):
    najlepsze = None
    for klucz, meta in indeks.items():
        d = odleglosc(h, meta)
        if najlepsze is None or d < najlepsze["d"]:
            najlepsze = {"d": d, "img": klucz, "slug": meta["slug"], "name": meta["name"], "variant": meta.get("variant"),
                         "isVisualization": meta.get("isVisualization", False)}
    return najlepsze


def analizuj_post(g, hashes, indeks):
    uzyteczne, bez_odcisku = zdjecia_posta(g, hashes)
    zdjecia = {}
    for plik, h in uzyteczne:
        b = najlepsze_trafienie(h, indeks) if indeks else None
        if b and b["d"] <= SAME:
            zdjecia[plik] = {"poziom": "jest", **b}
        elif b and b["d"] <= SIMILAR:
            # 11–18 między różnymi pierścionkami to głównie szum (tło, światło): nie uznajemy za rozpoznane
            zdjecia[plik] = {"poziom": "podobne", **b}
        else:
            zdjecia[plik] = {"poziom": "brak", "d": b["d"] if b else None}
    znane = {f: z for f, z in zdjecia.items() if z["poziom"] == "jest"}
    if not zdjecia:
        status = "bez-zdjec"
    elif len(znane) == len(zdjecia):
        status = "rozpoznany"
    elif znane:
        status = "czesciowo"
    else:
        status = "nowy"
    produkty = {}
    for z in znane.values():
        produkty.setdefault(z["slug"], z["name"])
    return {
        "key": g["key"], "title": g.get("title"), "status": status,
        "produkty": [{"slug": s, "name": n} for s, n in produkty.items()],
        "zdjecia": zdjecia, "bezOdcisku": bez_odcisku,
        "odcisk": odcisk_zestawu(uzyteczne), "hashe": sorted(h["f"] for _, h in uzyteczne),
    }


def odcisk_zestawu(uzyteczne):
    """Odcisk zestawu zdjęć posta: niezależny od nazw plików i kolejności (ten sam zestaw = ten sam odcisk)."""
    czesci = sorted(h["f"] for _, h in uzyteczne)
    return hashlib.sha1(json.dumps([WERSJA_ODCISKU, czesci]).encode()).hexdigest()[:16] if czesci else None


def zestaw_podobny(a, b):
    """Dwa zestawy zdjęć to to samo, gdy mają tyle samo zdjęć i każde ma parę w d <= SAME (ponowne wgranie, kompresja)."""
    if len(a) != len(b) or not a:
        return False
    wolne = list(b)
    for x in a:
        pasuje = next((y for y in wolne if (int(x, 16) ^ int(y, 16)).bit_count() <= SAME), None)
        if pasuje is None:
            return False
        wolne.remove(pasuje)
    return True


def z_cache(wyniki, a):
    """Zapisany wynik dla tego samego zestawu zdjęć: po dokładnym odcisku albo po zestawie z odciskami w d <= SAME."""
    if not a["odcisk"]:
        return None
    if a["odcisk"] in wyniki["results"]:
        return wyniki["results"][a["odcisk"]]
    for w in wyniki["results"].values():
        if zestaw_podobny(a["hashe"], w.get("hashe") or []):
            return w
    return None


def wskazowka(a):
    if a["status"] != "czesciowo":
        return None
    nazwy = ", ".join(f"{p['name']} ({p['slug']})" for p in a["produkty"])
    jest = sum(1 for z in a["zdjecia"].values() if z["poziom"] == "jest")
    return f"{jest} z {len(a['zdjecia'])} zdjęć posta już jest w katalogu: {nazwy}. Pozostałe zdjęcia nie pasują do żadnego zdjęcia katalogu."


# ---------- limit dzienny ----------
class Limit:
    """Twardy dzienny limit wywołań modelu; wywołanie liczone PRZED uruchomieniem (nieudane też się liczy)."""

    def __init__(self, plik, maks, dzis=None):
        self.plik, self.maks = Path(plik), maks
        self.dzis = (dzis or date.today()).isoformat()
        self.dane = czytaj(self.plik, {})

    def uzyte(self):
        return self.dane.get(self.dzis, {}).get("calls", 0)

    def mozna(self):
        return self.uzyte() < self.maks

    def licz(self, klucz, adapter):
        dzien = self.dane.setdefault(self.dzis, {"calls": 0, "log": []})
        dzien["calls"] += 1
        dzien["log"].append({"at": teraz(), "key": klucz, "adapter": adapter})
        zapisz(self.plik, self.dane)


# ---------- przebieg ----------
def przebieg(root, sekcje, adapter, uruchom_model, limit, przelicz=False, katalog_modelu=None, dzis=None):
    root = Path(root)
    sdir = root / "classify" / "sito"
    data = czytaj(root / "review-data.json")
    hashes = czytaj(root / "hashes.json")
    if data is None or hashes is None:
        raise SystemExit("Brak review-data.json albo hashes.json w katalogu danych (zob. użycie w nagłówku sito.py).")
    indeks = (czytaj(sdir / "katalog-odciski.json", {"images": {}}))["images"]
    wyniki = czytaj(sdir / "wyniki.json", {"results": {}})
    lim = Limit(sdir / "limit.json", limit, dzis)
    grupy = {g["key"]: g for s in sekcje for g in data.get(s, [])}
    posty, kolejka = {}, []
    for key, g in grupy.items():
        a = analizuj_post(g, hashes, indeks)
        posty[key] = a
        if a["status"] in KOLEJKA:
            kolejka.append(key)

    zrobione = 0
    for key in kolejka:
        a = posty[key]
        a["wskazowka"] = wskazowka(a)
        zapisany = z_cache(wyniki, a)
        if zapisany and not przelicz:
            a.update(model="cache", wynik=zapisany["result"], wynikAdapter=zapisany["adapter"])
            continue
        if not uruchom_model:
            a["model"] = "w-kolejce"
            continue
        if not lim.mozna():
            a["model"] = "czeka-do-jutra"
            continue
        lim.licz(key, adapter.nazwa)
        try:
            res = adapter.ocen({"card": grupy[key], "root": root, "vdir": root / "classify", "katalog": katalog_modelu or [], "wskazowka": a["wskazowka"]})
        except Exception as e:  # noqa: BLE001 – jeden post nie zatrzymuje reszty; wywołanie i tak się liczy do limitu
            a["model"], a["blad"] = "blad", str(e)[:400]
            continue
        wyniki["results"][a["odcisk"]] = {"at": teraz(), "adapter": adapter.nazwa, "key": key, "hashe": a["hashe"], "result": res}
        zapisz(sdir / "wyniki.json", wyniki)  # zapis po każdym poście: przerwanie niczego nie traci
        a.update(model="ocenione", wynik=res, wynikAdapter=adapter.nazwa)
        zrobione += 1

    zlicz = {}
    for a in posty.values():
        zlicz[a["status"]] = zlicz.get(a["status"], 0) + 1
    out = {"at": teraz(), "sekcje": list(sekcje), "progi": {"same": SAME, "similar": SIMILAR},
           "limit": {"dzien": lim.dzis, "uzyte": lim.uzyte(), "maks": lim.maks}, "podsumowanie": zlicz,
           "katalogOdciskow": len(indeks), "posts": posty}
    zapisz(sdir / "sito.json", out)
    (sdir / "raport.md").write_text(raport(out), encoding="utf-8")
    return out


def raport(o):
    L = [f"# Sito postów FB ({o['at']})", "",
         f"Odcisków zdjęć katalogu: {o['katalogOdciskow']}. Limit modelu dziś: {o['limit']['uzyte']}/{o['limit']['maks']}.",
         "Podsumowanie: " + ", ".join(f"{k}: {v}" for k, v in sorted(o["podsumowanie"].items())), "",
         "| Post | Status | Pierścionek | Zdjęcia w katalogu | Model |", "|---|---|---|---|---|"]
    for a in o["posts"].values():
        jest = sum(1 for z in a["zdjecia"].values() if z["poziom"] == "jest")
        wynik = a.get("wynik")
        model = a.get("model", "–")
        if wynik:
            model += f": {wynik['category']}" + (f" → {wynik['product']}" if wynik.get("product") else "")
        L.append(f"| {(a['title'] or a['key'])[:60]} | {a['status']} | {', '.join(p['name'] for p in a['produkty']) or '–'} "
                 f"| {jest}/{len(a['zdjecia'])} | {model} |")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(HERE.parent.parent / "data" / "facebook"))
    ap.add_argument("--sekcje", default=",".join(DOMYSLNE_SEKCJE))
    ap.add_argument("--odciski-katalogu", action="store_true", help="policz odciski zdjęć z katalog.json (pobiera brakujące zdjęcia)")
    ap.add_argument("--adapter", default="wylaczony", help="wylaczony | codex-terra | claude-haiku | claude-sonnet")
    ap.add_argument("--run", action="store_true", help="naprawdę wołaj model dla nierozpoznanych (bez tego: tylko sito i kolejka)")
    ap.add_argument("--limit-dzienny", type=int, default=LIMIT_DZIENNY)
    ap.add_argument("--przelicz", action="store_true", help="ignoruj zapisane wyniki modelu")
    a = ap.parse_args()
    root = Path(a.dir).resolve()
    if a.run and a.adapter == "wylaczony":
        sys.exit("--run wymaga adaptera (--adapter codex-terra | claude-haiku | claude-sonnet); domyślny jest wyłączony.")
    katalog = None
    kat_plik = root / "katalog.json"
    if a.odciski_katalogu or a.run:
        if not kat_plik.exists():
            sys.exit("Brak data/facebook/katalog.json. Najpierw: cd cms && npm run katalog:snapshot")
        katalog = [p for p in czytaj(kat_plik)["products"] if not p.get("archived")]
    if a.odciski_katalogu:
        import classify_posts as cp  # pobieranie zdjęć katalogu (cache classify/katalog-img)

        plik, n, brak = zbuduj_odciski_katalogu(root, katalog, lambda m: cp.cat_image(root, m))
        print(f"Odciski katalogu: {n} zdjęć, bez odcisku: {brak} → {plik}")
    from sito_adapters import wybierz

    adapter = wybierz(a.adapter)
    o = przebieg(root, tuple(s for s in a.sekcje.split(",") if s), adapter, a.run, a.limit_dzienny, a.przelicz, katalog)
    print("Sito:", ", ".join(f"{k}: {v}" for k, v in sorted(o["podsumowanie"].items())) or "brak postów",
          f"| model dziś: {o['limit']['uzyte']}/{o['limit']['maks']} | {root / 'classify' / 'sito' / 'raport.md'}")


if __name__ == "__main__":
    main()
