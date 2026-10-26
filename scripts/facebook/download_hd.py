"""Podmienia filmy na najlepsze wersje DASH (obraz + dźwięk łączone ffmpeg) i dociąga zdjęcia albumów.

Użycie: python3 -I download_hd.py data/facebook
Stare pliki filmów trafiają do media/_lowres/.
"""
import json
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

root = Path(sys.argv[1])
src = json.loads((root / "hd-sources.json").read_text())
posts = json.loads((root / "posts.json").read_text())["posts"]
media = root / "media"
lowres = media / "_lowres"
lowres.mkdir(exist_ok=True)

video_post = {v["id"]: p["post_id"] for p in posts for v in p["videos"]}
video_post.setdefault("2045599429641464", "122199959000616875")  # moissanit: brak linku w pierwszym eksporcie


def fetch(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "agent-local"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)


def short_side(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    ).stdout.strip().split("\n")[0].strip(",")
    w, h = (int(x) for x in out.split(",")[:2])
    return min(w, h)


best = {}
for v in src["dash"]:
    if v.get("best"):
        best[v["id"]] = (v["best"], v.get("audio"))
for vid, rec in src["hd"].items():
    if rec and rec.get("best"):
        best[vid] = (rec["best"], rec.get("audio"))

done = 0
for vid, (vrep, arep) in sorted(best.items()):
    post_id = video_post.get(vid)
    if not post_id:
        continue
    dest = media / f"{post_id}_{vid}.mp4"
    target = min(vrep["w"], vrep["h"])
    if dest.exists() and short_side(dest) >= target:
        continue
    with tempfile.TemporaryDirectory() as tmp:
        vfile, afile, out = Path(tmp) / "v.mp4", Path(tmp) / "a.mp4", Path(tmp) / "out.mp4"
        try:
            fetch(vrep["url"], vfile)
            cmd = ["ffmpeg", "-loglevel", "error", "-i", str(vfile)]
            if arep:
                fetch(arep["url"], afile)
                cmd += ["-i", str(afile), "-map", "0:v:0", "-map", "1:a:0"]
            cmd += ["-c", "copy", "-movflags", "+faststart", str(out)]
            subprocess.run(cmd, check=True)
        except Exception as e:  # noqa: BLE001
            print(f"FAIL {vid}: {e}", flush=True)
            continue
        if dest.exists():
            dest.rename(lowres / dest.name)
        shutil.move(out, dest)
    done += 1
    print(f"{dest.name}: {target}p {vrep['codecs']} audio={'yes' if arep else 'no'}", flush=True)
print("videos upgraded:", done)

photo_post = {pid: post for post, ids in src["albums"].items() for pid in ids}
got = 0
for pid, rec in src["photos"].items():
    dest = media / f"{photo_post[pid]}_{pid}.jpg"
    if dest.exists() or not rec:
        continue
    fetch(rec["uri"], dest)
    got += 1
print("album photos added:", got)
