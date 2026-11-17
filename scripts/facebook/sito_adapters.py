"""Wymienne adaptery modelu dla sita postów (sito.py). Domyślny adapter jest WYŁĄCZONY: nic nie woła modelu.

Adapter dostaje jedno zadanie (jeden post) i zwraca słownik w kształcie classify_schema.json:
  {category, product, variant, confidence, reason}
Wywołanie liczy i ogranicza sito.py (dzienny limit, cache po odcisku zdjęć); adapter tylko pyta model.
Dodanie nowego silnika = nowa klasa z metodą ocen(zadanie) i wpis w ADAPTERY.

Zadanie (dict): card (karta posta z review-data.json), root (data/facebook), vdir (root/classify),
katalog (lista kart katalogu z katalog.json), wskazowka (co sito już wie o poście).
"""
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

KATEGORIE = {"nowy", "dodatek", "zamiast-wizualizacji", "nowy-wariant", "material", "pomin"}
CLAUDE_TIMEOUT = 600


class AdapterWylaczony(RuntimeError):
    """Adapter domyślny: model nie jest wołany."""


def sprawdz(o):
    """Waliduje odpowiedź modelu do kształtu classify_schema.json (rzuca ValueError przy złej kategorii)."""
    if not isinstance(o, dict) or o.get("category") not in KATEGORIE:
        raise ValueError(f"zła odpowiedź modelu: {str(o)[:200]}")
    return {
        "category": o["category"],
        "product": str(o.get("product") or ""),
        "variant": str(o.get("variant") or ""),
        "confidence": max(0, min(100, int(o.get("confidence") or 0))),
        "reason": str(o.get("reason") or "").strip(),
    }


def json_z_tekstu(text):
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        raise ValueError(f"brak JSON w odpowiedzi: {(text or '')[:200]}")
    return json.loads(m.group(0))


class Wylaczony:
    nazwa = "wylaczony"

    def ocen(self, zadanie):
        raise AdapterWylaczony("adapter modelu wyłączony (użyj --adapter codex-terra | claude-haiku | claude-sonnet)")


class Probny:
    """Do testów i prób na sucho: zwraca z góry ustaloną odpowiedź, bez żadnego wywołania zewnętrznego."""

    nazwa = "probny"

    def __init__(self, odpowiedz=None):
        self.odpowiedz = odpowiedz or {"category": "pomin", "product": "", "variant": "", "confidence": 0, "reason": "adapter próbny"}
        self.zadania = []

    def ocen(self, zadanie):
        self.zadania.append(zadanie["card"]["key"])
        return sprawdz(self.odpowiedz)


def _prompt_i_obrazy(zadanie):
    """Ten sam prompt i arkusze co w classify_posts.py (kandydaci z katalogu + arkusz posta)."""
    import classify_posts as cp  # ciężki import (ffmpeg, vision_pairs): tylko gdy model naprawdę ma ruszyć
    import vision_pairs as vp

    root, vdir, card, catalog = zadanie["root"], zadanie["vdir"], zadanie["card"], zadanie["katalog"]
    cands = cp.candidates(root, vdir, card, catalog, False)
    post_sheet = vp.sheet(root, vdir, card)
    sheets = [cp.candidate_sheet(root, vdir, card, c["product"], False) for c in cands]
    prompt = cp.PROMPT.format(post_desc=vp.describe(card), post_text=vp.post_text(card), candidates=cp.describe_candidates(cands, sheets))
    wsk = zadanie.get("wskazowka")
    if wsk:
        prompt += f"\nWSKAZÓWKA Z PORÓWNANIA ZDJĘĆ (darmowe sito): {wsk}\n"
    return prompt, [post_sheet] + [s for s, _ in sheets if s]


class CodexTerra:
    """codex exec (konto ChatGPT), GPT-6.1 Terra: ten sam silnik co classify_posts.py."""

    nazwa = "codex-terra"

    def ocen(self, zadanie):
        import classify_posts as cp
        import vision_pairs as vp

        prompt, obrazy = _prompt_i_obrazy(zadanie)
        h = hashlib.sha1(json.dumps([cp.PROMPT_VERSION, prompt, [Path(i).name for i in obrazy]]).encode()).hexdigest()[:16]
        vp.SCHEMA_PATH = cp.SCHEMA
        res, _meta = vp.ask_codex(zadanie["vdir"], cp.TERRA, prompt, obrazy, h)
        return sprawdz(res)


class ClaudeP:
    """`claude -p` (Haiku albo Sonnet): jedno wywołanie, model może tylko czytać arkusze (narzędzie Read)."""

    def __init__(self, model, nazwa):
        self.model, self.nazwa = model, nazwa

    def komenda(self, prompt, obrazy):
        dirs = sorted({str(Path(i).parent) for i in obrazy})
        lista = "\n".join(f"- {i}" for i in obrazy)
        pelny = (f"{prompt}\nObrazy (otwórz każdy narzędziem Read, w tej kolejności jako obraz 1, 2, …):\n{lista}\n\n"
                 'Odpowiedz WYŁĄCZNIE jednym obiektem JSON: {"category": ..., "product": ..., "variant": ..., "confidence": 0-100, "reason": ...}. '
                 f"Dozwolone category: {', '.join(sorted(KATEGORIE))}.")
        cmd = ["claude", "-p", "--model", self.model, "--output-format", "json", "--allowedTools", "Read", "--max-turns", "8"]
        for d in dirs:
            cmd += ["--add-dir", d]
        return cmd + [pelny]

    def ocen(self, zadanie):
        prompt, obrazy = _prompt_i_obrazy(zadanie)
        cmd = self.komenda(prompt, obrazy)
        with tempfile.TemporaryDirectory(prefix="claude-empty-") as empty:
            try:
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=CLAUDE_TIMEOUT, stdin=subprocess.DEVNULL, cwd=empty)
            except subprocess.TimeoutExpired as e:
                raise RuntimeError(f"claude -p: timeout {CLAUDE_TIMEOUT} s") from e
        if r.returncode != 0:
            raise RuntimeError(f"claude -p (kod {r.returncode}): {(r.stderr or r.stdout).strip()[-400:]}")
        outer = json.loads(r.stdout)
        if isinstance(outer, dict) and outer.get("is_error"):
            raise RuntimeError(f"claude -p: {str(outer.get('result'))[:300]}")
        text = outer.get("result", "") if isinstance(outer, dict) else r.stdout
        return sprawdz(json_z_tekstu(text))


ADAPTERY = {
    "wylaczony": Wylaczony,
    "codex-terra": CodexTerra,
    "claude-haiku": lambda: ClaudeP("haiku", "claude-haiku"),
    "claude-sonnet": lambda: ClaudeP("sonnet", "claude-sonnet"),
}


def wybierz(nazwa):
    if nazwa not in ADAPTERY:
        raise SystemExit(f"nieznany adapter {nazwa!r}; dostępne: {', '.join(ADAPTERY)}")
    return ADAPTERY[nazwa]()
