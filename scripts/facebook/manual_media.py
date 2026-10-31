"""Media spoza Facebooka i oznaczenia treści AI dla przeglądu (używa build_review.py i export_selection.py).

Media spoza FB (np. zdjęcia przysłane przez Kamilę na Messengerze) leżą w data/facebook/manual/<data>_<źródło>/manual.json:
  {"version": 1, "source": "Kamila, Messenger 29.10.2026", "date": "2026-10-29",
   "cards": [
     {"id": "moissanit-1ct", "post_id": "122200020668616875", "files": ["1ct/a.jpg", "1ct/b.jpg"]},
     {"id": "moissanit-2ct", "title": "Moissanit 2 ct szampański", "note": "…", "files": ["2ct/c.jpg"]}]}
  - bez "post_id": osobna karta w sekcji „Nowe pierścionki” (pseudo-post „manual-<id>”),
  - z "post_id": zdjęcia dołączają do karty tego posta (post z filmem z FB + zdjęcia od Kamili = jedna karta).
  Pliki (tylko .jpg) są kopiowane do media/ jako manual-<id>_<nazwa>; oryginały zostają nietknięte. Dalej karta jak każda inna
  (miniatury, podobieństwa, decyzje w selection.json), tylko z plakietką „spoza FB”.

Treści AI: data/facebook/ai-flags.json
  {"version": 1, "flags": [{"post_id": "…", "files": ["…jpg"], "label": "…", "source": "…", "allow": false}]}
  Bez "files" oznaczone są wszystkie zdjęcia i filmy posta. Oznaczone pliki mają w przeglądzie czerwoną plakietkę „AI”,
  a export_selection.py nie wpuszcza ich do katalogu ani do galerii, dopóki "allow" nie zostanie ustawione na true
  (jawna decyzja Marcina; Facebook sam nie podaje tej etykiety w danych, które zapisuje fb_export.js).
"""
import json
import re
import shutil
from pathlib import Path

PREFIX = "manual-"
ID_RE = re.compile(r"^[a-z0-9-]+$")


def pseudo_post_id(card_id):
    return PREFIX + card_id


def is_manual_post(post_id):
    return str(post_id).startswith(PREFIX)


def load_manual(root):
    """Karty z data/facebook/manual/*/manual.json; każda: id, title, note, source, date, post_id, files[(źródło, nazwa w media/)]."""
    root = Path(root)
    cards, seen = [], set()
    for mf in sorted((root / "manual").glob("*/manual.json")):
        spec = json.loads(mf.read_text(encoding="utf-8"))
        for c in spec["cards"]:
            cid = c["id"]
            assert ID_RE.match(cid), f"{mf}: id karty „{cid}” ma mieć tylko a-z, 0-9 i myślniki"
            assert cid not in seen, f"{mf}: zdublowane id karty „{cid}”"
            seen.add(cid)
            assert c.get("post_id") or c.get("title"), f"{mf}: karta „{cid}” bez post_id musi mieć title"
            files, names = [], set()
            for rel in c["files"]:
                src = mf.parent / rel
                assert src.is_file(), f"{mf}: brak pliku {rel}"
                assert src.suffix == ".jpg", f"{mf}: {rel} nie jest .jpg (przeglądarka postów obsługuje tylko .jpg)"
                name = f"{PREFIX}{cid}_{src.name}"
                assert name not in names, f"{mf}: dwa pliki o nazwie {src.name} w karcie „{cid}”"
                names.add(name)
                files.append((src, name))
            cards.append({
                "id": cid, "title": c.get("title", ""), "note": c.get("note", ""), "post_id": c.get("post_id"),
                "source": spec.get("source", ""), "date": spec.get("date", ""), "files": files,
            })
    return cards


def sync_media(root, cards):
    """Kopiuje pliki kart do media/ (pomija te, które już tam są w tym samym rozmiarze). Zwraca liczbę skopiowanych."""
    media = Path(root) / "media"
    n = 0
    for c in cards:
        for src, name in c["files"]:
            dst = media / name
            if dst.exists() and dst.stat().st_size == src.stat().st_size:
                continue
            shutil.copy2(src, dst)
            n += 1
    return n


def extras_by_post(cards):
    """{post_id: [nazwy w media/]} dla kart dołączanych do posta z FB."""
    out = {}
    for c in cards:
        if c["post_id"]:
            out.setdefault(c["post_id"], []).extend(name for _, name in c["files"])
    return out


def pseudo_post(card):
    return {"idx": None, "post_id": pseudo_post_id(card["id"]), "date": card["date"], "text": card["note"],
            "manual": True, "source": card["source"]}


def standalone_cards(cards):
    return [c for c in cards if not c["post_id"]]


def annotate_manual(page_data, cards, sections=("new", "maybe", "existing", "fresh")):
    """Dokłada do kart pole manualFiles {plik: źródło} (plakietka „spoza FB” przy zdjęciu)."""
    src = {name: c["source"] for c in cards for _, name in c["files"]}
    for sec in sections:
        for g in page_data.get(sec, []):
            mine = {f: src[f] for f in g["photos"] if f in src}
            if mine:
                g["manualFiles"] = mine


def load_ai(root):
    path = Path(root) / "ai-flags.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8")).get("flags", [])


def annotate_ai(page_data, flags, sections=("new", "maybe", "existing", "fresh")):
    """Dokłada do kart pole ai {plik: {label, source, allow}}. Zwraca listę ostrzeżeń (flagi bez pasującej karty)."""
    used, warnings = set(), []
    for sec in sections:
        for g in page_data.get(sec, []):
            pids = {p["post_id"] for p in g["posts"]}
            have = list(g["photos"]) + [v["file"] for v in g["videos"]]
            ai = {}
            for i, fl in enumerate(flags):
                if fl["post_id"] not in pids:
                    continue
                files = fl.get("files") or [f for f in have if f.startswith(fl["post_id"] + "_")]
                for f in files:
                    if f in have:
                        ai[f] = {"label": fl.get("label", "AI"), "source": fl.get("source", ""), "allow": bool(fl.get("allow"))}
                        used.add(i)
            if ai:
                g["ai"] = ai
    for i, fl in enumerate(flags):
        if i not in used:
            warnings.append(f"ai-flags.json: znacznik AI posta {fl['post_id']} nie pasuje do żadnego zdjęcia w kartach")
    return warnings
