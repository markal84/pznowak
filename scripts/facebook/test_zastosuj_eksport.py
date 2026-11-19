"""Testy łańcucha „Zastosuj eksport” (zastosuj_eksport.py) na atrapie npm: kolejność, pomijanie, błąd, ponowienie.

python3 -m unittest scripts/facebook/test_zastosuj_eksport.py
"""
import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import zastosuj_eksport as z  # noqa: E402

FAKE_NPM = """#!/bin/sh
echo "$* | $PZNOWAK_ZAPIS_Z_TABLICY" >> "$CALLS"
case "$*" in *"$FAIL_ON"*) [ -n "$FAIL_ON" ] && { echo "! zapis nie przeszedł"; exit 1; } ;; esac
echo "ok"
"""


class Chain(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        t = Path(self.tmp.name)
        self.root = t / "data"
        self.root.mkdir()
        (t / "bin").mkdir()
        npm = t / "bin" / "npm"
        npm.write_text(FAKE_NPM)
        npm.chmod(npm.stat().st_mode | stat.S_IEXEC)
        self.calls = t / "calls.log"
        self.env = mock.patch.dict(os.environ, {"PATH": f"{t / 'bin'}:{os.environ['PATH']}", "CALLS": str(self.calls), "FAIL_ON": ""})
        self.env.start()
        self.export({"catalogRings": 2, "galleryAdditions": 0, "toExisting": 1})

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def export(self, summary):
        (self.root / "catalog-selection.json").write_text(json.dumps({"summary": summary, "catalog": []}))

    def lines(self):
        return self.calls.read_text().splitlines() if self.calls.exists() else []

    def test_kolejnosc_pomijanie_i_potwierdzenie(self):
        self.assertTrue(z.status(self.root)["pending"])
        res = z.run_chain(self.root, log=lambda m: None)
        self.assertTrue(res["ok"])
        calls = self.lines()
        self.assertEqual([c.split(" | ")[0] for c in calls], [
            "run --silent import:fb -- --apply",
            "run --silent fb:do-istniejacych -- --apply",
            "run --silent opisz:szkice -- --model --apply",
            "run --silent katalog:snapshot",
        ])
        self.assertTrue(all(c.endswith("| 1") for c in calls), "każdy krok dostaje PZNOWAK_ZAPIS_Z_TABLICY=1")
        st = z.status(self.root)
        self.assertEqual(st["state"], "done")
        self.assertFalse(st["pending"], "ten sam eksport nie czeka drugi raz")
        self.assertEqual([s["status"] for s in st["steps"]], ["done", "skipped", "done", "done", "done"])
        self.export({"catalogRings": 3})
        self.assertTrue(z.status(self.root)["pending"], "nowy eksport znowu czeka")

    def test_blad_zatrzymuje_lancuch_a_ponowienie_dziala(self):
        os.environ["FAIL_ON"] = "fb:do-istniejacych"
        res = z.run_chain(self.root, log=lambda m: None)
        self.assertFalse(res["ok"])
        st = z.status(self.root)
        self.assertEqual(st["state"], "error")
        self.assertTrue(st["pending"])
        self.assertEqual([s["status"] for s in st["steps"]][:4], ["done", "skipped", "error", "waiting"])
        self.assertIn("zapis nie przeszedł", st["steps"][2]["tail"])
        self.assertFalse(any("opisz:szkice" in c for c in self.lines()), "po błędzie model nie rusza")
        os.environ["FAIL_ON"] = ""
        self.assertTrue(z.run_chain(self.root, log=lambda m: None)["ok"])
        self.assertFalse(z.status(self.root)["pending"])

    def test_blad_katalogu_nie_psuje_przebiegu(self):
        os.environ["FAIL_ON"] = "katalog:snapshot"
        self.assertTrue(z.run_chain(self.root, log=lambda m: None)["ok"])
        self.assertEqual(z.status(self.root)["steps"][-1]["status"], "error")

    def test_na_sucho_bez_apply_i_bez_oznaczenia(self):
        self.assertTrue(z.run_chain(self.root, dry=True, log=lambda m: None)["ok"])
        self.assertFalse(any("--apply" in c for c in self.lines()))
        self.assertTrue(z.status(self.root)["pending"], "przebieg na sucho nie odhacza eksportu")

    def test_przerwany_przebieg(self):
        z.write_state(self.root, {"state": "running", "steps": []})
        st = z.status(self.root)
        self.assertEqual(st["state"], "error")
        self.assertIn("przerwany", st["error"])


class Key(unittest.TestCase):
    def test_zapis_klucza_600_tylko_po_sprawdzeniu(self):
        with tempfile.TemporaryDirectory() as t:
            path = Path(t) / "cfg" / "automat.key"
            with mock.patch.object(z, "KEY_FILE", path), mock.patch.dict(os.environ, {"PZNOWAK_AUTOMAT_KEY": ""}):
                self.assertFalse(z.save_key("za krótki")[0])
                self.assertFalse(path.exists())
                with mock.patch.object(z, "check_key", return_value=(False, "strona nie rozpoznała tego klucza")):
                    ok, msg = z.save_key("a" * 36)
                    self.assertFalse(ok)
                    self.assertIn("nie zapisałam", msg)
                    self.assertFalse(path.exists())
                with mock.patch.object(z, "check_key", return_value=(True, "klucz działa")):
                    self.assertTrue(z.save_key("  " + "b" * 36 + "\n")[0])
                self.assertEqual(path.read_text().strip(), "b" * 36)
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
                self.assertEqual(z.read_key(), "b" * 36)

    def test_brak_klucza_w_preflight(self):
        with tempfile.TemporaryDirectory() as t, mock.patch.object(z, "KEY_FILE", Path(t) / "brak.key"), \
                mock.patch.dict(os.environ, {"PZNOWAK_AUTOMAT_KEY": ""}):
            (Path(t) / "catalog-selection.json").write_text("{}")
            self.assertTrue(any("klucza konta Automat" in m for m in z.preflight(t)))


if __name__ == "__main__":
    unittest.main()
