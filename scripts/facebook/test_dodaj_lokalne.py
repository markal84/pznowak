"""Testy dodaj_lokalne.py: python3 -m unittest scripts/facebook/test_dodaj_lokalne.py"""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
import dodaj_lokalne as dl  # noqa: E402
import manual_media as mm  # noqa: E402
import refresh_posts  # noqa: E402


def touch(p):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(b"x")


class DodajLokalneTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        t = Path(self.tmp.name)
        self.root = t / "fb"
        (self.root / "media").mkdir(parents=True)
        (self.root / "posts.json").write_text("{}")
        self.src = t / "Nowe pierścionki"
        touch(self.src / "Soliter" / "IMG_1.JPG")
        touch(self.src / "Soliter" / "IMG_2.jpeg")
        touch(self.src / "Tanzanit" / "IMG_3.JPG")
        touch(self.src / "Tanzanit" / ".DS_Store")
        touch(self.src / "luzem.JPG")

    def tearDown(self):
        self.tmp.cleanup()

    def run_main(self, *extra):
        argv = ["dodaj_lokalne.py", str(self.src), "--dir", str(self.root), "--bez-podpowiedzi", *extra]
        with mock.patch.object(sys, "argv", argv), mock.patch.object(refresh_posts, "build", return_value=True) as b:
            dl.main()
        return b

    def test_subfolders_become_fresh_cards(self):
        b = self.run_main()
        b.assert_called_once()
        cards = mm.load_manual(self.root)
        self.assertEqual([c["id"] for c in cards], ["mac-nowe-pierscionki-soliter", "mac-nowe-pierscionki-tanzanit"])
        self.assertTrue(all(c["fresh"] and c["local"] and not c["post_id"] for c in cards))
        self.assertEqual([n for _, n in cards[0]["files"]],
                         ["manual-mac-nowe-pierscionki-soliter_img-1.jpg", "manual-mac-nowe-pierscionki-soliter_img-2.jpg"])
        self.assertTrue((self.src / "Soliter" / "IMG_1.JPG").exists())  # oryginał zostaje

    def test_repeat_skips_known(self):
        self.run_main()
        b = self.run_main()
        b.assert_not_called()
        self.assertEqual(len(list((self.root / "manual").glob("*/manual.json"))), 1)

    def test_dry_run_writes_nothing(self):
        b = self.run_main("--na-sucho")
        b.assert_not_called()
        self.assertFalse((self.root / "manual").exists())

    def test_flat_folder_is_one_ring(self):
        flat = Path(self.tmp.name) / "jeden"
        touch(flat / "a.JPG")
        found, loose = dl.rings(flat)
        self.assertEqual([(n, len(f)) for n, f in found], [("jeden", 1)])
        self.assertEqual(loose, [])


if __name__ == "__main__":
    unittest.main()
