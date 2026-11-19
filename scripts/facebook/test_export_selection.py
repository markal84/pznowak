"""Testy export_selection.compute() na sztucznych danych (bez plików z data/facebook).

Uruchomienie:  python3 -m unittest scripts/facebook/test_export_selection.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import export_selection  # noqa: E402


def card(key, photos=(), videos=(), title=None):
    pid = key
    return {"key": key, "title": title or f"Post {key}",
            "photos": [f"{pid}_{p}" for p in photos], "videos": [{"file": f"{pid}_{v}"} for v in videos],
            "posts": [{"post_id": pid, "date": "2026-11-01", "text": "tekst"}]}


def data(fresh=(), hints=None, in_catalog=None):
    return {"new": [], "maybe": [], "fresh": list(fresh), "existing": [], "skipped": [],
            "hints": hints or {}, "inCatalog": in_catalog or {},
            "catalogProducts": [{"slug": "hesperia", "name": "Hesperia"}, {"slug": "galatea", "name": "Galatea"}]}


def run(d, cards):
    return export_selection.compute(d, {"rev": 1, "cards": cards}, canon=[])


def hint(category, product="galatea", variant="", from_post=()):
    return {"result": {"category": category, "product": product, "variant": variant, "confidence": 0.9},
            "productName": product.capitalize(), "fromPost": list(from_post)}


class ComputeTest(unittest.TestCase):
    def test_undecided(self):
        out, oc = run(data([card("p1", ["a.jpg"])]), {})
        self.assertEqual(oc["p1"]["kind"], "undecided")
        self.assertEqual(out["summary"]["cardsUndecided"], 1)

    def test_new_ring_with_cover_first(self):
        out, oc = run(data([card("p1", ["a.jpg", "b.jpg"])]), {"p1": {"decision": "catalog", "cover": "p1_b.jpg"}})
        self.assertEqual(oc["p1"], {"kind": "new", "photos": 2, "videos": 0, "name": ""})
        self.assertEqual(out["catalog"][0]["photos"], ["media/p1_b.jpg", "media/p1_a.jpg"])

    def test_legacy_catalog_with_targeted_hint_goes_to_existing(self):
        d = data([card("p1", ["a.jpg"])], hints={"p1": hint("dodatek")})
        out, oc = run(d, {"p1": {"decision": "catalog"}})
        self.assertEqual(oc["p1"]["kind"], "toExisting")
        self.assertEqual(out["toExisting"][0]["product"], "galatea")
        self.assertEqual(out["catalog"], [])

    def test_new_ring_overrides_hint(self):
        d = data([card("p1", ["a.jpg"])], hints={"p1": hint("dodatek")})
        out, oc = run(d, {"p1": {"decision": "catalog", "newRing": True}})
        self.assertEqual(oc["p1"]["kind"], "new")
        self.assertEqual(len(out["catalog"]), 1)
        self.assertEqual(out["toExisting"], [])

    def test_addto_variant_instead_of_visualization(self):
        d = data([card("p1", ["a.jpg"])])
        out, oc = run(d, {"p1": {"decision": "addto", "target": "Galatea", "product": "galatea",
                                 "variant": "Szafir", "action": "zamiast-wizualizacji"}})
        self.assertEqual(oc["p1"]["kind"], "toExisting")
        self.assertEqual(oc["p1"]["action"], "zamiast-wizualizacji")
        self.assertEqual(out["toExisting"][0]["variant"], "Szafir")

    def test_addto_variant_defaults_to_addition(self):
        out, oc = run(data([card("p1", ["a.jpg"])]), {"p1": {"decision": "addto", "target": "Hesperia", "variant": "Turmalin"}})
        self.assertEqual((oc["p1"]["kind"], oc["p1"]["action"], oc["p1"]["product"]), ("toExisting", "dodatek", "hesperia"))

    def test_addto_without_variant_goes_to_gallery(self):
        out, oc = run(data([card("p1", ["a.jpg"])]), {"p1": {"decision": "addto", "target": "Hesperia"}})
        self.assertEqual(oc["p1"]["kind"], "gallery")
        self.assertEqual(out["galleryAdditions"][0]["ring"], "Hesperia")

    def test_addto_unknown_target_is_problem(self):
        _, oc = run(data([card("p1", ["a.jpg"])]), {"p1": {"decision": "addto", "target": "Nieznany", "variant": "X"}})
        self.assertEqual(oc["p1"]["reason"], "unknown-target")
        self.assertTrue(oc["p1"]["warnings"])

    def test_already_in_catalog_without_decision_is_not_undecided(self):
        d = data([card("p1", ["a.jpg"]), card("p2", ["b.jpg"])],
                 hints={"p1": hint("dodatek", from_post=["galatea"])}, in_catalog={"p2": ["hesperia"]})
        out, oc = run(d, {})
        self.assertEqual((oc["p1"]["kind"], oc["p2"]["kind"]), ("already", "already"))
        self.assertEqual(oc["p2"]["productName"], "Hesperia")
        self.assertEqual(out["summary"]["cardsUndecided"], 0)

    def test_merged_card_joins_root(self):
        d = data([card("p1", ["a.jpg"]), card("p2", ["b.jpg"])])
        out, oc = run(d, {"p1": {"decision": "catalog"}, "p2": {"sameAs": "p1"}})
        self.assertEqual(oc["p2"], {"kind": "merged", "root": "p1"})
        self.assertEqual(oc["p1"]["photos"], 2)
        self.assertEqual(out["catalog"][0]["mergedFrom"][0]["key"], "p2")

    def test_same_as_cycle_picks_smallest_key(self):
        d = data([card("p1", ["a.jpg"]), card("p2", ["b.jpg"])])
        _, oc = run(d, {"p1": {"sameAs": "p2", "decision": "catalog"}, "p2": {"sameAs": "p1"}})
        self.assertEqual(oc["p2"]["root"], "p1")

    def test_video_only_new_ring_is_problem(self):
        out, oc = run(data([card("p1", videos=["v.mp4"])]), {"p1": {"decision": "catalog"}})
        self.assertEqual(oc["p1"]["reason"], "video-only")
        self.assertEqual(len(out["videoOnly"]), 1)

    def test_skipped_photo_and_material(self):
        out, oc = run(data([card("p1", ["a.jpg", "b.jpg"]), card("p2", ["c.jpg"])]),
                      {"p1": {"decision": "catalog", "media": {"p1_b.jpg": "skip"}}, "p2": {"decision": "material"}})
        self.assertEqual(oc["p1"]["photos"], 1)
        self.assertEqual(oc["p2"], {"kind": "material", "files": 1})
        self.assertEqual(out["materials"][0]["file"], "media/p2_c.jpg")

    def test_post_title_is_never_the_name(self):
        out, _ = run(data([card("p1", ["a.jpg"], title="Nowość!")]), {"p1": {"decision": "catalog", "name": "Nowość!"}})
        self.assertEqual(out["catalog"][0]["name"], "")


class AfterApplyTest(unittest.TestCase):
    """Po „Zastosuj eksport” kolumny liczą się ze świeżego katalogu (catalogFiles, draftsFromPost z build_review.py)."""

    def d(self, files, drafts=None):
        x = data([card("p1", ["a.jpg"], ["v.mp4"])])
        x["catalogFiles"] = {"hesperia": files}
        x["draftsFromPost"] = drafts or {}
        return x

    ADDTO = {"p1": {"decision": "addto", "target": "Hesperia", "product": "hesperia", "variant": "Turmalin"}}

    def test_wariant_ze_zdjeciami_powstanie(self):
        _, oc = run(self.d({"files": [], "video": True, "variants": {}}), self.ADDTO)
        self.assertEqual(oc["p1"]["kind"], "toExisting")
        self.assertTrue(oc["p1"]["createsVariant"])

    def test_zrobione_przechodzi_do_juz_w_katalogu(self):
        files = {"files": ["p1_a.jpg"], "video": True,
                 "variants": {"turmalin": {"stone": "Turmalin", "vis": False, "video": True, "files": ["p1_a.jpg"]}}}
        out, oc = run(self.d(files), self.ADDTO)
        self.assertEqual(oc["p1"]["kind"], "already")
        self.assertEqual(len(out["toExisting"]), 1, "plik eksportu nadal ma pozycję – import jej nie zdubluje")

    def test_sam_film_bez_wariantu_czeka(self):
        x = data([card("p1", [], ["v.mp4"])])
        x["catalogFiles"] = {"hesperia": {"files": [], "video": True, "variants": {}}}
        _, oc = run(x, self.ADDTO)
        self.assertEqual(oc["p1"]["kind"], "waiting")
        self.assertEqual(oc["p1"]["reason"], "variant-missing")

    def test_zbedny_szkic_z_posta(self):
        drafts = {"p1": [{"id": 60, "slug": "alcyone", "name": "Alcyone"}]}
        out, oc = run(self.d({"files": [], "video": False, "variants": {}}, drafts), self.ADDTO)
        self.assertEqual(oc["p1"]["orphanDrafts"][0]["id"], 60)
        self.assertEqual(out["orphanDrafts"][0]["now"], "Hesperia")
        self.assertTrue(any("Alcyone" in w for w in out["warnings"]))

    def test_szkic_tej_samej_karty_nie_jest_zbedny(self):
        drafts = {"p1": [{"id": 60, "slug": "alcyone", "name": "Alcyone"}]}
        x = data([card("p1", ["a.jpg"])], in_catalog={"p1": ["alcyone"]})
        x["draftsFromPost"] = drafts
        out, oc = run(x, {"p1": {"decision": "catalog"}})
        self.assertEqual(oc["p1"]["kind"], "already")
        self.assertEqual(out["orphanDrafts"], [])


if __name__ == "__main__":
    unittest.main()
