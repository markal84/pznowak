#!/usr/bin/env python3
"""Zlecenie K, pkt 4: ocena kamienia głównego i koloru złota ze zdjęć kart bez tych danych (GPT-6.1 Terra przez `codex exec`).

Jedno wywołanie na kartę (wszystkie jej zdjęcia naraz). Tryb tylko do odczytu, bez zapisu sesji, pusty katalog roboczy,
bez Astry. Nic nie zapisuje w CMS: wynik to plik JSON do przeglądu (tabela w raporcie) i do `mapuj_zloto.py`.

  python3 -I scripts/pierscionki/ocena_kamieni_terra.py --produkty produkty.json --wyniki data/pierscionki-k/terra-oceny.json
  (produkty.json: odpowiedź GET /products?all=true ze środowiska, z którego bierzemy karty)

Zdjęcia: oryginały ze starej strony w data/legacy/jewelry (nazwa pliku w CMS = oryginał + losowy sufiks).
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = Path(__file__).with_name("ocena_schema.json")
CODEX_BIN = os.environ.get("CODEX_BIN", "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex")
MODEL, EFFORT = "gpt-6.1-terra", "medium"
TIMEOUT = 600


def original_name(image_path):
    """/api/media/file/1-57-1024x683-LLWUNN….jpg -> 1-57-1024x683.jpg"""
    base = Path(image_path).name
    m = re.match(r"^(.*?\d+x\d+)-[A-Za-z0-9_-]{20,}(\.\w+)$", base)  # sufiks dodany przez Blob (losowy, bywa z myślnikiem)
    return (m.group(1) + m.group(2)) if m else base


def needs_rating(p):
    metal = (p.get("metal") or "").lower()
    colored_metal = bool(re.search(r"(żó|zo|żo|zó)łt|bia[łl]", metal))
    return not (p.get("stone") or "").strip() or not colored_metal


def prompt(p):
    known = (p.get("stone") or "").strip()
    return (
        "Na zdjęciach jest jeden pierścionek z pracowni jubilerskiej. Nie uruchamiaj żadnych poleceń, patrz tylko na obrazy. "
        "Oceń: (1) kamień główny, (2) jego kolor z listy, (3) kolor złota oprawy i obrączki. "
        "Gdy nie masz pewności co do gatunku kamienia, podaj tylko kolor (np. „kamień różowy”). "
        "Diamenty boczne nie są kamieniem głównym; pierścionek tylko z diamentami to kolor „bezbarwne”. "
        f"W danych kamień główny to: {known or 'brak danych'}. Podaj uczciwą pewność 0-100 i krótkie uzasadnienie po polsku."
    )


def rate(p, files, out_dir):
    with tempfile.TemporaryDirectory(prefix="codex-empty-") as empty:
        out = Path(empty).parent / f"codex-out-{p['slug']}-{os.getpid()}.json"
        cmd = [CODEX_BIN, "exec", "-m", MODEL, "-c", f'model_reasoning_effort="{EFFORT}"', "-s", "read-only",
               "--ephemeral", "--skip-git-repo-check", "-C", empty]
        for f in files:
            cmd += ["-i", str(f)]
        cmd += ["--output-schema", str(SCHEMA), "-o", str(out), prompt(p)]
        t0 = time.time()
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT, stdin=subprocess.DEVNULL)
        except subprocess.TimeoutExpired:
            r = subprocess.CompletedProcess(cmd, 124, "", "timeout")
        text = out.read_text() if out.exists() else ""
        out.unlink(missing_ok=True)
    secs = round(time.time() - t0, 1)
    if r.returncode != 0 or not text:
        return {"slug": p["slug"], "error": (r.stderr or r.stdout).strip()[-300:], "seconds": secs}
    m = re.search(r"\{.*\}", text, re.S)
    res = json.loads(m.group(0) if m else text)
    res.update(slug=p["slug"], name=p["name"], seconds=secs, files=[f.name for f in files])
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--produkty", required=True, help="JSON z /products?all=true")
    ap.add_argument("--wyniki", required=True, help="plik wyjściowy (poza gitem, np. data/pierscionki-k/terra-oceny.json)")
    ap.add_argument("--slugi", nargs="*", help="tylko te karty (domyślnie wszystkie bez kamienia lub koloru złota)")
    ap.add_argument("--zdjecia", type=int, default=3, help="najwyżej tyle zdjęć na kartę")
    ap.add_argument("--apply", action="store_true", help="faktycznie wołaj Terrę; bez tego tylko lista kart i liczba wywołań")
    a = ap.parse_args()
    products = json.load(open(a.produkty))["products"]
    todo = [p for p in products if (p["slug"] in a.slugi if a.slugi else needs_rating(p))]
    jewelry = ROOT / "data" / "legacy" / "jewelry"
    jobs = []
    for p in todo:
        files = [jewelry / original_name(i) for i in p["images"][: a.zdjecia]]
        found = [f for f in files if f.exists()]
        jobs.append((p, found))
        print(f"{p['slug']:<16} {p['name']:<12} zdjęć: {len(found)}/{len(files)}  kamień w danych: {p.get('stone') or '-'}  metal: {p.get('metal') or '-'}")
    print(f"\nkart do oceny: {len(jobs)} = {len(jobs)} wywołań Terry ({MODEL}, {EFFORT})")
    if not a.apply:
        print("Podgląd. Dodaj --apply, żeby wywołać model.")
        return
    results = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        for res in ex.map(lambda j: rate(j[0], j[1], None) if j[1] else {"slug": j[0]["slug"], "error": "brak zdjęć lokalnie"}, jobs):
            print(json.dumps({k: res.get(k) for k in ("slug", "stone", "stone_color", "gold_color", "confidence", "error")}, ensure_ascii=False))
            results.append(res)
    Path(a.wyniki).parent.mkdir(parents=True, exist_ok=True)
    Path(a.wyniki).write_text(json.dumps({"model": MODEL, "effort": EFFORT, "calls": len(jobs), "results": results}, ensure_ascii=False, indent=1))
    print("zapisano", a.wyniki)


if __name__ == "__main__":
    main()
