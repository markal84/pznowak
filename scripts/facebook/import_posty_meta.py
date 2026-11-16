"""Dopisuje posty pobrane przez skrypt Graph API (scripts/posty-meta) do przeglądu: data/facebook/posts.json + media/.

Użycie (z katalogu głównego repo):
  python3 -I scripts/facebook/import_posty_meta.py ~/"PZ Nowak posty" data/facebook

Źródło to kopia z serwera na Macu (mac/kopia-na-maca.sh): katalogi posty/<data>_<strona>_<post>/ z post.json i plikami.
Posty, które już są w posts.json (to samo post_id), są pomijane, więc polecenie można powtarzać po każdej kopii.
Rolka, której film jest już w innym poście (ten sam id filmu), też jest pomijana.
Pliki trafiają do media/ pod nazwami jak z eksportu przeglądarkowego (<post_id>_<id zdjęcia/filmu>.jpg|.mp4); do filmów
robi się klatka podglądu <post_id>_<id>_thumb.jpg (ffmpeg). Przed zapisem kopia posts.json.bak. Nic nie pobiera z sieci.
Potem: python3 scripts/facebook/build_review.py data/facebook (nowe posty lądują w sekcji „Nowe od DD.MM”).
"""
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def plural(n, one, few, many):
    if n == 1:
        return one
    return few if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14) else many


def load_source(src):
    out = []
    for f in sorted((src / "posty").glob("*/post.json")):
        meta = json.loads(f.read_text(encoding="utf-8"))
        if meta.get("platform") != "facebook":
            continue  # Instagram: przegląd jest dziś tylko dla postów z FB
        out.append((f.parent, meta))
    return out


def to_record(folder, meta):
    post_id = str(meta["id"]).split("_")[-1]
    created = datetime.fromisoformat(meta["created_time"].replace("Z", "+00:00"))
    photos, videos, files = [], [], []
    for i, f in enumerate(meta.get("files", [])):
        if not f.get("name") or not (folder / f["name"]).exists():
            continue
        media_id = str(f.get("id") or f"{post_id}{i + 1:02d}")
        if f["type"] == "video":
            videos.append({"id": media_id})
            files.append((folder / f["name"], f"{post_id}_{media_id}.mp4", True))
        else:
            photos.append({"id": media_id})
            files.append((folder / f["name"], f"{post_id}_{media_id}.jpg", False))
    text = "\n\n".join(x for x in (meta.get("title"), meta.get("text")) if x)
    record = {
        "post_id": post_id,
        "time": int(created.timestamp()),
        "date": created.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "url": meta.get("permalink") or "",
        "text": text,
        "albumCount": len(photos),
        "photos": photos,
        "videos": videos,
        "source": "graph-api",
    }
    return record, files


def video_thumb(video, dest):
    try:
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-ss", "1", "-i", str(video), "-frames:v", "1", "-q:v", "3", str(dest)],
            check=True, capture_output=True, timeout=120,
        )
        return dest.exists()
    except (OSError, subprocess.SubprocessError):
        return False


def import_posts(src, root):
    """Dopisuje nowe posty z kopii src do root/posts.json. Zwraca słownik z licznikami (używa go też refresh_posts.py)."""
    src, root = Path(src).expanduser(), Path(root)
    posts_file = root / "posts.json"
    cur = json.loads(posts_file.read_text(encoding="utf-8"))
    known = {p["post_id"] for p in cur["posts"]}
    known_videos = {v["id"] for p in cur["posts"] for v in p.get("videos", [])}
    media = root / "media"
    media.mkdir(exist_ok=True)

    added, skipped, copied, no_thumb = [], 0, 0, 0
    for folder, meta in load_source(src):
        record, files = to_record(folder, meta)
        if record["post_id"] in known or (record["videos"] and not record["photos"] and all(v["id"] in known_videos for v in record["videos"])):
            skipped += 1
            continue
        if not files:
            print(f"pomijam {folder.name}: brak pobranych plików")
            continue
        for path, name, is_video in files:
            dest = media / name
            if not dest.exists():
                shutil.copy2(path, dest)
                copied += 1
            thumb = media / name.replace(".mp4", "_thumb.jpg")
            if is_video and not thumb.exists() and not video_thumb(dest, thumb):
                no_thumb += 1
        added.append(record)
        known.add(record["post_id"])
        known_videos.update(v["id"] for v in record["videos"])

    if added:
        shutil.copy2(posts_file, posts_file.with_suffix(".json.bak"))
        cur["posts"].extend(added)
        tmp = posts_file.with_name(posts_file.name + ".tmp")
        tmp.write_text(json.dumps(cur, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(posts_file)
    return {"added": len(added), "skipped": skipped, "copied": copied, "no_thumb": no_thumb}


def summary(r):
    n, copied = r["added"], r["copied"]
    lines = [f"posts.json: dopisano {n} {plural(n, 'nowy post', 'nowe posty', 'nowych postów')} "
             f"({copied} {plural(copied, 'plik', 'pliki', 'plików')} do media/), pominięto już znane: {r['skipped']}"]
    if r["no_thumb"]:
        lines.append(f"uwaga: filmy bez klatki podglądu (brak ffmpeg?): {r['no_thumb']}; przegląd pokaże je bez miniatury")
    return lines


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    r = import_posts(sys.argv[1], sys.argv[2])
    print("\n".join(summary(r)))
    if r["added"]:
        print("dalej: python3 scripts/facebook/build_review.py data/facebook")


if __name__ == "__main__":
    main()
