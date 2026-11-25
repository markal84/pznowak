"""Buduje propozycję katalogu (rings-proposal.json), dane przeglądu (review-data.json) i strony przeglądu z eksportu FB.

Użycie: python3 build_review.py data/facebook
Strony:  review.html     tablica: posty do decyzji, gotowe, w katalogu; przegląd po jednym poście (review_template.html)
         szczegoly.html  dawny widok wszystkich sekcji z decyzjami pojedynczych zdjęć (szczegoly_template.html)
Decyzje (selection.json) obsługuje review_server.py; ten skrypt ich nie dotyka.
Przy okazji odświeża miniatury (make_thumbs.py) i podobieństwa zdjęć (hash_images.mjs, similarity.py).
Propozycje połączeń kart („to ten sam pierścionek”) czyta z data/facebook/merge-proposals.json, jeśli plik jest.
Media spoza FB (data/facebook/manual/*/manual.json) i znaczniki treści AI (ai-flags.json): zob. manual_media.py.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import manual_media  # noqa: E402
import vision_merge  # noqa: E402

PAGES = (("review_template.html", "review.html"), ("szczegoly_template.html", "szczegoly.html"))
EMOJI = re.compile("[←-⯿☀-➿〰〽㊗㊙‍️\U0001f000-\U0001faff\U000e0020-\U000e007f]")


def fresh_title(post, maxlen=70):
    """Tytuł roboczy karty nowego posta: pierwsze zdanie tekstu bez emoji i hasztagów, przycięte do maxlen znaków."""
    t = EMOJI.sub(" ", post["text"] or "")
    t = re.sub(r"(?<!\w)#\w+", " ", t)
    t = re.sub(r"https?://\S+", " ", t)
    t = re.sub(r"[ \t]+", " ", t).strip()
    first = next((ln.strip() for ln in t.splitlines() if ln.strip()), "")
    m = re.match(r"(.+?[.!?…])(\s|$)", first)
    first = (m.group(1) if m else first).strip(" -–—•*:;,.")
    if not first:
        d = (post["date"] or "")[:10]
        return f"Post z {d[8:10]}.{d[5:7]} (bez opisu)"
    if len(first) > maxlen:
        first = first[:maxlen].rsplit(" ", 1)[0].rstrip(" ,;:-–—") + "…"
    return first


def ddmm(date):
    return f"{date[8:10]}.{date[5:7]}"


def slug(title):
    t = title.lower().replace("ł", "l")
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def fb_name(source):
    """„fb:<post>/<plik>” albo „fb:<plik>” (legacySourceUrl zdjęcia z FB) → nazwa pliku w media/; inne źródła → None."""
    source = source or ""
    if not source.startswith("fb:"):
        return None
    return source[3:].rsplit("/", 1)[-1] or None


def catalog_files(x):
    """Karta z katalog.json → {"files": [...], "video": bool, "variants": {kamień małymi: {...}}} (pliki z FB w karcie)."""
    def names(items):
        return sorted({n for n in (fb_name((m or {}).get("source")) for m in items) if n})

    variants = {}
    for v in x.get("variants") or []:
        stone = (v.get("stone") or "").strip()
        if stone:
            variants[unicodedata.normalize("NFC", stone.lower())] = {
                "stone": stone, "vis": bool(v.get("isVisualization")), "video": bool(v.get("hasVideo")),
                "files": names([v.get("image"), *(v.get("moreImages") or [])])}
    media = x.get("media") or []
    return {"files": sorted(set(names(media)) | {f for v in variants.values() for f in v["files"]}),
            "video": any(m.get("video") for m in media), "variants": variants}


def video_height(path):
    """Krótszy bok filmu w pikselach (720 = HD) albo None, gdy ffprobe nie zna pliku. Zły plik nie wywraca budowania."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=60,
        ).stdout.strip().split("\n")[0].strip(",")
        w, h = (int(x) for x in out.split(",")[:2])
        return min(w, h)
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


class Review:
    def __init__(self, root):
        self.root = Path(root)
        # Media spoza FB trafiają do media/ przed wszystkim innym, żeby miniatury i hashe podobieństwa objęły je jak zdjęcia z FB.
        self.manual = manual_media.load_manual(self.root)
        if self.manual:
            print(f"media spoza FB: {len(self.manual)} kart, skopiowano {manual_media.sync_media(self.root, self.manual)} plików do media/")
        self.manual_extra = manual_media.extras_by_post(self.manual)
        export = json.loads((self.root / "posts.json").read_text(encoding="utf-8"))
        self.exported_at = export["exportedAt"][:10]
        self.posts = sorted(export["posts"], key=lambda p: p["time"] or 0)
        self.media = {p.name for p in (self.root / "media").iterdir()}
        # Pliki posta po prefiksie post_id (zamiast przeszukiwać cały media/ dla każdego posta).
        self.by_post = {}
        for name in sorted(self.media):
            self.by_post.setdefault(name.split("_", 1)[0], []).append(name)
        self.video_q = {}

    # ---- pliki ----
    def files_for(self, idx, pick=None):
        p = self.posts[idx]
        own = self.by_post.get(p["post_id"], [])
        photos = [f for f in own if f.endswith(".jpg") and "_thumb" not in f]
        order = {ph["id"]: i for i, ph in enumerate(p["photos"])}
        photos.sort(key=lambda f: order.get(f.split("_")[1].split(".")[0], 99))
        if pick is not None:
            photos = [photos[i] for i in pick if i < len(photos)]
        photos = photos + [f for f in self.manual_extra.get(p["post_id"], []) if f in self.media]
        videos = [f for f in own if f.endswith(".mp4")]
        return photos, videos

    def files_of(self, idxs, split=None):
        photos, videos = [], []
        for i in idxs:
            ph, vi = self.files_for(i, split(i) if split else None)
            photos += ph
            videos += vi
        return photos, videos

    def post_info(self, idx):
        p = self.posts[idx]
        return {"idx": idx, "post_id": p["post_id"], "date": (p["date"] or "")[:10], "text": p["text"]}

    def video_info(self, name):
        stem = name[:-4]
        # Kadr z 25% filmu (frames/), a gdy go nie ma, miniatura z Facebooka zapisana obok filmu (media/<film>_thumb.jpg).
        poster = next((p for p in (f"frames/{stem}_25.jpg", f"media/{stem}_thumb.jpg") if (self.root / p).exists()), None)
        if name not in self.video_q:
            self.video_q[name] = video_height(self.root / "media" / name)
            if self.video_q[name] is None:
                print(f"UWAGA: ffprobe nie odczytał filmu {name} (jakość nieznana)")
        return {"file": name, "q": self.video_q[name], "poster": poster}

    def group(self, key, idxs, photos, videos, title=None):
        g = {"key": key, "posts": [self.post_info(i) for i in idxs], "photos": photos, "videos": [self.video_info(v) for v in videos]}
        if title is not None:
            g["title"] = title
        return g

    # ---- karty ----
    def load_groups(self):
        """Grupowanie postów w karty leży w groups.json (adresowane po post_id, nie po numerze w kolejności).

        Format: {"version":1, "new":[{"title","posts":[post_id,..],"pick":{post_id:[nr zdjęcia,..]}}], "maybe":[..], "existing":[..],
                 "skipped":[post_id,..]}. Pierwszy jednorazowy zapis robi init_groups.py; dalej plik edytuje się ręcznie/skryptem.
        Post, którego nie ma w żadnej karcie ani w "skipped", jest nowy: dostaje własną kartę w sekcji „Nowe od DD.MM”.
        """
        groups = json.loads((self.root / "groups.json").read_text(encoding="utf-8"))
        by_id = {p["post_id"]: i for i, p in enumerate(self.posts)}
        assert len(by_id) == len(self.posts), "zdublowane post_id w posts.json"
        for sec in ("new", "maybe", "existing"):
            for card in groups[sec]:
                for pid in card["posts"]:
                    assert pid in by_id, f"groups.json: post {pid} (karta „{card['title']}”) nie istnieje w posts.json"
        titles = {sec: [c["title"] for c in groups[sec]] for sec in ("maybe", "existing")}
        assert all(len(t) == len(set(t)) for t in titles.values()), "zdublowany tytuł karty w groups.json"
        known = {p for sec in ("new", "maybe", "existing") for c in groups[sec] for p in c["posts"]} | set(groups.get("skipped", []))
        self.fresh = [i for i, p in enumerate(self.posts) if p["post_id"] not in known]
        return groups, by_id

    def proposal(self):
        groups, by_id = self.load_groups()
        prop = {"new": [], "maybe": [], "existing": []}
        for c in groups["new"]:
            idxs = [by_id[p] for p in c["posts"]]
            # Zdjęcia posta przypisane do konkretnej karty (np. post z dwoma ametystami rozdzielony na dwie karty).
            pick = {by_id[pid]: v for pid, v in c.get("pick", {}).items()}
            photos, videos = self.files_of(idxs, pick.get)
            prop["new"].append({"title": c["title"], "posts": [self.post_info(i) for i in idxs], "photos": photos, "videos": videos})
        for c in groups["maybe"]:
            idxs = [by_id[p] for p in c["posts"]]
            photos, videos = self.files_of(idxs)
            prop["maybe"].append({"title": c["title"], "posts": [self.post_info(i) for i in idxs], "photos": photos, "videos": videos})
        for c in groups["existing"]:
            prop["existing"].append({"title": c["title"], "posts": [self.post_info(by_id[p]) for p in c["posts"]]})
        if self.fresh:
            # Nowe od ostatniego grupowania: jedna karta na post, w kolejności chronologicznej.
            prop["fresh"] = []
            for i in self.fresh:
                ph, vi = self.files_for(i)
                prop["fresh"].append({"title": fresh_title(self.posts[i]), "posts": [self.post_info(i)], "photos": ph, "videos": vi})
        used = {p["idx"] for sec in prop.values() for r in sec for p in r["posts"]}
        prop["skipped"] = [self.post_info(i) for i in range(len(self.posts)) if i not in used]
        return prop

    def page_data(self, prop):
        def card_key(r):
            return f"{slug(r['title'])}@{r['posts'][0]['post_id']}"

        def with_key(r):
            return self.group(card_key(r), [p["idx"] for p in r["posts"]], r.get("photos", []), r.get("videos", []), r["title"])

        pd = {"exportedAt": self.exported_at, "nPosts": len(self.posts),
              "new": [with_key(r) for r in prop["new"]], "maybe": [with_key(r) for r in prop["maybe"]], "existing": [], "skipped": []}
        if self.fresh:
            pd["freshSince"] = ddmm(min(self.post_info(i)["date"] for i in self.fresh))
            pd["fresh"] = [with_key(r) for r in prop["fresh"]]

        def manual_card(card):
            g = {"key": f"{slug(card['title'])}@{manual_media.pseudo_post_id(card['id'])}", "title": card["title"],
                 "posts": [manual_media.pseudo_post(card)], "photos": [n for _, n in card["files"]], "videos": [],
                 "manualCard": card["source"]}
            if card["local"]:
                g["localCard"] = True
            return g

        for card in manual_media.standalone_cards(self.manual, fresh=False):
            # Osobna karta ze źródła ręcznego: na końcu „Nowych pierścionków”, więc numery wcześniejszych kart się nie zmieniają.
            pd["new"].append(manual_card(card))
        virtual = manual_media.standalone_cards(self.manual, fresh=True)
        if virtual:
            # Wirtualne posty (zdjęcia z Maca, dodaj_lokalne.py): w „Nowe od…”, jak nowy post z FB.
            pd.setdefault("fresh", []).extend(manual_card(c) for c in virtual)
            if "freshSince" not in pd:
                pd["freshSince"] = ddmm(min(c["date"] for c in virtual))
        for r in prop["existing"]:
            idxs = [p["idx"] for p in r["posts"]]
            photos, videos = self.files_of(idxs)
            pd["existing"].append(self.group(card_key(r), idxs, photos, videos, r["title"]))
        for p in prop["skipped"]:
            ph, vi = self.files_for(p["idx"])
            g = self.group(p["post_id"], [p["idx"]], ph, vi)
            g.update(idx=p["idx"], post_id=p["post_id"], date=p["date"], text=p["text"])
            pd["skipped"].append(g)
        keys = [g["key"] for sec in ("new", "maybe", "existing", "fresh") for g in pd.get(sec, [])]
        assert len(keys) == len(set(keys)), "zdublowane klucze kart"
        return pd

    # ---- podpowiedzi i katalog ----
    def add_similarity(self, pd):
        """Podobieństwo zdjęć (plakietki „na stronie” i „możliwy dubel”). Bez node/sharp strona działa, tylko bez plakietek."""
        legacy = self.root.parent / "legacy"
        try:
            subprocess.run(["node", str(HERE / "hash_images.mjs"), str(legacy), str(self.root)], check=True)
            import similarity

            pd["sim"], report = similarity.compute(self.root, legacy, pd)
            (self.root / "similarity-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
        except (OSError, subprocess.CalledProcessError, KeyError) as e:
            print(f"UWAGA: bez plakietek podobieństwa ({e})")

    def add_proposals(self, pd, card_keys):
        """Propozycje połączeń kart (ręczne, z weryfikacji modelem). Tylko podpowiedź: decyzję zapisuje Marcin przyciskiem."""
        pd["proposals"] = []
        path = self.root / "merge-proposals.json"
        if path.exists():
            for p in json.loads(path.read_text(encoding="utf-8")).get("proposals", []):
                if p.get("a") in card_keys and p.get("b") in card_keys and p["a"] != p["b"]:
                    pd["proposals"].append({k: p.get(k, "") for k in ("a", "b", "source", "reason")})
                else:
                    print(f"UWAGA: pominięto propozycję połączenia z nieznaną kartą: {p.get('a')} ↔ {p.get('b')}")
        # Weryfikacja modelem (etap B, vision/results.json): plakietki i propozycje; osobny moduł.
        vision_merge.add(self.root, pd)

    def add_catalog(self, pd, card_keys):
        """Podpowiedzi Terry (classify/results.json) i karty z katalog.json (zrzut: npm run katalog:snapshot, tylko odczyt).

        catalogProducts  nazwy kart do pola „dodaj do karty…”,
        catalogCards     zdjęcie, kamień, status i warianty każdej karty: przegląd pokazuje pierścionek, a nie samą nazwę,
        inCatalog        {klucz karty: [slugi]} karty katalogu zrobione z tego posta (facebookKey albo źródło zdjęcia),
        hints[k].fromPost uzupełnione o to samo, żeby „już w karcie” zgadzało się ze świeżym katalogiem.
        """
        hints_path = self.root / "classify" / "results.json"
        if hints_path.exists():
            hints = json.loads(hints_path.read_text(encoding="utf-8")).get("cards", {})
            pd["hints"] = {k: v for k, v in hints.items() if k in card_keys and v.get("result")}
        pd["catalogProducts"], pd["catalogCards"], pd["inCatalog"], pd["draftsFromPost"], pd["catalogFiles"] = [], {}, {}, {}, {}
        snap_path = self.root / "katalog.json"
        if not snap_path.exists():
            return
        snap = json.loads(snap_path.read_text(encoding="utf-8"))
        products = [x for x in snap.get("products", []) if not x.get("archived")]
        pd["catalogTakenAt"] = snap.get("takenAt")
        pd["catalogProducts"] = sorted(({"slug": x["slug"], "name": x["name"]} for x in products), key=lambda x: x["name"].lower())
        post_ids = {g["key"]: {p["post_id"] for p in g.get("posts", [])} for sec in ("new", "maybe", "fresh") for g in pd.get(sec, [])}

        def from_post(x, key):
            if x.get("facebookKey") == key:
                return True
            imgs = list(x.get("media") or []) + [m for v in x.get("variants") or [] for m in [v.get("image")] + list(v.get("moreImages") or [])]
            return any(m and not m.get("video") and any(pid in (m.get("source") or "") for pid in post_ids.get(key, ())) for m in imgs)

        for key in post_ids:
            have = sorted(x["slug"] for x in products if from_post(x, key))
            if have:
                pd["inCatalog"][key] = have
        # Szkice zrobione wcześniej z posta (facebookKey), np. gdy post był „nową kartą”, a później dostał decyzję
        # „dodaj do karty…”: eksport ostrzega, a opisy (opisz:szkice) ich nie ruszają.
        pd["draftsFromPost"] = {}
        for x in products:
            if x.get("facebookKey") in post_ids and x.get("status") == "draft":
                pd["draftsFromPost"].setdefault(x["facebookKey"], []).append(
                    {"id": x.get("id"), "slug": x["slug"], "name": x.get("name") or ""})
        # Pliki z FB, które już są w kartach (źródło „fb:…”, nazwa pliku z media/), osobno dla wariantów: eksport po
        # „Zastosuj eksport” wie, co już zrobione, i przenosi post do „Już w katalogu” zamiast trzymać go w „Gotowe”.
        pd["catalogFiles"] = {x["slug"]: catalog_files(x) for x in products}
        for key, h in pd.get("hints", {}).items():
            h["fromPost"] = sorted(set(h.get("fromPost") or []) | set(pd["inCatalog"].get(key, [])))

        def url(m):
            return (m or {}).get("url") if m and not m.get("video") else None

        for x in products:
            photos = [u for u in (url(m) for m in x.get("media") or []) if u]
            pd["catalogCards"][x["slug"]] = {
                "name": x.get("name"), "status": x.get("status"), "stone": x.get("stone") or "", "metal": x.get("metal") or "",
                "lead": x.get("lead") or "", "thumb": photos[0] if photos else None, "photos": photos[:6],
                "variants": [{"stone": v.get("stone"), "vis": bool(v.get("isVisualization")), "thumb": url(v.get("image")),
                              "video": bool(v.get("hasVideo"))} for v in (x.get("variants") or [])],
            }

    def build(self):
        prop = self.proposal()
        (self.root / "rings-proposal.json").write_text(json.dumps(prop, ensure_ascii=False, indent=1))
        pd = self.page_data(prop)
        self.add_similarity(pd)
        card_keys = {g["key"] for sec in ("new", "maybe", "fresh") for g in pd.get(sec, [])}
        self.add_proposals(pd, card_keys)
        self.add_catalog(pd, card_keys)
        manual_media.annotate_manual(pd, self.manual)
        for w in manual_media.annotate_ai(pd, manual_media.load_ai(self.root)):
            print("UWAGA:", w)
        (self.root / "review-data.json").write_text(json.dumps(pd, ensure_ascii=False, indent=1))
        # Miniatury (thumbs/) do szybkiego przeglądu; oryginały w media/ zostają nietknięte.
        subprocess.run([sys.executable, str(HERE / "make_thumbs.py"), str(self.root)], check=False)
        write_pages(self.root, pd)
        print(len(prop["new"]), len(prop["maybe"]), len(prop["existing"]), len(prop["skipped"]),
              *([f"nowe od {pd['freshSince']}: {len(pd['fresh'])}"] if pd.get("fresh") else []))
        return pd


def write_pages(root, pd):
    """Wstawia dane do szablonów. Dane idą do <script type="application/json">, więc „</” i „<!--” są zamaskowane."""
    blob = json.dumps(pd, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--")
    for template, out in PAGES:
        html = (HERE / template).read_text(encoding="utf-8")
        assert html.count("__DATA__") == 1, f"{template}: brak (albo kilka) miejsc na dane __DATA__"
        (Path(root) / out).write_text(html.replace("__DATA__", blob), encoding="utf-8")


if __name__ == "__main__":
    Review(sys.argv[1]).build()
