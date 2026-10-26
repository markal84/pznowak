"""Pobiera zdjęcia i filmy z eksportu posts.json (fanpage FB) do data/facebook/media/."""
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

root = Path(sys.argv[1])
posts = json.loads((root / "posts.json").read_text())["posts"]
out = root / "media"
out.mkdir(exist_ok=True)

jobs = []
for p in posts:
    for ph in p["photos"]:
        if ph.get("uri"):
            jobs.append((ph["uri"], out / f"{p['post_id']}_{ph['id']}.jpg"))
    for v in p["videos"]:
        if v.get("url"):
            jobs.append((v["url"], out / f"{p['post_id']}_{v['id']}.mp4"))
        if v.get("thumb"):
            jobs.append((v["thumb"], out / f"{p['post_id']}_{v['id']}_thumb.jpg"))


def fetch(job):
    url, dest = job
    if dest.exists() and dest.stat().st_size > 0:
        return "skip"
    req = urllib.request.Request(url, headers={"User-Agent": "agent-local"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
        dest.write_bytes(data)
        return "ok"
    except Exception as e:  # noqa: BLE001
        print(f"FAIL {dest.name}: {e}", flush=True)
        return "fail"


with ThreadPoolExecutor(8) as ex:
    results = list(ex.map(fetch, jobs))
print({k: results.count(k) for k in set(results)}, "of", len(jobs))
