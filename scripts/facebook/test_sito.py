"""Testy sito.py na danych przykładowych (scripts/facebook/sito_przyklad): python3 -m unittest scripts/facebook/test_sito.py"""
import json
import shutil
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import sito  # noqa: E402
import sito_adapters as ad  # noqa: E402

PRZYKLAD = HERE / "sito_przyklad"
DZIEN1, DZIEN2 = date(2026, 11, 17), date(2026, 11, 18)


def kopia(tmp):
    root = Path(tmp) / "facebook"
    (root / "classify" / "sito").mkdir(parents=True)
    for f in ("review-data.json", "hashes.json"):
        shutil.copy(PRZYKLAD / f, root / f)
    shutil.copy(PRZYKLAD / "katalog-odciski.json", root / "classify" / "sito" / "katalog-odciski.json")
    return root


def uruchom(root, adapter, model=True, limit=15, dzis=DZIEN1, **kw):
    return sito.przebieg(root, ("fresh",), adapter, model, limit, dzis=dzis, **kw)


class SitoTest(unittest.TestCase):
    def test_statusy_i_oznaczenia(self):
        with tempfile.TemporaryDirectory() as tmp:
            o = uruchom(kopia(tmp), ad.Wylaczony(), model=False)
            p = o["posts"]
            self.assertEqual({k: v["status"] for k, v in p.items()},
                             {"p1": "rozpoznany", "p2": "czesciowo", "p3": "nowy", "p4": "bez-zdjec", "p5": "nowy",
                              "p6": "nowy", "p7": "nowy", "p8": "nowy", "p9": "bez-zdjec"})
            self.assertEqual([x["slug"] for x in p["p1"]["produkty"]], ["iris"])
            self.assertEqual(p["p1"]["zdjecia"]["p1_b.jpg"]["img"], "iris/102")  # które zdjęcie już jest
            self.assertEqual(p["p1"]["zdjecia"]["p1_b.jpg"]["variant"], "Szafir")
            self.assertEqual(p["p2"]["zdjecia"]["p2_a.jpg"]["poziom"], "jest")
            self.assertTrue(p["p2"]["zdjecia"]["p2_a.jpg"]["isVisualization"])
            self.assertEqual(p["p2"]["zdjecia"]["p2_b.jpg"]["poziom"], "brak")
            self.assertIn("Aion", p["p2"]["wskazowka"])
            # d≈14 względem Iris to szum, nie rozpoznanie
            self.assertIn(p["p6"]["zdjecia"]["p6_a.jpg"]["poziom"], ("podobne", "brak"))
            self.assertEqual(p["p6"]["status"], "nowy")

    def test_bez_modelu_nic_nie_jest_wolane_i_nie_liczy_limitu(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = kopia(tmp)
            o = uruchom(root, ad.Wylaczony(), model=False)
            self.assertEqual(o["limit"]["uzyte"], 0)
            self.assertEqual(o["posts"]["p3"]["model"], "w-kolejce")
            self.assertNotIn("model", o["posts"]["p1"])  # rozpoznane nie idą do modelu
            self.assertFalse((root / "classify" / "sito" / "wyniki.json").exists())

    def test_wylaczony_adapter_nie_ocenia_ale_liczy_sie_jako_blad(self):
        with tempfile.TemporaryDirectory() as tmp:
            o = uruchom(kopia(tmp), ad.Wylaczony(), model=True)
            self.assertEqual(o["posts"]["p3"]["model"], "blad")
            self.assertIn("wyłączony", o["posts"]["p3"]["blad"])

    def test_jedno_wywolanie_na_post_cache_po_odcisku_i_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = kopia(tmp)
            probny = ad.Probny({"category": "nowy", "product": "", "variant": "", "confidence": 80, "reason": "test"})
            o = uruchom(root, probny, limit=3)
            # kolejka: p2, p3, p5 (ten sam zestaw co p3), p6, p7, p8; limit 3 → p2, p3, p6; p5 bierze wynik p3 z cache
            self.assertEqual(probny.zadania, ["p2", "p3", "p6"])
            self.assertEqual(o["posts"]["p5"]["model"], "cache")
            self.assertEqual(o["posts"]["p5"]["wynik"]["category"], "nowy")
            self.assertEqual(o["posts"]["p7"]["model"], "czeka-do-jutra")
            self.assertEqual(o["limit"]["uzyte"], 3)
            # drugi bieg tego samego dnia: nic nowego, limit wyczerpany
            probny2 = ad.Probny()
            o2 = uruchom(root, probny2, limit=3)
            self.assertEqual(probny2.zadania, [])
            self.assertEqual(o2["posts"]["p2"]["model"], "cache")
            self.assertEqual(o2["posts"]["p7"]["model"], "czeka-do-jutra")
            # następnego dnia limit się odnawia, reszta jest oceniana, wcześniejsze z cache
            probny3 = ad.Probny()
            uruchom(root, probny3, limit=3, dzis=DZIEN2)
            self.assertEqual(probny3.zadania, ["p7", "p8"])

    def test_nieudane_wywolanie_liczy_sie_do_limitu(self):
        class Pada:
            nazwa = "pada"

            def ocen(self, z):
                raise RuntimeError("boom")

        with tempfile.TemporaryDirectory() as tmp:
            root = kopia(tmp)
            o = uruchom(root, Pada(), limit=2)
            self.assertEqual(o["limit"]["uzyte"], 2)
            self.assertEqual([a["model"] for a in o["posts"].values() if a.get("model")].count("blad"), 2)
            self.assertEqual(list(json.loads((root / "classify" / "sito" / "wyniki.json").read_text())["results"]) if (root / "classify" / "sito" / "wyniki.json").exists() else [], [])

    def test_sito_nie_dotyka_selection_ani_innych_plikow(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = kopia(tmp)
            (root / "selection.json").write_text("{}")
            uruchom(root, ad.Probny())
            self.assertEqual((root / "selection.json").read_text(), "{}")
            zapisane = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
            self.assertTrue(all(p.startswith("classify/sito/") or p in ("review-data.json", "hashes.json", "selection.json") for p in zapisane), zapisane)

    def test_budowa_odciskow_katalogu_bez_sieci(self):
        katalog = [{"slug": "iris", "name": "Iris", "media": [{"id": 1, "url": "/a.jpg"}, {"id": 2, "url": "/v.mp4", "video": True}],
                    "variants": [{"stone": "Szafir", "isVisualization": True, "image": {"id": 3, "url": "/b.jpg"}, "moreImages": [{"id": 4, "url": "/c.jpg"}]}]}]
        pobrane = []
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            f = lambda m: pobrane.append(m["id"]) or f"/x/{m['id']}"  # noqa: E731
            h = lambda p: None if p.endswith("/4") else {"f": "00ff00ff00ff00ff", "c": "00ff00ff00ff00ff"}  # noqa: E731
            plik, n, brak = sito.zbuduj_odciski_katalogu(root, katalog, f, h)
            self.assertEqual((n, brak, pobrane), (2, 1, [1, 3, 4]))  # film pominięty, brak pliku 4 policzony
            idx = json.loads(plik.read_text())["images"]
            self.assertTrue(idx["iris/3"]["isVisualization"])
            self.assertEqual(idx["iris/3"]["variant"], "Szafir")
            # drugi bieg: policzone zdjęcia nie są pobierane ponownie
            pobrane.clear()
            sito.zbuduj_odciski_katalogu(root, katalog, f, h)
            self.assertEqual(pobrane, [4])

    def test_odpowiedz_modelu_jest_walidowana(self):
        self.assertEqual(ad.sprawdz({"category": "dodatek", "product": "iris", "confidence": 250})["confidence"], 100)
        with self.assertRaises(ValueError):
            ad.sprawdz({"category": "co-innego"})
        self.assertEqual(ad.json_z_tekstu('Oto: {"category": "pomin"} koniec')["category"], "pomin")

    def test_claude_p_komenda_tylko_czytanie(self):
        cmd = ad.ClaudeP("haiku", "claude-haiku").komenda("PYTANIE", ["/a/x.jpg", "/b/y.jpg"])
        self.assertEqual(cmd[cmd.index("--allowedTools") + 1], "Read")
        self.assertEqual(cmd[cmd.index("--model") + 1], "haiku")
        self.assertIn("/a/x.jpg", cmd[-1])


if __name__ == "__main__":
    unittest.main()
