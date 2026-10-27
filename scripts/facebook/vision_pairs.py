#!/usr/bin/env python3
"""Weryfikacja wizualna „to ten sam pierścionek?” dla par kart z przeglądu FB (zlecenie H, etap B).

Wynik to WYŁĄCZNIE propozycje w data/facebook/vision/. Ten skrypt nigdy nie pisze do selection.json
(czyta go tylko, żeby pominąć pary już rozstrzygnięte przez Marcina: sameAs / notSame).

Użycie (z katalogu głównego repo):
  python3 scripts/facebook/vision_pairs.py                      # tylko lista kandydatów, bez modeli (za darmo)
  python3 scripts/facebook/vision_pairs.py --run --limit 10     # Terra dla 10 nowych par (bez cache)
  python3 scripts/facebook/vision_pairs.py --run                # Terra dla wszystkich nowych par + eskalacja do Astry
  python3 scripts/facebook/vision_pairs.py --run --pair KLUCZ_A KLUCZ_B   # wybrana para (także rozstrzygnięta)
  python3 scripts/facebook/vision_pairs.py --run --no-escalate  # tylko Terra, bez Astry
  python3 scripts/facebook/vision_pairs.py --escalate-only      # tylko Astra dla par z cache Terry, które jej wymagają

Kandydaci na pary (tylko karty Nowe i Do decyzji):
  - ten sam kamień/typ w tytułach obu kart (słownik STONES),
  - najlepsza para zdjęć/klatek w „szarej strefie” dHash (11–18): ani pewny dubel, ani wyraźnie inne,
  - zdjęcie ↔ film (dHash tu z definicji zawodzi): wystarczy, że kamień/typ z tytułu jednej karty jest w tekście drugiej,
  - bez par z tym samym postem (celowo rozdzielone karty), bez rozstrzygniętych (sameAs/notSame) i bez par z cache.

Materiał dla modelu: jeden arkusz 1536 px na kartę (vision/sheets/): zdjęcia + 8 klatek na film (vision/frames/,
równo rozłożone w czasie, ffmpeg). Para = dwa arkusze + tytuły i teksty postów.

Silnik: WYŁĄCZNIE `codex exec` (konto ChatGPT, bez klucza API); `claude -p` nie jest tu wywoływane (zużywa limit Claude).
  Krok 1 – domyślny model GPT-6.1 Terra (`gpt-6.1-terra`, rozumowanie medium), równolegle najwyżej 4,
    cache vision/terra/<skrót>.json (skrót z kluczy kart i list ich plików: zmiana plików karty = nowa para),
    licznik wywołań vision/terra-calls.json (bez limitu, tylko statystyka).
  Krok 2 – eskalacja: pary, dla których Terra dała „unsure” albo pewność < --escalate-below (domyślnie 75) →
    GPT-6 Astra (`gpt-6-astra`, rozumowanie high), cache vision/astra/<skrót>.json, TWARDY limit wywołań Astry
    w vision/codex-calls.json (osobny licznik; stała ASTRA_HARD_LIMIT w kodzie, z linii poleceń nie do podniesienia).
    Po wyczerpaniu limitu skrypt zatrzymuje eskalację i wypisuje, ile par czeka na Astrę.
  Stare wyniki Claude (vision/claude/) zostają jako historyczne; skrypt ich nie tworzy i nie wywołuje Claude.
Ścieżka programu: zmienna CODEX_BIN.

Zbiorczy wynik: vision/results.json (czyta go vision_merge.py przy budowie przeglądu).
"""
import argparse
import hashlib
import itertools
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import similarity  # noqa: E402  (dist, _ok, group_images)

SCHEMA_PATH = HERE / "vision_schema.json"
SHEET_PX = 1536  # dłuższy bok arkusza karty
SHEET_VERSION = 2  # zmiana wyglądu arkusza = nowe arkusze (cache par liczony z plików kart, nie z arkuszy)
FRAMES_PER_VIDEO = 8
MAX_PHOTOS, MAX_VIDEOS = 8, 3  # więcej i kafelki robią się za małe
GRAY_LO, GRAY_HI = similarity.SAME + 1, similarity.SIMILAR  # 11–18; powyżej (19–24) to tło szumu: ma to prawie każda para
JOBS = 4
CODEX_TIMEOUT = 600
ASTRA_HARD_LIMIT = 3  # decyzja Marcina (26.10.2026): najwyżej 3 wywołania Astry łącznie; zmiana tylko po jego decyzji
ESCALATE_BELOW = 75  # Terra z pewnością poniżej tego progu (%) albo „unsure” → Astra
CODEX_BIN_DEFAULT = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
# Identyfikatory z `codex debug models` (katalog modeli CLI 0.164.0-alpha.11.1): gpt-6.1-terra = „GPT-6.1 Terra”.
TERRA = {"id": "gpt-6.1-terra", "effort": "medium", "dir": "terra", "counter": "terra-calls.json", "limit": None}
ASTRA = {"id": "gpt-6-astra", "effort": "high", "dir": "astra", "counter": "codex-calls.json", "limit": ASTRA_HARD_LIMIT}
MODEL_DEFAULT, MODEL_HARD = "sonnet", "opus"  # tylko pole informacyjne w candidates.json (relikt etapu Claude)
HARD_GROUPS = ("morganit", "turmalin")  # pierścionki bardzo do siebie podobne → Opus

# (etykieta, wyrażenie) – kamienie i typy; ogólne „diament/brylant” celowo pominięte (są prawie wszędzie).
STONES = [
    ("morganit", r"morganit"), ("ametyst", r"ametyst"), ("turmalin", r"turmalin"), ("szafir", r"szafir"),
    ("eternity", r"eternity"), ("oliwin", r"oliwin|perydot"), ("niebieski diament", r"niebiesk\w* (diament|brylant)"),
    ("czarny diament", r"czarn\w* (diament|brylant)"), ("opal", r"\bopal"), ("agat", r"\bagat"),
    ("andaluzyt", r"andaluzyt"), ("szmaragd", r"szmaragd"), ("rubin", r"\brubin"), ("moissanit", r"moissanit"),
    ("onyks", r"onyks"), ("awenturyn", r"awenturyn"), ("sygnet", r"sygnet"), ("obrączka", r"obrącz"),
    ("halo", r"\bhalo\b"), ("trilogy", r"trilogy"), ("solitaire", r"solitaire|soliter"),
]
CUT_WORDS = re.compile(r"szlif\w*\s+(szmaragdow\w*|emerald)|emerald\s*cut")  # „szlif szmaragdowy” to szlif, nie kamień

PROMPT = """Jesteś ekspertem jubilerskim. Porównujesz dwie karty z przeglądu postów pracowni złotniczej na Facebooku.
Pytanie: czy na obu kartach jest TEN SAM fizyczny pierścionek (ten sam egzemplarz albo ten sam model wykonany
identycznie), czy to dwa różne pierścionki?

Obraz 1 = arkusz karty A, obraz 2 = arkusz karty B. Na arkuszu kafelki idą od lewej do prawej, od góry:
najpierw zdjęcia z postów, potem klatki z filmów (8 klatek na film, w kolejności czasu). Zdjęcia i filmy mogą być
z innej sesji, pod innym kątem i w innym świetle; ręka, tło i pudełko nie mają znaczenia.

Patrz na: kształt i kolor kamienia głównego, szlif, liczbę i układ kamieni bocznych, typ oprawy (krapy, szaton,
halo, pavé), kształt szyny, kolor metalu. Tytuły kart są roboczymi nazwami nadanymi przy przeglądzie i mogą być
nieprecyzyjne; teksty postów pisał złotnik.

Odpowiedz zgodnie ze schematem: verdict = same | different | unsure, confidence 0–100, reason = JEDNO zdanie po
polsku, looked = krótkie hasła po polsku, na co patrzyłeś. Wybierz unsure, gdy obrazy nie pozwalają rozstrzygnąć
(np. kamień nieczytelny, inny kolor przez światło) – nie zgaduj. Nie uruchamiaj żadnych poleceń.

Karta A: „{title_a}” ({desc_a})
Tekst postów A:
{text_a}

Karta B: „{title_b}” ({desc_b})
Tekst postów B:
{text_b}
"""
PROMPT_VERSION = 1

print_lock = threading.Lock()


def log(*a):
    with print_lock:
        print(*a, flush=True)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def norm(s):
    return CUT_WORDS.sub(" ", (s or "").lower())


def stones(s):
    t = norm(s)
    return {lbl for lbl, rx in STONES if re.search(rx, t)}


def card_files(g):
    return sorted(g["photos"][:MAX_PHOTOS]) + sorted(v["file"] for v in g["videos"][:MAX_VIDEOS])


def pair_hash(a, b):
    """Skrót zestawu plików pary (kolejność kart bez znaczenia)."""
    parts = sorted([[a["key"], card_files(a)], [b["key"], card_files(b)]])
    return hashlib.sha1(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()[:16]


def ordered(a, b):
    return (a, b) if a["key"] <= b["key"] else (b, a)


# ---------- dane wejściowe (tylko odczyt) ----------
def load(root):
    data = json.loads((root / "review-data.json").read_text(encoding="utf-8"))
    labels = {}
    cards = []
    for sec in ("new", "maybe"):
        for i, g in enumerate(data[sec]):
            labels[g["key"]] = ("D" if sec == "maybe" else "") + str(i + 1)
            cards.append(g)
    sel_path = root / "selection.json"
    sel = json.loads(sel_path.read_text(encoding="utf-8")) if sel_path.exists() else {"cards": {}}
    return data, cards, labels, sel.get("cards", {})


def resolved_pairs(sel_cards, keys):
    """Pary rozstrzygnięte przez Marcina: w jednej grupie sameAs (także łańcuchy) albo na liście notSame."""
    def root_of(k, seen=()):
        n = (sel_cards.get(k) or {}).get("sameAs")
        return k if not n or n in seen or n not in keys else root_of(n, (*seen, k))

    out = set()
    roots = {k: root_of(k) for k in keys}
    for a, b in itertools.combinations(sorted(keys), 2):
        if roots[a] == roots[b]:
            out.add((a, b))
    for k, e in sel_cards.items():
        for o in (e or {}).get("notSame") or []:
            out.add(tuple(sorted((k, o))))
    return out


def candidates(root, cards, labels, sel_cards):
    hashes_path = root / "hashes.json"
    hashes = json.loads(hashes_path.read_text()) if hashes_path.exists() else {"fb": {}}
    imgs = {g["key"]: similarity.group_images(g, hashes) for g in cards}
    resolved = resolved_pairs(sel_cards, {g["key"] for g in cards})
    out, skipped = [], {"wspólny post": 0, "rozstrzygnięte": 0}
    for a, b in itertools.combinations(cards, 2):
        a, b = ordered(a, b)
        if {p["post_id"] for p in a["posts"]} & {p["post_id"] for p in b["posts"]}:
            skipped["wspólny post"] += 1
            continue
        if (a["key"], b["key"]) in resolved:
            skipped["rozstrzygnięte"] += 1
            continue
        why = []
        ta, tb = stones(a["title"]), stones(b["title"])
        if ta & tb:
            why.append("tytuły: " + ", ".join(sorted(ta & tb)))
        best = None
        for fa, ha in imgs[a["key"]]:
            for fb, hb in imgs[b["key"]]:
                d, _, _ = similarity.dist(ha, hb)
                best = d if best is None else min(best, d)
        if best is not None and GRAY_LO <= best <= GRAY_HI:
            why.append(f"dHash w szarej strefie (d={best})")
        pv = (a["photos"] and not a["videos"] and b["videos"] and not b["photos"]) or (
            b["photos"] and not b["videos"] and a["videos"] and not a["photos"])
        if pv:
            xa = ta & stones(" ".join(p["text"] or "" for p in b["posts"]))
            xb = tb & stones(" ".join(p["text"] or "" for p in a["posts"]))
            if xa | xb:
                why.append("zdjęcie ↔ film: " + ", ".join(sorted(xa | xb)))
        if not why:
            continue
        hard = any(all(h in s for s in (ta, tb)) for h in HARD_GROUPS)
        out.append({
            "a": a["key"], "b": b["key"], "labelA": labels[a["key"]], "labelB": labels[b["key"]],
            "titleA": a["title"], "titleB": b["title"], "why": why, "minD": best,
            "model": MODEL_HARD if hard else MODEL_DEFAULT, "pairHash": pair_hash(a, b),
        })
    return out, skipped


# ---------- arkusze ----------
def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def crop_bars(src, dur):
    """Wykrywa czarne pasy wbudowane w film (cropdetect), żeby kafelki pokazywały pierścionek, a nie ramkę."""
    r = run(["ffmpeg", "-v", "info", "-ss", f"{dur * 0.3:.2f}", "-i", str(src), "-t", "3", "-vf", "cropdetect=24:2:0", "-f", "null", "-"])
    found = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", r.stderr)
    return "crop=" + ":".join(found[-1]) if found else None


def video_frames(root, vdir, name):
    src = root / "media" / name
    stem = name[:-4]
    outs = [vdir / "frames" / f"{stem}_f{i}.jpg" for i in range(FRAMES_PER_VIDEO)]
    if all(o.exists() for o in outs):
        return outs
    dur = duration(src) or 1.0
    crop = crop_bars(src, dur)
    for i, o in enumerate(outs):
        t = dur * (i + 0.5) / FRAMES_PER_VIDEO
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(src), *(["-vf", crop] if crop else []),
             "-frames:v", "1", "-q:v", "3", str(o)])
    return [o for o in outs if o.exists()]


def aspect(path):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)])
    try:
        w, h = (int(x) for x in r.stdout.strip().strip(",").split(",")[:2])
        return w / h
    except ValueError:
        return 1.0


def grid(n, ratio):
    """Siatka (kolumny, szer., wys. kafelka) o największym kafelku w kwadracie SHEET_PX przy proporcji kafelka ratio."""
    best = None
    for cols in range(1, n + 1):
        rows = -(-n // cols)
        w = SHEET_PX / cols
        h = w / ratio
        if rows * h > SHEET_PX:
            h = SHEET_PX / rows
            w = h * ratio
        if best is None or w * h > best[1] * best[2]:
            best = (cols, int(w), int(h))
    return best


def sheet(root, vdir, g):
    files = card_files(g)
    h = hashlib.sha1(json.dumps([g["key"], files, SHEET_PX, FRAMES_PER_VIDEO, SHEET_VERSION]).encode()).hexdigest()[:12]
    out = vdir / "sheets" / f"{h}.jpg"
    if out.exists():
        return out
    tiles = [root / "media" / f for f in g["photos"][:MAX_PHOTOS]]
    for v in g["videos"][:MAX_VIDEOS]:
        tiles += video_frames(root, vdir, v["file"])
    tiles = [t for t in tiles if t.exists()]
    if not tiles:
        raise RuntimeError(f"brak plików dla karty {g['key']}")
    n = len(tiles)
    ratios = sorted(aspect(t) for t in tiles)
    cols, tw, th = grid(n, ratios[n // 2])
    tw, th = tw - tw % 2, th - th % 2
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for p in tiles:
        cmd += ["-i", str(p)]
    fc = [f"[{i}:v]scale={tw - 4}:{th - 4}:force_original_aspect_ratio=decrease,pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2:color=0x202020,setsar=1[v{i}]"
          for i in range(n)]
    if n == 1:
        fc.append("[v0]null[out]")
    else:
        layout = "|".join(f"{(i % cols) * tw}_{(i // cols) * th}" for i in range(n))
        fc.append("".join(f"[v{i}]" for i in range(n)) + f"xstack=inputs={n}:layout={layout}:fill=0x202020[out]")
    tmp = out.with_suffix(".tmp.jpg")
    r = run(cmd + ["-filter_complex", ";".join(fc), "-map", "[out]", "-frames:v", "1", "-q:v", "3", str(tmp)])
    if r.returncode != 0 or not tmp.exists():
        raise RuntimeError(f"ffmpeg (arkusz {g['key']}): {r.stderr.strip()[:300]}")
    tmp.replace(out)
    return out


def describe(g):
    n_ph, n_vi = min(len(g["photos"]), MAX_PHOTOS), min(len(g["videos"]), MAX_VIDEOS)
    return f"{n_ph} zdj., {n_vi} film(y) po {FRAMES_PER_VIDEO} klatek" if n_vi else f"{n_ph} zdj."


def post_text(g, limit=900):
    t = "\n---\n".join((p.get("text") or "").strip() for p in g["posts"] if (p.get("text") or "").strip())
    return (t[:limit] + "…") if len(t) > limit else (t or "(bez tekstu)")


def prompt_for(a, b):
    return PROMPT.format(title_a=a["title"], desc_a=describe(a), text_a=post_text(a),
                         title_b=b["title"], desc_b=describe(b), text_b=post_text(b))


# ---------- silnik: codex exec ----------
counter_lock = threading.Lock()


def counter_load(vdir, spec):
    p = vdir / spec["counter"]
    c = json.loads(p.read_text()) if p.exists() else {"calls": []}
    c["limit"] = spec["limit"]
    c["model"] = spec["id"]
    return p, c


def ask_codex(vdir, spec, prompt, sheets, pair_id):
    binary = os.environ.get("CODEX_BIN", CODEX_BIN_DEFAULT)
    if not Path(binary).exists():
        raise RuntimeError(f"nie ma programu Codex: {binary} (ustaw CODEX_BIN)")
    with counter_lock:
        p, counter = counter_load(vdir, spec)
        if spec["limit"] is not None and len(counter["calls"]) >= spec["limit"]:
            raise RuntimeError(f"limit wywołań {spec['id']} wyczerpany ({len(counter['calls'])}/{spec['limit']})")
        # Liczymy wywołanie PRZED uruchomieniem: nieudane też się liczy do limitu.
        counter["calls"].append({"at": now(), "pair": pair_id})
        idx = len(counter["calls"]) - 1
        p.write_text(json.dumps(counter, ensure_ascii=False, indent=1))
    with tempfile.TemporaryDirectory(prefix="codex-empty-") as empty:
        out = Path(empty).parent / f"codex-out-{pair_id}-{os.getpid()}-{spec['dir']}.json"
        cmd = [binary, "exec", "-m", spec["id"], "-c", f'model_reasoning_effort="{spec["effort"]}"',
               "-s", "read-only", "--ephemeral", "--skip-git-repo-check", "-C", empty]
        for s in sheets:
            cmd += ["-i", str(s)]
        cmd += ["--output-schema", str(SCHEMA_PATH), "-o", str(out), prompt]
        t0 = time.time()
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=CODEX_TIMEOUT, stdin=subprocess.DEVNULL)
        except subprocess.TimeoutExpired:
            r = subprocess.CompletedProcess(cmd, 124, "", f"timeout {CODEX_TIMEOUT} s")
        secs = round(time.time() - t0, 1)
        text = out.read_text() if out.exists() else ""
        out.unlink(missing_ok=True)
    ok = r.returncode == 0 and bool(text)
    with counter_lock:
        p, counter = counter_load(vdir, spec)
        counter["calls"][idx].update(seconds=secs, ok=ok)
        p.write_text(json.dumps(counter, ensure_ascii=False, indent=1))
    if not ok:
        raise RuntimeError(f"codex exec (kod {r.returncode}): {(r.stderr or r.stdout).strip()[-400:]}")
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text), {"seconds": secs, "model": spec["id"], "effort": spec["effort"]}


def calls_used(vdir, spec):
    return len(counter_load(vdir, spec)[1]["calls"])


# ---------- przebieg ----------
def check(o):
    v = o.get("verdict")
    if v not in ("same", "different", "unsure"):
        raise RuntimeError(f"zły werdykt: {v!r}")
    return {"verdict": v, "confidence": max(0, min(100, int(o.get("confidence") or 0))),
            "reason": str(o.get("reason") or "").strip(), "looked": [str(x) for x in (o.get("looked") or [])][:8]}


def _read(f):
    return json.loads(f.read_text()) if f.exists() else None


def rebuild_results(vdir):
    """results.json: jedna pozycja na parę; terra/astra = aktywni, claude = historyczny (etap H-B, nie odświeżany)."""
    base, hashes = {}, set()
    for d in ("terra", "claude"):
        for f in sorted((vdir / d).glob("*.json")):
            hashes.add(f.stem)
            rec = _read(f)
            if f.stem not in base or d == "terra":
                base[f.stem] = {k: rec[k] for k in ("a", "b", "labelA", "labelB", "titleA", "titleB", "why") if k in rec}
                base[f.stem]["pairHash"] = f.stem
    rows = []
    for h in sorted(hashes):
        row = dict(base[h])
        for d in ("terra", "astra", "claude"):
            rec = _read(vdir / d / f"{h}.json")
            row[d] = (rec["result"] | {"model": rec["meta"]["model"]}) if rec else None
        rows.append(row)
    (vdir / "results.json").write_text(json.dumps({
        "about": "Propozycje modeli: ten sam pierścionek? Tylko podpowiedzi do przeglądu; decyzje zapisuje Marcin.",
        "updatedAt": now(), "pairs": rows}, ensure_ascii=False, indent=1))
    return rows


def doubtful(res, below):
    return res["verdict"] == "unsure" or res["confidence"] < below


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(HERE.parent.parent / "data" / "facebook"))
    ap.add_argument("--run", action="store_true", help="wywołaj Terrę dla nowych par (bez tego tylko lista)")
    ap.add_argument("--limit", type=int, default=0, help="najwyżej tyle nowych par w tym przebiegu")
    ap.add_argument("--pair", nargs=2, action="append", metavar=("A", "B"), help="tylko te pary (mogą być rozstrzygnięte)")
    ap.add_argument("--max-pairs", type=int, default=150, help="bezpiecznik: więcej nowych par = stop")
    ap.add_argument("--jobs", type=int, default=JOBS)
    ap.add_argument("--no-escalate", action="store_true", help="bez eskalacji do Astry")
    ap.add_argument("--escalate-only", action="store_true", help="bez nowych wywołań Terry; tylko eskalacja par z cache")
    ap.add_argument("--escalate-below", type=int, default=ESCALATE_BELOW, metavar="PROC",
                    help="Terra „unsure” albo pewność poniżej PROC %% → Astra (domyślnie %(default)s)")
    a = ap.parse_args()

    root = Path(a.dir).resolve()
    vdir = root / "vision"
    for d in ("frames", "sheets", "claude", "terra", "astra"):
        (vdir / d).mkdir(parents=True, exist_ok=True)
    legacy = vdir / "codex"  # wyniki Astry z H-B przed rozdzieleniem katalogów
    if legacy.is_dir():
        for f in legacy.glob("*.json"):
            if not (vdir / "astra" / f.name).exists():
                shutil.move(str(f), vdir / "astra" / f.name)
        shutil.rmtree(legacy, ignore_errors=True)
    sel_before = (root / "selection.json").read_bytes() if (root / "selection.json").exists() else None

    data, cards, labels, sel_cards = load(root)
    by_key = {g["key"]: g for g in cards}
    cands, skipped = candidates(root, cards, labels, sel_cards)
    (vdir / "candidates.json").write_text(json.dumps({"createdAt": now(), "skipped": skipped, "pairs": cands}, ensure_ascii=False, indent=1))
    cached = {f.stem for f in (vdir / "terra").glob("*.json")}

    if a.pair:
        todo = []
        for ka, kb in a.pair:
            if ka not in by_key or kb not in by_key:
                sys.exit(f"nieznana karta: {ka if ka not in by_key else kb}")
            ga, gb = ordered(by_key[ka], by_key[kb])
            c = next((c for c in cands if c["a"] == ga["key"] and c["b"] == gb["key"]), None)
            todo.append(c or {"a": ga["key"], "b": gb["key"], "labelA": labels[ga["key"]], "labelB": labels[gb["key"]],
                              "titleA": ga["title"], "titleB": gb["title"], "why": ["wybrana ręcznie (--pair)"],
                              "model": MODEL_DEFAULT, "pairHash": pair_hash(ga, gb)})
    else:
        todo = cands
    new = [] if a.escalate_only else [c for c in todo if c["pairHash"] not in cached]
    log(f"kandydaci: {len(cands)} (pominięte: {skipped}); nowe do oceny: {len(new)}; w cache Terry: {len(todo) - len(new) if not a.escalate_only else len([c for c in todo if c['pairHash'] in cached])}")
    if not (a.run or a.escalate_only):
        for c in cands:
            log(f"  {c['labelA']:>3} ↔ {c['labelB']:<3} {'; '.join(c['why'])}  ({c['titleA']} / {c['titleB']})")
        return
    if a.limit:
        new = new[: a.limit]
    if len(new) > a.max_pairs:
        sys.exit(f"STOP: {len(new)} nowych par > {a.max_pairs}. Zawęź (--limit) albo podnieś --max-pairs świadomie.")

    stats = {"startedAt": now(), "engine": "codex exec", "terraModel": TERRA["id"], "terraEffort": TERRA["effort"],
             "terraCalls": 0, "terraErrors": 0, "astraCalls": 0, "astraErrors": 0, "astraPending": 0,
             "seconds": 0.0, "terraSecondsSum": 0.0}
    t_start = time.time()

    def one(c):
        ga, gb = by_key[c["a"]], by_key[c["b"]]
        try:
            sheets = [sheet(root, vdir, ga), sheet(root, vdir, gb)]
            res, meta = ask_codex(vdir, TERRA, prompt_for(ga, gb), sheets, c["pairHash"])
            res = check(res)
        except Exception as e:  # noqa: BLE001 – błąd jednej pary nie zatrzymuje reszty
            with print_lock:
                stats["terraCalls"] += 1
                stats["terraErrors"] += 1
            log(f"  BŁĄD {c['labelA']}↔{c['labelB']}: {e}")
            return
        rec = {**c, "createdAt": now(), "promptVersion": PROMPT_VERSION, "sheets": [s.name for s in sheets], "result": res, "meta": meta}
        (vdir / "terra" / f"{c['pairHash']}.json").write_text(json.dumps(rec, ensure_ascii=False, indent=1))
        with print_lock:
            stats["terraCalls"] += 1
            stats["terraSecondsSum"] += meta["seconds"]
        log(f"  {c['labelA']:>3} ↔ {c['labelB']:<3} {res['verdict']:9} {res['confidence']:3}%  {meta['seconds']:5}s  Terra  {res['reason']}")

    if new:
        with ThreadPoolExecutor(max(1, min(a.jobs, JOBS))) as ex:
            list(ex.map(one, new))

    if not a.no_escalate:
        wanted = {c["pairHash"] for c in todo}
        queue = []
        for f in sorted((vdir / "terra").glob("*.json")):
            rec = json.loads(f.read_text())
            if rec["pairHash"] in wanted and doubtful(rec["result"], a.escalate_below) and not (vdir / "astra" / f.name).exists():
                queue.append(rec)
        for n, rec in enumerate(queue):
            if calls_used(vdir, ASTRA) >= ASTRA_HARD_LIMIT:
                stats["astraPending"] = len(queue) - n
                log(f"Astra: limit {ASTRA_HARD_LIMIT} wywołań wyczerpany ({calls_used(vdir, ASTRA)}/{ASTRA_HARD_LIMIT}); "
                    f"na drugą opinię Astry czeka {stats['astraPending']} par(a): "
                    + ", ".join(f"{r['labelA']}↔{r['labelB']} ({r['result']['verdict']} {r['result']['confidence']}%)" for r in queue[n:]))
                break
            ga, gb = by_key[rec["a"]], by_key[rec["b"]]
            sheets = [vdir / "sheets" / s for s in rec["sheets"]]
            stats["astraCalls"] += 1
            try:
                res, meta = ask_codex(vdir, ASTRA, prompt_for(ga, gb), sheets, rec["pairHash"])
                res = check(res)
            except Exception as e:  # noqa: BLE001
                stats["astraErrors"] += 1
                log(f"  Astra BŁĄD {rec['labelA']}↔{rec['labelB']}: {e}")
                continue
            (vdir / "astra" / f"{rec['pairHash']}.json").write_text(json.dumps(
                {"a": rec["a"], "b": rec["b"], "pairHash": rec["pairHash"], "createdAt": now(), "result": res, "meta": meta},
                ensure_ascii=False, indent=1))
            log(f"  Astra {rec['labelA']:>3} ↔ {rec['labelB']:<3} {res['verdict']:9} {res['confidence']:3}%  {meta['seconds']}s  {res['reason']}")

    stats["seconds"] = round(time.time() - t_start, 1)
    stats["terraSecondsSum"] = round(stats["terraSecondsSum"], 1)
    stats["pairs"] = len(new)
    with (vdir / "runs.jsonl").open("a") as fh:
        fh.write(json.dumps(stats, ensure_ascii=False) + "\n")
    rows = rebuild_results(vdir)
    after = (root / "selection.json").read_bytes() if (root / "selection.json").exists() else None
    assert after == sel_before, "selection.json zmienił się w trakcie przebiegu – to nie ten skrypt, ale sprawdź!"
    summary = {}
    for r in rows:
        if r["terra"]:
            summary[r["terra"]["verdict"]] = summary.get(r["terra"]["verdict"], 0) + 1
    log(f"przebieg: {stats['pairs']} nowych par, Terra {stats['terraCalls']} wywołań ({stats['terraErrors']} błędów), "
        f"Astra {stats['astraCalls']} ({stats['astraErrors']} błędów, czeka {stats['astraPending']}), {stats['seconds']} s; "
        f"wyniki Terry w cache: {summary}; licznik Astry {calls_used(vdir, ASTRA)}/{ASTRA_HARD_LIMIT}, Terry {calls_used(vdir, TERRA)}")


if __name__ == "__main__":
    main()
