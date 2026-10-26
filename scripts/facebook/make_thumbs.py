#!/usr/bin/env python3
"""Robi małe miniatury zdjęć z data/facebook/media do data/facebook/thumbs (oryginałów nie rusza).

Użycie:  python3 scripts/facebook/make_thumbs.py [data/facebook]
Wysokość 360 px (strona pokazuje 180 px, więc wystarcza na ekrany retina), JPEG. Pomija pliki, które już mają
aktualną miniaturę, więc można wołać po każdym pobraniu nowych zdjęć. Wymaga ffmpeg (albo sips na macOS).
"""
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HEIGHT = 360
root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent.parent / "data" / "facebook")
src_dir, out_dir = root / "media", root / "thumbs"
out_dir.mkdir(exist_ok=True)


def make(src, dst):
    tmp = dst.with_name(dst.name + ".tmp.jpg")
    if shutil.which("ffmpeg"):
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", f"scale=-2:'min({HEIGHT},ih)'", "-q:v", "4", str(tmp)]
    elif shutil.which("sips"):
        cmd = ["sips", "--resampleHeight", str(HEIGHT), "-s", "formatOptions", "75", str(src), "--out", str(tmp)]
    else:
        sys.exit("Potrzebny ffmpeg (albo sips).")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not tmp.exists():
        tmp.unlink(missing_ok=True)
        return f"{src.name}: {r.stderr.strip()[:120]}"
    tmp.replace(dst)
    return None


todo = []
for f in sorted(src_dir.iterdir()):
    if f.suffix != ".jpg" or "_thumb" in f.name:
        continue
    dst = out_dir / f.name
    if not dst.exists() or dst.stat().st_mtime < f.stat().st_mtime:
        todo.append((f, dst))

with ThreadPoolExecutor(4) as ex:
    errors = [e for e in ex.map(lambda a: make(*a), todo) if e]
print(f"miniatury: {len(todo) - len(errors)} nowych/odświeżonych, {len(errors)} błędów")
for e in errors:
    print("  ", e)
sys.exit(1 if errors else 0)
