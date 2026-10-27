"""Dokłada wyniki weryfikacji modelem (vision/results.json z vision_pairs.py) do danych przeglądu.

Wołane z build_review.py jedną linią: vision_merge.add(root, page_data). Osobny moduł, żeby zmiany w budowie
listy kart (build_review.py) nie mieszały się z tą funkcją.

Co robi (tylko podpowiedzi; selection.json nie jest tu nawet czytany):
  - page_data["vision"]["<klucz A>|<klucz B>"] = opinie modeli dla pary (do plakietek przy propozycjach i dublach),
  - para „prawdopodobnie ten sam” albo „niepewne” (u któregokolwiek modelu) → propozycja połączenia
    w page_data["proposals"] (z polem "model"); jeśli propozycja tej pary już jest (ręczna, z notatki), dostaje tylko
    plakietkę modelu,
  - kolejność i zasada: plakietki pokazują w pierwszej kolejności GPT Terra 6.1 (pole "terra"), potem Astrę 6 (eskalacja);
    stare opinie Claude (pole "claude", etap H-B) są tylko historyczne i pokazują się WYŁĄCZNIE, gdy pary nie oceniła Terra
    (nie wpływają wtedy na rozbieżność „modele się różnią” przy parach ocenionych Terrą),
  - para „raczej inny” u wszystkich modeli → bez nowej propozycji; plakietka tylko przy istniejącej propozycji/dublu.
Przegląd sam ukrywa propozycje par już połączonych albo odrzuconych („to nie ten”).
"""
import json
from pathlib import Path

NAMES = {"gpt-6.1-terra": "GPT Terra 6.1", "gpt-6-astra": "Astra 6",
         "claude-sonnet-5-5": "Claude Sonnet 5.5", "claude-opus-5-5": "Claude Opus 5.5"}


def _opinion(o):
    return {"verdict": o["verdict"], "confidence": o["confidence"], "reason": o.get("reason", ""),
            "looked": o.get("looked", []), "model": NAMES.get(o.get("model"), o.get("model", "model"))}


def pair_id(a, b):
    return "|".join(sorted((a, b)))


def add(root, page_data):
    path = Path(root) / "vision" / "results.json"
    page_data["vision"] = {}
    if not path.exists():
        return 0
    cards = {g["key"] for sec in ("new", "maybe") for g in page_data[sec]}
    props = page_data.setdefault("proposals", [])
    by_pair = {pair_id(p["a"], p["b"]): p for p in props}
    added = 0
    for r in json.loads(path.read_text(encoding="utf-8")).get("pairs", []):
        if r["a"] not in cards or r["b"] not in cards:
            continue
        ops = [_opinion(r[k]) for k in ("terra", "astra") if r.get(k)]
        if not r.get("terra") and r.get("claude"):
            ops.insert(0, _opinion(r["claude"]))
        if not ops:
            continue
        pid = pair_id(r["a"], r["b"])
        page_data["vision"][pid] = ops
        if pid in by_pair:
            by_pair[pid]["model"] = ops
        elif any(o["verdict"] in ("same", "unsure") for o in ops):
            p = {"a": r["a"], "b": r["b"], "source": "model", "reason": "", "model": ops}
            props.append(p)
            by_pair[pid] = p
            added += 1
    return added
