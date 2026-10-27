"""Dopisuje przyrostowy eksport (fb_export.js z ustawionym SINCE) do data/facebook/posts.json i hd-sources.json.

Użycie: python3 -I scripts/facebook/merge_export.py data/facebook NOWY_posts.json [NOWY_hd.json]
Stare rekordy zostają bez zmian (decyzje Marcina idą po post_id); dopisywane są tylko posty, których jeszcze nie ma.
Przed zapisem robi kopię *.bak. Nic nie pobiera z sieci.
"""
import json
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1])
new_posts = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
new_hd = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8")) if len(sys.argv) > 3 else None

posts_file = root / "posts.json"
cur = json.loads(posts_file.read_text(encoding="utf-8"))
known = {p["post_id"] for p in cur["posts"]}
added = [p for p in new_posts["posts"] if p["post_id"] not in known]
shutil.copy2(posts_file, posts_file.with_suffix(".json.bak"))
cur["posts"].extend(added)
cur["exportedAt"] = new_posts["exportedAt"]
posts_file.write_text(json.dumps(cur, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"posts.json: dopisano {len(added)} nowych postów, pominięto {len(new_posts['posts']) - len(added)} już znanych")

if new_hd:
    hd_file = root / "hd-sources.json"
    hd = json.loads(hd_file.read_text(encoding="utf-8"))
    shutil.copy2(hd_file, hd_file.with_suffix(".json.bak"))
    have = {v["id"] for v in hd["dash"]}
    hd["dash"].extend(v for v in new_hd["dash"] if v["id"] not in have)
    for key in ("hd", "photos", "albums"):
        for k, v in new_hd[key].items():
            hd[key].setdefault(k, v)  # istniejące wpisy nie są nadpisywane
    hd["exportedAt"] = new_hd["exportedAt"]
    hd_file.write_text(json.dumps(hd, ensure_ascii=False), encoding="utf-8")
    print("hd-sources.json: scalono")
