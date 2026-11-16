#!/usr/bin/env python3
"""Podpowiedź modelu dla kart z przeglądu FB: co zrobić z postem względem katalogu.

Kategorie (classify_schema.json):
  nowy                  nowy pierścionek do katalogu (szkic w Payload)
  dodatek               zdjęcia/film do istniejącej karty (product = slug)
  zamiast-wizualizacji  prawdziwe zdjęcie wariantu, który w katalogu ma dziś tylko wizualizację (product + variant)
  nowy-wariant          istniejący fason w nowym kamieniu (product + variant)
  material              materiał marketingowy: warsztat, proces, kamienie luzem, ogłoszenia, inna biżuteria
  pomin                 nic do wykorzystania

Wynik to WYŁĄCZNIE podpowiedzi w data/facebook/classify/; decyzje zapisuje Marcin w przeglądzie (selection.json
nie jest tu zapisywany).

Użycie (z katalogu głównego repo; najpierw `cd cms && npm run katalog:snapshot` → data/facebook/katalog.json):
  python3 scripts/facebook/classify_posts.py                 # karty z sekcji „Nowe od…”, bez modelu: kandydaci
  python3 scripts/facebook/classify_posts.py --run           # j.w. + Terra
  python3 scripts/facebook/classify_posts.py --test --run    # test na kartach rozstrzygniętych przez Marcina → raport
  --limit N, --key KLUCZ_KARTY (można powtarzać), --jobs N (domyślnie 3)

Kandydaci z katalogu (najwyżej 5) wybierani bez modelu: wspólne kamienie/słowa w tekście posta i karcie katalogu oraz
podobieństwo zdjęć (dHash). Model dostaje arkusz karty posta + po jednym arkuszu na kandydata (zdjęcie główne i
zdjęcia wariantów) z opisem, które warianty są wizualizacjami.
W teście karta katalogu powstała z tego samego posta (facebookKey albo zdjęcia z tego posta) jest pomijana, a przy
oczekiwanym „dodatku” z kandydatów znikają tylko zdjęcia z tych samych postów, żeby model nie dostał odpowiedzi za darmo.

Silnik: `codex exec` (konto ChatGPT), GPT-6.1 Terra, rozumowanie medium; Claude nie jest wywoływany.
Cache: classify/terra/<skrót>.json (skrót z promptu i plików), licznik wywołań classify/terra-calls.json.
"""
import argparse
import hashlib
import json
import random
import re
import subprocess
import sys
import threading
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import vision_pairs as vp  # noqa: E402  (arkusze, klatki filmów, codex exec)

SCHEMA = HERE / "classify_schema.json"
TERRA = {"id": "gpt-6.1-terra", "effort": "medium", "dir": "terra", "counter": "terra-calls.json", "limit": None}
MAX_CANDIDATES = 5
PROMPT_VERSION = 1
SITE = "https://pznowak.pl"
LOCK = threading.Lock()

WORDS = [
    ("diament", r"diament|brylant"), ("szafir", r"szafir"), ("różowy szafir", r"różow\w* szafir"),
    ("rubin", r"\brubin"), ("szmaragd", r"szmaragd(?!ow)"), ("morganit", r"morganit"), ("ametyst", r"ametyst"),
    ("turmalin", r"turmalin"), ("tanzanit", r"tanzanit"), ("akwamaryn", r"akwamaryn"), ("opal", r"\bopal"),
    ("oliwin", r"oliwin|perydot"), ("topaz", r"topaz"), ("cytryn", r"cytryn"), ("granat", r"\bgranat(?!ow)"),
    ("spinel", r"spinel"), ("perła", r"perł|perel"), ("moissanit", r"moissanit"), ("onyks", r"onyks"),
    ("agat", r"\bagat"), ("awenturyn", r"awenturyn"), ("andaluzyt", r"andaluzyt"), ("kwarc", r"kwarc"),
    ("eternity", r"eternity"), ("obrączka", r"obrącz"), ("sygnet", r"sygnet"), ("halo", r"\bhalo\b"),
    ("trilogy", r"trilogy|trzy kamienie"), ("solitaire", r"solitaire|soliter"), ("cushion", r"cushion|poduszk"),
    ("owal", r"\bowal"), ("markiza", r"markiz"), ("gruszka", r"gruszk|kropl"), ("szlif szmaragdowy", r"szlif\w* szmaragdow|emerald"),
    ("art deco", r"art ?deco"), ("białe złoto", r"biał\w* złot"), ("różowe złoto", r"różow\w* złot"),
    ("niebieski", r"niebiesk"), ("zielony", r"zielon"), ("czarny", r"czarn"),
]

PROMPT = """Jesteś ekspertem jubilerskim i pomagasz prowadzić katalog pierścionków pracowni złotniczej.
Masz post z fanpage'a pracowni (obraz 1: zdjęcia i klatki filmów z posta) i kandydatów z katalogu na stronie
(kolejne obrazy, po jednym na kandydata: pierwszy kafelek to zdjęcie główne karty, dalej zdjęcia wariantów kamieni
w podanej kolejności). Zdecyduj, co pracownia powinna zrobić z tym postem:

- "nowy": na zdjęciach jest gotowy pierścionek (albo obrączka/sygnet), którego NIE MA wśród kandydatów → nowa karta.
- "dodatek": to ten sam model co jeden z kandydatów (ten sam fason i ten sam kamień, który karta już ma
  na prawdziwym zdjęciu) → nowe zdjęcia/film do tej karty. product = slug kandydata.
- "zamiast-wizualizacji": to ten sam fason co kandydat, w kamieniu, który w katalogu ma tylko WIZUALIZACJĘ
  (oznaczoną niżej) → prawdziwe zdjęcie zastąpi wizualizację. product = slug, variant = nazwa tego wariantu z listy.
- "nowy-wariant": ten sam fason co kandydat, ale w kamieniu, którego karta jeszcze nie ma → nowy wariant.
  product = slug, variant = krótka nazwa kamienia (np. "Szmaragd i diamenty").
- "material": nie ma gotowego pierścionka do katalogu: praca w warsztacie, proces, odlew, kamienie luzem, życzenia,
  ogłoszenia, kolaż wielu wyrobów, inna biżuteria (kolczyki, wisiorki) albo zdjęcia za słabe na katalog.
- "pomin": nic przydatnego.

Porównuj przede wszystkim KSZTAŁT: fason szyny, sposób oprawy, układ i liczbę kamieni, szlif kamienia głównego.
Kolor kamienia rozstrzyga między "dodatek", "zamiast-wizualizacji" i "nowy-wariant". Tekst posta pomaga,
ale bywa ogólny ("nowość", "z diamentami"). Gdy nie ma pewności co do kandydata, wybierz "nowy" z niską pewnością.
confidence: 0–100. reason: jedno–dwa zdania po polsku, konkretnie (co widać, co się zgadza, co nie).

POST ({post_desc}):
{post_text}

KANDYDACI Z KATALOGU:
{candidates}
"""


def log(*a):
    print(*a, flush=True)


def norm(s):
    return unicodedata.normalize("NFC", (s or "").lower())


def words(s):
    s = norm(s)
    return {name for name, rx in WORDS if re.search(rx, s)}


# ---------- katalog ----------
def load_catalog(root):
    p = root / "katalog.json"
    if not p.exists():
        sys.exit("Brak data/facebook/katalog.json. Najpierw: cd cms && npm run katalog:snapshot")
    data = json.loads(p.read_text(encoding="utf-8"))
    return [x for x in data["products"] if not x.get("archived")], data.get("takenAt", "?")


def cat_image(root, f):
    """Lokalna kopia zdjęcia z katalogu (classify/katalog-img/<id>.<ext>); None, gdy się nie da pobrać."""
    if not f or f.get("video") or not f.get("url"):
        return None
    url = f["url"] if f["url"].startswith("http") else SITE + f["url"]
    ext = Path(url.split("?")[0]).suffix.lower() or ".jpg"
    out = root / "classify" / "katalog-img" / f"{f['id']}{ext}"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "agent-local"})
        with urllib.request.urlopen(req, timeout=60) as r:
            tmp = out.with_name(f"{out.stem}.{threading.get_ident()}.part")  # równoległe wątki, ten sam plik
            tmp.write_bytes(r.read())
            tmp.replace(out)
        if ext in (".webp", ".avif", ".png"):  # ffmpeg/model wolą jpg
            jpg = out.with_suffix(".jpg")
            vp.run(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-q:v", "3", str(jpg)])
            if jpg.exists():
                return jpg
        return out
    except OSError as e:
        log(f"  nie pobrano {url}: {e}")
        return None


def product_text(p):
    return " ".join([p["name"], p.get("stone", ""), p.get("lead", "")] + [v["stone"] or "" for v in p["variants"]])


def blocked_sources(card):
    """Zdjęcia katalogu pochodzące z postów tej karty (test: nie podpowiadamy modelowi odpowiedzi)."""
    return {p["post_id"] for p in card["posts"]}


def from_card(f, posts):
    src = f.get("source") or ""
    return any(pid in src for pid in posts)


# ---------- dHash przez ffmpeg (bez PIL) ----------
def dhash(path):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", "scale=9:8,format=gray", "-frames:v", "1",
                        "-f", "rawvideo", "-"], capture_output=True, timeout=60)
    px = r.stdout
    if len(px) < 72:
        return None
    return sum(1 << i for i in range(64) if px[(i // 8) * 9 + i % 8] > px[(i // 8) * 9 + i % 8 + 1])


def hamming(a, b):
    return bin(a ^ b).count("1")


# ---------- kandydaci ----------
def card_images(root, vdir, card):
    imgs = [root / "media" / f for f in card["photos"][:4]]
    for v in card["videos"][:2]:
        imgs += vp.video_frames(root, vdir, v["file"])[2:6:2]
    return [i for i in imgs if i.exists()]


def made_from(p, posts):
    return any(from_card(m, posts) for m in p["media"]) or any(v["image"] and from_card(v["image"], posts) for v in p["variants"])


def candidates(root, vdir, card, catalog, test, expected=None):
    posts = blocked_sources(card)
    # Test: karta katalogu zrobiona z tego posta (facebookKey albo jego zdjęcia) znika z kandydatów, chyba że oczekiwany
    # jest właśnie „dodatek” do niej (wtedy znikają tylko zdjęcia z tego posta, zob. candidate_sheet).
    pool = [p for p in catalog if not (test and (p.get("facebookKey") == card["key"] or (expected != "dodatek" and made_from(p, posts))))]
    text = " ".join(p.get("text") or "" for p in card["posts"]) + " " + card.get("title", "")
    w = words(text)
    hashes = [h for h in (dhash(i) for i in card_images(root, vdir, card)) if h is not None]
    scored = []
    for p in pool:
        pw = words(product_text(p))
        s_text = len(w & pw) * 2 + (3 if norm(p["name"]) and re.search(r"\b" + re.escape(norm(p["name"])) + r"\b", norm(text)) else 0)
        best = 64
        for m in p["media"][:3]:
            if from_card(m, posts) or m.get("video"):
                continue
            img = cat_image(root, m)
            h = dhash(img) if img else None
            if h is not None and hashes:
                best = min(best, min(hamming(h, x) for x in hashes))
        scored.append((s_text, best, p))
    by_text = sorted(scored, key=lambda x: (-x[0], x[1]))[:MAX_CANDIDATES - 2]
    by_img = [x for x in sorted(scored, key=lambda x: x[1]) if x not in by_text][:2]
    out = [x for x in by_text if x[0] > 0] + by_img
    for x in sorted(scored, key=lambda x: (-x[0], x[1])):
        if len(out) >= MAX_CANDIDATES:
            break
        if x not in out:
            out.append(x)
    return [{"product": x[2], "textScore": x[0], "dhash": x[1]} for x in out[:MAX_CANDIDATES]]


def candidate_sheet(root, vdir, card, p, test):
    posts = blocked_sources(card) if test else set()
    tiles = []
    for m in p["media"]:
        if m.get("video") or from_card(m, posts):
            continue
        img = cat_image(root, m)
        if img:
            tiles.append(img)
        if len(tiles) >= 2:
            break
    vlines = []
    for v in p["variants"]:
        if v["image"] and not from_card(v["image"], posts):
            img = cat_image(root, v["image"])
            if img and len(tiles) < 8:
                tiles.append(img)
                vlines.append(f"{v['stone']} ({'WIZUALIZACJA' if v['isVisualization'] else 'prawdziwe zdjęcie'}, kafelek {len(tiles)})")
                continue
        vlines.append(f"{v['stone']} ({'WIZUALIZACJA' if v['isVisualization'] else 'prawdziwe zdjęcie'}, bez kafelka)")
    if not tiles:
        return None, vlines
    fake = {"key": f"kat-{p['slug']}-{int(test)}", "photos": [], "videos": []}
    h = hashlib.sha1(json.dumps([fake["key"], [str(t) for t in tiles]]).encode()).hexdigest()[:12]
    out = vdir / "sheets" / f"kat-{h}.jpg"
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        ratios = sorted(vp.aspect(t) for t in tiles)
        cols, tw, th = vp.grid(len(tiles), ratios[len(tiles) // 2])
        tw, th = tw - tw % 2, th - th % 2
        cmd = ["ffmpeg", "-v", "error", "-y"]
        for t in tiles:
            cmd += ["-i", str(t)]
        n = len(tiles)
        fc = [f"[{i}:v]scale={tw - 4}:{th - 4}:force_original_aspect_ratio=decrease,pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2:color=0x202020,setsar=1[v{i}]" for i in range(n)]
        if n == 1:
            fc.append("[v0]null[out]")
        else:
            layout = "|".join(f"{(i % cols) * tw}_{(i // cols) * th}" for i in range(n))
            fc.append("".join(f"[v{i}]" for i in range(n)) + f"xstack=inputs={n}:layout={layout}:fill=0x202020[out]")
        r = vp.run(cmd + ["-filter_complex", ";".join(fc), "-map", "[out]", "-frames:v", "1", "-q:v", "3", str(out)])
        if r.returncode != 0:
            return None, vlines
    return out, vlines


def describe_candidates(cands, sheets):
    lines, img_no = [], 2
    for c, (sheet, vlines) in zip(cands, sheets):
        p = c["product"]
        where = f"obraz {img_no}" if sheet else "brak zdjęć"
        if sheet:
            img_no += 1
        lines.append(f"- slug: {p['slug']} | nazwa: {p['name']} | {'szkic' if p['status'] == 'draft' else 'na stronie'} | {where}\n"
                     f"  kamień: {p.get('stone') or '?'}; opis: {(p.get('lead') or '')[:200]}\n"
                     f"  warianty: {'; '.join(vlines) if vlines else 'brak'}")
    return "\n".join(lines)


# ---------- przebieg ----------
def classify(root, vdir, card, catalog, test, run_model, expected=None):
    cands = candidates(root, vdir, card, catalog, test, expected)
    post_sheet = vp.sheet(root, vdir, card)
    sheets = [candidate_sheet(root, vdir, card, c["product"], test) for c in cands]
    prompt = PROMPT.format(post_desc=vp.describe(card), post_text=vp.post_text(card), candidates=describe_candidates(cands, sheets))
    images = [post_sheet] + [s for s, _ in sheets if s]
    h = hashlib.sha1(json.dumps([PROMPT_VERSION, prompt, [Path(i).name for i in images]]).encode()).hexdigest()[:16]
    cache = vdir / "terra" / f"{h}.json"
    rec = {"key": card["key"], "title": card.get("title"), "candidates": [c["product"]["slug"] for c in cands], "hash": h}
    if cache.exists():
        rec["result"] = json.loads(cache.read_text())["result"]
        rec["cached"] = True
    elif run_model:
        vp.SCHEMA_PATH = SCHEMA
        res, meta = vp.ask_codex(vdir, TERRA, prompt, images, h)
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps({"at": datetime.now(timezone.utc).isoformat(), "meta": meta, "key": card["key"], "result": res}, ensure_ascii=False, indent=1))
        rec["result"] = res
    return rec


def truth_set(root, data, sel, catalog, limit_each, seed=7):
    """Karty rozstrzygnięte przez Marcina → (karta, oczekiwana kategoria, oczekiwany slug lub None)."""
    by_name = {norm(p["name"]): p["slug"] for p in catalog}
    rnd = random.Random(seed)
    out = []
    ex = [g for g in data["existing"] if norm(g["title"]) in by_name]
    out += [(g, "dodatek", by_name[norm(g["title"])]) for g in rnd.sample(ex, min(limit_each, len(ex)))]
    cards = sel.get("cards", {})
    new_cat = [g for g in data["new"] + data["maybe"] if (cards.get(g["key"]) or {}).get("decision") == "catalog"]
    out += [(g, "nowy", None) for g in rnd.sample(new_cat, min(limit_each, len(new_cat)))]
    mat = [g for g in data["new"] + data["maybe"] if (cards.get(g["key"]) or {}).get("decision") == "material"]
    out += [(g, "material", None) for g in rnd.sample(mat, min(limit_each, len(mat)))]
    for g in data.get("fresh", []):
        e = cards.get(g["key"]) or {}
        note = norm(e.get("note"))
        if "aion" in note:
            out.append((g, "zamiast-wizualizacji", "aion"))
        elif e.get("decision") == "catalog":
            out.append((g, "nowy", None))
        elif e.get("decision") in ("material", "reject"):
            out.append((g, "material", None))
    return out


def report(root, rows, taken):
    ok = sum(1 for r in rows if r["match"])
    lines = [f"# Test podpowiedzi Terry ({datetime.now().strftime('%Y-%m-%d %H:%M')})", "",
             f"Katalog z {taken}. Trafione: **{ok}/{len(rows)}** (kategoria, a przy dodatku/wariancie także karta).", "",
             "| Karta | Twoja decyzja | Terra | Pewność | Zgodne | Uzasadnienie |", "|---|---|---|---|---|---|"]
    for r in rows:
        res = r.get("result") or {}
        exp = r["expected"] + (f" → {r['expected_product']}" if r["expected_product"] else "")
        got = (res.get("category") or "–") + (f" → {res['product']}" if res.get("product") else "") + (f" ({res['variant']})" if res.get("variant") else "")
        lines.append(f"| {r['title'][:60]} | {exp} | {got} | {res.get('confidence', '–')} | {'tak' if r['match'] else 'NIE'} | {(res.get('reason') or '').replace('|', '/')[:220]} |")
    out = root / "classify" / "test-raport.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out, ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(HERE.parent.parent / "data" / "facebook"))
    ap.add_argument("--run", action="store_true", help="wywołaj model (bez tego: tylko kandydaci)")
    ap.add_argument("--test", action="store_true", help="test na kartach rozstrzygniętych przez Marcina")
    ap.add_argument("--per-group", type=int, default=6, help="test: ile kart z każdej grupy (dodatek/nowy/materiał)")
    ap.add_argument("--key", action="append", default=[])
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--jobs", type=int, default=3)
    a = ap.parse_args()
    root = Path(a.dir).resolve()
    vdir = root / "classify"
    for d in ("sheets", "frames", "terra"):
        (vdir / d).mkdir(parents=True, exist_ok=True)
    data = json.loads((root / "review-data.json").read_text(encoding="utf-8"))
    sel = json.loads((root / "selection.json").read_text(encoding="utf-8")) if (root / "selection.json").exists() else {}
    catalog, taken = load_catalog(root)
    if a.test:
        jobs = truth_set(root, data, sel, catalog, a.per_group)
    else:
        jobs = [(g, None, None) for g in data.get("fresh", [])]
    if a.key:
        jobs = [j for j in jobs if j[0]["key"] in a.key] or [(g, None, None) for sec in ("new", "maybe", "existing", "fresh") for g in data.get(sec, []) if g["key"] in a.key]
    if a.limit:
        jobs = jobs[:a.limit]
    log(f"Katalog: {len(catalog)} kart (zrzut {taken}). Kart do podpowiedzi: {len(jobs)}{' (test)' if a.test else ''}.")

    def one(job):
        g, exp, exp_p = job
        try:
            rec = classify(root, vdir, g, catalog, a.test, a.run, exp)
        except Exception as e:  # noqa: BLE001 – jedna karta nie zatrzymuje reszty
            rec = {"key": g["key"], "title": g.get("title"), "error": str(e)[:400]}
        res = rec.get("result") or {}
        rec.update(expected=exp, expected_product=exp_p, title=g.get("title") or g["key"])
        rec["match"] = bool(res) and res.get("category") == exp and (exp_p is None or res.get("product") == exp_p)
        with LOCK:
            tag = res.get("category", "–") + (f" → {res['product']}" if res.get("product") else "")
            log(f"  {rec['title'][:50]:50} kandydaci: {', '.join(rec.get('candidates', []))[:60]:60} Terra: {tag}"
                + (f"  [oczekiwane: {exp}{' → ' + exp_p if exp_p else ''}]" if a.test else "") + (f"  BŁĄD: {rec['error']}" if rec.get("error") else ""))
        return rec

    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
        rows = list(ex.map(one, jobs))
    if a.test:
        out, ok = report(root, rows, taken)
        log(f"Trafione {ok}/{len(rows)}. Raport: {out}")
    else:
        res = {r["key"]: {k: r.get(k) for k in ("result", "candidates", "error")} for r in rows}
        (vdir / "results.json").write_text(json.dumps({"at": datetime.now(timezone.utc).isoformat(), "katalog": taken, "cards": res}, ensure_ascii=False, indent=1))
        log(f"Podpowiedzi: {vdir / 'results.json'}")


if __name__ == "__main__":
    main()
