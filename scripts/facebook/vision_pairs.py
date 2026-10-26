#!/usr/bin/env python3
"""Weryfikacja wizualna „to ten sam pierścionek?” dla par kart z przeglądu FB (zlecenie H, etap B).

Wynik to WYŁĄCZNIE propozycje w data/facebook/vision/. Ten skrypt nigdy nie pisze do selection.json
(czyta go tylko, żeby pominąć pary już rozstrzygnięte przez Marcina: sameAs / notSame).

Użycie (z katalogu głównego repo):
  python3 scripts/facebook/vision_pairs.py                      # tylko lista kandydatów, bez modeli (za darmo)
  python3 scripts/facebook/vision_pairs.py --run --limit 10     # Claude dla 10 nowych par (bez cache)
  python3 scripts/facebook/vision_pairs.py --run                # Claude dla wszystkich nowych par
  python3 scripts/facebook/vision_pairs.py --run --pair KLUCZ_A KLUCZ_B   # wybrana para (także rozstrzygnięta)
  python3 scripts/facebook/vision_pairs.py --run --codex        # do tego Codex/Astra 6 dla par „unsure”

Kandydaci na pary (tylko karty Nowe i Do decyzji):
  - ten sam kamień/typ w tytułach obu kart (słownik STONES),
  - najlepsza para zdjęć/klatek w „szarej strefie” dHash (11–24): ani pewny dubel, ani wyraźnie inne,
  - zdjęcie ↔ film (dHash tu z definicji zawodzi): wystarczy, że kamień/typ z tytułu jednej karty jest w tekście drugiej,
  - bez par z tym samym postem (celowo rozdzielone karty), bez rozstrzygniętych (sameAs/notSame) i bez par z cache.

Materiał dla modelu: jeden arkusz 1536 px na kartę (vision/sheets/): zdjęcia + 8 klatek na film (vision/frames/,
równo rozłożone w czasie, ffmpeg). Para = dwa arkusze + tytuły i teksty postów.

Krok 1: Claude przez `claude -p` (abonament, bez klucza API): obrazy jako bloki base64 w wejściu stream-json,
odpowiedź wymuszona schematem (--json-schema, vision_schema.json). Sonnet domyślnie, Opus dla grup bardzo
podobnych (morganity, turmaliny). Równolegle najwyżej 4. Cache: vision/claude/<skrót>.json, gdzie skrót liczony
jest z kluczy kart i list ich plików, więc zmiana plików karty = nowa para.

Krok 2 (domyślnie WYŁĄCZONY, flaga --codex): tylko pary „unsure” (z --codex-below N także te z pewnością < N %) → `codex exec` z modelem Astra 6, tylko odczyt,
bez zapisu sesji, pusty katalog roboczy, --output-schema. Twardy limit wywołań łącznie (vision/codex-calls.json,
domyślnie 3, decyzja Marcina 4); limitu nie da się podnieść z linii poleceń, tylko zmianą CODEX_HARD_LIMIT w kodzie.
Ścieżka programu: zmienna CODEX_BIN.

Zbiorczy wynik: vision/results.json (czyta go vision_merge.py przy budowie przeglądu).
"""
import argparse
import base64
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
CLAUDE_TIMEOUT = 300
CODEX_TIMEOUT = 600
CODEX_HARD_LIMIT = 3  # decyzja Marcina 4 (26.10.2026): najwyżej 3 wywołania Codexa; zmiana tylko po jego decyzji
CODEX_BIN_DEFAULT = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
CODEX_MODEL = "gpt-6-astra"
MODEL_DEFAULT, MODEL_HARD = "sonnet", "opus"
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


# ---------- krok 1: Claude ----------
def ask_claude(prompt, sheets, model, workdir):
    schema = SCHEMA_PATH.read_text()
    content = [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                             "data": base64.b64encode(p.read_bytes()).decode()}} for p in sheets]
    content.append({"type": "text", "text": prompt})
    msg = {"type": "user", "message": {"role": "user", "content": content}}
    cmd = ["claude", "-p", "--safe-mode", "--tools", "", "--no-session-persistence",
           "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
           "--json-schema", schema, "--model", model]
    t0 = time.time()
    r = subprocess.run(cmd, input=json.dumps(msg) + "\n", capture_output=True, text=True, timeout=CLAUDE_TIMEOUT, cwd=workdir)
    secs = round(time.time() - t0, 1)
    res = None
    for line in r.stdout.splitlines():
        try:
            o = json.loads(line)
        except ValueError:
            continue
        if o.get("type") == "result":
            res = o
    if not res or res.get("is_error") or not isinstance(res.get("structured_output"), dict):
        err = (res or {}).get("result") or r.stderr.strip()[:300] or f"kod {r.returncode}"
        raise RuntimeError(f"claude -p: {err}")
    usage = res.get("usage") or {}
    models = list((res.get("modelUsage") or {}).keys())
    return res["structured_output"], {
        "seconds": secs, "model": models[0] if models else model,
        "costUSDList": res.get("total_cost_usd"),
        "inputTokens": usage.get("input_tokens", 0) + usage.get("cache_creation_input_tokens", 0) + usage.get("cache_read_input_tokens", 0),
        "outputTokens": usage.get("output_tokens", 0),
    }


# ---------- krok 2: Codex / Astra 6 ----------
def codex_counter(vdir):
    p = vdir / "codex-calls.json"
    c = json.loads(p.read_text()) if p.exists() else {"limit": CODEX_HARD_LIMIT, "calls": []}
    c["limit"] = CODEX_HARD_LIMIT
    return p, c


def ask_codex(vdir, prompt, sheets, pair_id):
    p, counter = codex_counter(vdir)
    if len(counter["calls"]) >= counter["limit"]:
        raise RuntimeError(f"limit wywołań Codexa wyczerpany ({len(counter['calls'])}/{counter['limit']})")
    binary = os.environ.get("CODEX_BIN", CODEX_BIN_DEFAULT)
    if not Path(binary).exists():
        raise RuntimeError(f"nie ma programu Codex: {binary} (ustaw CODEX_BIN)")
    # Liczymy wywołanie PRZED uruchomieniem: nieudane też się liczy do limitu.
    counter["calls"].append({"at": now(), "pair": pair_id})
    p.write_text(json.dumps(counter, ensure_ascii=False, indent=1))
    with tempfile.TemporaryDirectory(prefix="codex-empty-") as empty:
        out = Path(empty).parent / f"codex-out-{pair_id}-{os.getpid()}.json"
        cmd = [binary, "exec", "-m", CODEX_MODEL, "-c", 'model_reasoning_effort="high"',
               "-s", "read-only", "--ephemeral", "--skip-git-repo-check", "-C", empty]
        for s in sheets:
            cmd += ["-i", str(s)]
        cmd += ["--output-schema", str(SCHEMA_PATH), "-o", str(out), prompt]
        t0 = time.time()
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=CODEX_TIMEOUT, stdin=subprocess.DEVNULL)
        secs = round(time.time() - t0, 1)
        text = out.read_text() if out.exists() else ""
        out.unlink(missing_ok=True)
    counter["calls"][-1].update(seconds=secs, ok=r.returncode == 0 and bool(text))
    p.write_text(json.dumps(counter, ensure_ascii=False, indent=1))
    if r.returncode != 0 or not text:
        raise RuntimeError(f"codex exec (kod {r.returncode}): {(r.stderr or r.stdout).strip()[-400:]}")
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text), {"seconds": secs, "model": CODEX_MODEL}


# ---------- przebieg ----------
def check(o):
    v = o.get("verdict")
    if v not in ("same", "different", "unsure"):
        raise RuntimeError(f"zły werdykt: {v!r}")
    return {"verdict": v, "confidence": max(0, min(100, int(o.get("confidence") or 0))),
            "reason": str(o.get("reason") or "").strip(), "looked": [str(x) for x in (o.get("looked") or [])][:8]}


def rebuild_results(vdir):
    rows = []
    for f in sorted((vdir / "claude").glob("*.json")):
        c = json.loads(f.read_text())
        cx = vdir / "codex" / f.name
        rows.append({**{k: c[k] for k in ("a", "b", "labelA", "labelB", "titleA", "titleB", "why", "pairHash")},
                     "claude": c["result"] | {"model": c["meta"]["model"]},
                     "codex": (json.loads(cx.read_text())["result"] | {"model": CODEX_MODEL}) if cx.exists() else None})
    (vdir / "results.json").write_text(json.dumps({
        "about": "Propozycje modeli: ten sam pierścionek? Tylko podpowiedzi do przeglądu; decyzje zapisuje Marcin.",
        "updatedAt": now(), "pairs": rows}, ensure_ascii=False, indent=1))
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(HERE.parent.parent / "data" / "facebook"))
    ap.add_argument("--run", action="store_true", help="wywołaj Claude dla nowych par (bez tego tylko lista)")
    ap.add_argument("--limit", type=int, default=0, help="najwyżej tyle nowych par w tym przebiegu")
    ap.add_argument("--pair", nargs=2, action="append", metavar=("A", "B"), help="tylko te pary (mogą być rozstrzygnięte)")
    ap.add_argument("--max-pairs", type=int, default=150, help="bezpiecznik: więcej nowych par = stop")
    ap.add_argument("--jobs", type=int, default=JOBS)
    ap.add_argument("--codex", action="store_true", help="krok 2: Codex/Astra 6 dla par unsure (twardy limit wywołań)")
    ap.add_argument("--codex-below", type=int, default=0, metavar="PROC",
                    help="z --codex: także pary z pewnością Claude poniżej PROC %% (Claude prawie nigdy nie mówi unsure)")
    a = ap.parse_args()

    root = Path(a.dir).resolve()
    vdir = root / "vision"
    for d in ("frames", "sheets", "claude", "codex"):
        (vdir / d).mkdir(parents=True, exist_ok=True)
    sel_before = (root / "selection.json").read_bytes() if (root / "selection.json").exists() else None

    data, cards, labels, sel_cards = load(root)
    by_key = {g["key"]: g for g in cards}
    cands, skipped = candidates(root, cards, labels, sel_cards)
    (vdir / "candidates.json").write_text(json.dumps({"createdAt": now(), "skipped": skipped, "pairs": cands}, ensure_ascii=False, indent=1))
    cached = {f.stem for f in (vdir / "claude").glob("*.json")}

    if a.pair:
        todo = []
        for ka, kb in a.pair:
            if ka not in by_key or kb not in by_key:
                sys.exit(f"nieznana karta: {ka if ka not in by_key else kb}")
            ga, gb = ordered(by_key[ka], by_key[kb])
            c = next((c for c in cands if c["a"] == ga["key"] and c["b"] == gb["key"]), None)
            hard = any(all(h in stones(g["title"]) for g in (ga, gb)) for h in HARD_GROUPS)
            todo.append(c or {"a": ga["key"], "b": gb["key"], "labelA": labels[ga["key"]], "labelB": labels[gb["key"]],
                              "titleA": ga["title"], "titleB": gb["title"], "why": ["wybrana ręcznie (--pair)"],
                              "model": MODEL_HARD if hard else MODEL_DEFAULT, "pairHash": pair_hash(ga, gb)})
    else:
        todo = cands
    new = [c for c in todo if c["pairHash"] not in cached]
    log(f"kandydaci: {len(cands)} (pominięte: {skipped}); nowe do oceny: {len(new)}; w cache: {len(todo) - len(new)}")
    if not a.run:
        for c in cands:
            log(f"  {c['labelA']:>3} ↔ {c['labelB']:<3} {c['model']:6} {'; '.join(c['why'])}  ({c['titleA']} / {c['titleB']})")
        return
    if a.limit:
        new = new[: a.limit]
    if len(new) > a.max_pairs:
        sys.exit(f"STOP: {len(new)} nowych par > {a.max_pairs}. Zawęź (--limit) albo podnieś --max-pairs świadomie.")

    stats = {"startedAt": now(), "claudeCalls": 0, "claudeErrors": 0, "codexCalls": 0, "seconds": 0.0, "costUSDList": 0.0,
             "inputTokens": 0, "outputTokens": 0, "byModel": {}}
    t_start = time.time()
    workdir = tempfile.mkdtemp(prefix="vision-claude-")  # pusty katalog: bez CLAUDE.md i plików projektu

    def one(c):
        ga, gb = by_key[c["a"]], by_key[c["b"]]
        try:
            sheets = [sheet(root, vdir, ga), sheet(root, vdir, gb)]
            res, meta = ask_claude(prompt_for(ga, gb), sheets, c["model"], workdir)
            res = check(res)
        except Exception as e:  # noqa: BLE001 – błąd jednej pary nie zatrzymuje reszty
            with print_lock:
                stats["claudeCalls"] += 1
                stats["claudeErrors"] += 1
            log(f"  BŁĄD {c['labelA']}↔{c['labelB']}: {e}")
            return
        rec = {**c, "createdAt": now(), "promptVersion": PROMPT_VERSION, "sheets": [s.name for s in sheets], "result": res, "meta": meta}
        (vdir / "claude" / f"{c['pairHash']}.json").write_text(json.dumps(rec, ensure_ascii=False, indent=1))
        with print_lock:
            stats["claudeCalls"] += 1
            stats["costUSDList"] += meta["costUSDList"] or 0
            stats["inputTokens"] += meta["inputTokens"]
            stats["outputTokens"] += meta["outputTokens"]
            stats["byModel"][meta["model"]] = stats["byModel"].get(meta["model"], 0) + 1
        log(f"  {c['labelA']:>3} ↔ {c['labelB']:<3} {res['verdict']:9} {res['confidence']:3}%  {meta['seconds']:5}s  {meta['model']}  {res['reason']}")

    with ThreadPoolExecutor(max(1, min(a.jobs, JOBS))) as ex:
        list(ex.map(one, new))
    shutil.rmtree(workdir, ignore_errors=True)

    if a.codex:
        wanted = {c["pairHash"] for c in todo}
        for f in sorted((vdir / "claude").glob("*.json")):
            rec = json.loads(f.read_text())
            doubtful = rec["result"]["verdict"] == "unsure" or rec["result"]["confidence"] < a.codex_below
            if rec["pairHash"] not in wanted or not doubtful or (vdir / "codex" / f.name).exists():
                continue
            _, counter = codex_counter(vdir)
            if len(counter["calls"]) >= counter["limit"]:
                log(f"Codex: limit {counter['limit']} wywołań wyczerpany, reszta par unsure bez drugiej opinii.")
                break
            ga, gb = by_key[rec["a"]], by_key[rec["b"]]
            sheets = [vdir / "sheets" / s for s in rec["sheets"]]
            stats["codexCalls"] += 1
            try:
                res, meta = ask_codex(vdir, prompt_for(ga, gb), sheets, rec["pairHash"])
                res = check(res)
            except Exception as e:  # noqa: BLE001
                log(f"  Codex BŁĄD {rec['labelA']}↔{rec['labelB']}: {e}")
                continue
            (vdir / "codex" / f.name).write_text(json.dumps({"a": rec["a"], "b": rec["b"], "createdAt": now(), "result": res, "meta": meta}, ensure_ascii=False, indent=1))
            log(f"  Codex {rec['labelA']:>3} ↔ {rec['labelB']:<3} {res['verdict']:9} {res['confidence']:3}%  {meta['seconds']}s  {res['reason']}")

    stats["seconds"] = round(time.time() - t_start, 1)
    stats["costUSDList"] = round(stats["costUSDList"], 4)
    stats["pairs"] = len(new)
    with (vdir / "runs.jsonl").open("a") as fh:
        fh.write(json.dumps(stats, ensure_ascii=False) + "\n")
    rows = rebuild_results(vdir)
    after = (root / "selection.json").read_bytes() if (root / "selection.json").exists() else None
    assert after == sel_before, "selection.json zmienił się w trakcie przebiegu – to nie ten skrypt, ale sprawdź!"
    summary = {}
    for r in rows:
        summary[r["claude"]["verdict"]] = summary.get(r["claude"]["verdict"], 0) + 1
    log(f"przebieg: {stats['pairs']} par, {stats['claudeCalls']} wywołań Claude ({stats['claudeErrors']} błędów), "
        f"{stats['codexCalls']} Codexa, {stats['seconds']} s, równowartość cennikowa {stats['costUSDList']} USD; "
        f"wszystkie wyniki w cache: {summary}")


if __name__ == "__main__":
    main()
