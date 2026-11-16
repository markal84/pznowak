#!/usr/bin/env python3
"""Lustro magazynu Vercel Blob w katalogu. Tylko odczyt ze źródła.
Użycie: blob_sync.py <nazwa zmiennej z tokenem> <katalog docelowy>
Pobiera brakujące albo zmienione (inny rozmiar) pliki, usuwa z lustra to, czego już nie ma w magazynie.
Kończy kodem 1, jeśli któregoś pliku nie udało się pobrać."""
import json, os, sys, urllib.parse, urllib.request, time

token_var, dest = sys.argv[1], sys.argv[2]
token = os.environ.get(token_var, "").strip()
if not token:
    print(f"brak tokenu {token_var}", file=sys.stderr); sys.exit(2)
H = {"Authorization": f"Bearer {token}"}

def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60) as r:
                return r.read()
        except Exception:
            if i == tries - 1: raise
            time.sleep(2 * (i + 1))

blobs, cursor = [], None
while True:
    q = {"limit": "1000"}
    if cursor: q["cursor"] = cursor
    page = json.loads(get("https://blob.vercel-storage.com/?" + urllib.parse.urlencode(q)))
    blobs += page["blobs"]
    if not page.get("hasMore"): break
    cursor = page["cursor"]

os.makedirs(dest, exist_ok=True)
wanted, failed, fetched = set(), 0, 0
for b in blobs:
    rel = b["pathname"]
    if rel.startswith("/") or ".." in rel.split("/"):
        print("pomijam podejrzaną ścieżkę", rel, file=sys.stderr); failed += 1; continue
    wanted.add(rel)
    path = os.path.join(dest, rel)
    if os.path.exists(path) and os.path.getsize(path) == b["size"]:
        continue
    try:
        data = get(b["url"])
        if len(data) != b["size"]: raise IOError(f"rozmiar {len(data)} zamiast {b['size']}")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path + ".tmp", "wb") as f: f.write(data)
        os.replace(path + ".tmp", path); fetched += 1
    except Exception as e:
        print("BŁĄD", rel, e, file=sys.stderr); failed += 1

removed = 0
if not failed:  # czyścimy lustro tylko po pełnym, udanym przebiegu
    for root, _, files in os.walk(dest):
        for n in files:
            p = os.path.join(root, n); rel = os.path.relpath(p, dest)
            if rel not in wanted: os.remove(p); removed += 1
print(f"{token_var}: obiektów {len(blobs)}, pobrano {fetched}, usunięto z lustra {removed}, błędów {failed}")
sys.exit(1 if failed else 0)
