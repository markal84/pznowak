"""Testy manual_media.py: python3 -m unittest scripts/facebook/test_manual_media.py"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import manual_media as mm  # noqa: E402


def make_root(tmp, cards):
    root = Path(tmp)
    (root / "media").mkdir()
    d = root / "manual" / "2026-10-29_test"
    d.mkdir(parents=True)
    for c in cards:
        for f in c["files"]:
            (d / f).parent.mkdir(exist_ok=True)
            (d / f).write_bytes(b"x")
    (d / "manual.json").write_text(json.dumps({"source": "Test", "date": "2026-10-29", "cards": cards}))
    return root


class ManualTest(unittest.TestCase):
    def test_load_sync_and_extras(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = make_root(tmp, [{"id": "a-1", "post_id": "111", "files": ["x/p.jpg"]}, {"id": "b-2", "title": "B", "files": ["y/q.jpg"]}])
            cards = mm.load_manual(root)
            self.assertEqual(mm.sync_media(root, cards), 2)
            self.assertEqual(mm.sync_media(root, cards), 0)
            self.assertEqual(mm.extras_by_post(cards), {"111": ["manual-a-1_p.jpg"]})
            self.assertEqual([c["id"] for c in mm.standalone_cards(cards)], ["b-2"])
            self.assertTrue((root / "media" / "manual-b-2_q.jpg").exists())
            self.assertTrue(mm.is_manual_post(mm.pseudo_post_id("b-2")))

    def test_rejects_bad_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(AssertionError):
                mm.load_manual(make_root(tmp, [{"id": "Zly_Id", "title": "T", "files": ["p.jpg"]}]))
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(AssertionError):
                mm.load_manual(make_root(tmp, [{"id": "ok", "files": ["p.jpg"]}]))  # bez post_id i title
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(AssertionError):
                mm.load_manual(make_root(tmp, [{"id": "ok", "title": "T", "files": ["p.png"]}]))

    def test_ai_annotation(self):
        data = {"new": [{"posts": [{"post_id": "1"}], "photos": ["1_a.jpg", "1_b.jpg"], "videos": [{"file": "1_v.mp4"}]},
                        {"posts": [{"post_id": "2"}], "photos": ["2_a.jpg"], "videos": []}]}
        flags = [{"post_id": "1", "files": ["1_a.jpg"], "label": "AI"}, {"post_id": "2", "allow": True}, {"post_id": "9"}]
        warns = mm.annotate_ai(data, flags)
        self.assertEqual(list(data["new"][0]["ai"]), ["1_a.jpg"])
        self.assertFalse(data["new"][0]["ai"]["1_a.jpg"]["allow"])
        self.assertTrue(data["new"][1]["ai"]["2_a.jpg"]["allow"])
        self.assertEqual(len(warns), 1)


if __name__ == "__main__":
    unittest.main()
