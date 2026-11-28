#!/usr/bin/env python3
"""Tygodniowy raport Meta (Facebook i Instagram) dla PZ Nowak: jeden mail w poniedziałek rano.

Liczby liczy ten skrypt (bez modelu), tylko z Graph API i tylko dla strony PZ Nowak
(reklamy innych stron z tego samego konta reklamowego są pomijane). Na końcu WNIOSEK:
3–5 zdań, które pisze Claude Sonnet 5.5 (effort high) wyłącznie z gotowych liczb.
Definicje (wynik reklamy, pusty wynik = 0, mapa akcji) są te same co w
pznowak-marketing/analiza-meta/metryki.py, przepisane na czysty Python, bo na Hetznerze nie ma pandas.

Tylko stdlib Pythona 3. Token Meta tylko do odczytu; nigdy nie jest wypisywany, a `paging`
(adresy z tokenem) nie wychodzi poza funkcję pobierającą.

Uruchomienie: raport-meta.py [--na-sucho] [--bez-wniosku] [--tydzien RRRR-MM-DD] [--json]
  --na-sucho     wypisuje mail na ekran, nic nie wysyła
  --bez-wniosku  nie woła modelu (np. przy testach)
  --tydzien      dowolny dzień tygodnia do raportu (domyślnie poprzedni pełny tydzień pn–nd)
  --json         wypisuje policzone dane (to, co dostaje model) i kończy
Konfiguracja: patrz README.md (sekcja „Tygodniowy raport Meta”).
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import shutil
import smtplib
import ssl
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from pathlib import Path
from zoneinfo import ZoneInfo

HOME = Path.home()
CONF_DIR = HOME / ".config/pznowak-raport"
SMTP_CONF = Path(os.environ.get("PZNOWAK_RAPORT_CONF", CONF_DIR / "smtp.env"))
# token Meta: na Hetznerze w katalogu raportu, na Macu tam, gdzie trzyma go analiza-meta
META_TOKEN_PATHS = [Path(p) for p in [os.environ.get("PZNOWAK_META_TOKEN", ""), CONF_DIR / "meta.token",
                                       HOME / ".config/pznowak/meta-analityka.token"] if str(p)]
ANTHROPIC_KEY = Path(os.environ.get("PZNOWAK_ANTHROPIC_KEY", CONF_DIR / "anthropic.key"))
DEFAULT_TO = "kontakt@pznowak.pl"

API = "https://graph.facebook.com/v27.0/"
AD_ACCOUNT = "act_129275718"
PAGE_ID = "518148711375873"  # Michał Nowak Pracownia Złotnicza (to konto reklamowe prowadziło też inne strony)
IG_ID = "17841423096858695"
TZ = ZoneInfo("Europe/Warsaw")
WEEKS = 8

MODEL, EFFORT = "claude-sonnet-5-5", "high"

# --- definicje jak w analiza-meta/metryki.py ------------------------------------------------
MSG = "actions:onsite_conversion.messaging_conversation_started_7d"
API_ACTION_MAP = {
    "link_click": "link_clicks", "landing_page_view": "landing_page_views", "video_view": "video_3s",
    "post_engagement": "post_engagement", "comment": "comments", "post_reaction": "reactions",
    "post": "shares", "onsite_conversion.post_save": "saves",
    "onsite_conversion.messaging_conversation_started_7d": "conversations", "like": "page_likes",
}
RESULT_LABELS = {
    "actions:like": "polubienia strony", "actions:post_engagement": "aktywność posta", "reach": "zasięg (osoby)",
    "total_profile_visits": "wizyty w profilu FB", "profile_visit_view": "wizyty w profilu IG",
    MSG: "rozpoczęte rozmowy", "actions:landing_page_view": "wyświetlenia strony docelowej",
    "actions:link_click": "kliknięcia w link",
}
OPT_GOAL_TO_INDICATOR = {
    "REPLIES": MSG, "CONVERSATIONS": MSG, "POST_ENGAGEMENT": "actions:post_engagement", "REACH": "reach",
    "PAGE_LIKES": "actions:like", "PROFILE_VISIT": "total_profile_visits", "VISIT_INSTAGRAM_PROFILE": "profile_visit_view",
    "LANDING_PAGE_VIEWS": "actions:landing_page_view", "LINK_CLICKS": "actions:link_click",
}
INDICATOR_TO_COLUMN = {MSG: "conversations", "actions:post_engagement": "post_engagement", "actions:like": "page_likes",
                       "actions:landing_page_view": "landing_page_views", "actions:link_click": "link_clicks"}
SUMS = ["spend", "impressions", "clicks_all", "link_clicks", "landing_page_views", "post_engagement", "comments",
        "shares", "conversations"]
# cele, które analiza z 28.11.2026 odradza (tanie liczby bez klientów)
WEAK_OBJECTIVES = {"OUTCOME_ENGAGEMENT", "OUTCOME_AWARENESS", "POST_ENGAGEMENT", "PAGE_LIKES", "REACH",
                   "BRAND_AWARENESS", "VIDEO_VIEWS"}
OBJECTIVE_PL = {"OUTCOME_ENGAGEMENT": "aktywność", "OUTCOME_AWARENESS": "rozpoznawalność", "OUTCOME_TRAFFIC": "ruch",
                "OUTCOME_LEADS": "kontakty", "OUTCOME_SALES": "sprzedaż", "MESSAGES": "wiadomości",
                "LINK_CLICKS": "kliknięcia w link", "POST_ENGAGEMENT": "aktywność posta", "REACH": "zasięg",
                "BRAND_AWARENESS": "rozpoznawalność", "PAGE_LIKES": "polubienia strony", "VIDEO_VIEWS": "wyświetlenia filmu"}
ALL_STATUSES = ["ACTIVE", "PAUSED", "DELETED", "ARCHIVED", "CAMPAIGN_PAUSED", "ADSET_PAUSED", "IN_PROCESS",
                "WITH_ISSUES", "DISAPPROVED", "PENDING_REVIEW", "PREAPPROVED", "PENDING_BILLING_INFO"]

# Kontekst dla modelu. Zmieniaj tutaj, gdy zmieni się plan (stan na 28.11.2026, analiza „Reklamy Meta PZ Nowak”).
KONTEKST = """\
Marka: PZ Nowak, rodzinna pracownia złotnicza z Buska-Zdroju. Promujemy pierścionki z kamieniami szlachetnymi
na zamówienie. Zaręczyny to tylko jedna z okazji (obok prezentu i zakupu dla siebie), nie główny przekaz.
Stan z analizy 28.11.2026: płatna promocja w dotychczasowej formie się nie opłacała (0 rozmów z kampanii na rozmowy,
kliknięcie w link po ok. 4,40 zł). Organika robi ok. 95% wyświetleń. Wąskie gardło to droga post → strona → zapytanie:
od startu pznowak.pl (15.11.2026) posty prawie nie linkowały do strony.
Co liczymy: posty o jednym modelu z linkiem z UTM do karty pierścionka na pznowak.pl, kliknięcia w link,
komentarze, udostępnienia, zapytania (rozmowy) i koszt wyniku reklamy. Polubień nie traktujemy jako miary.
Plan: nie wracać do celów „Aktywność” i „Rozpoznawalność”. Ewentualny test walentynkowy 27.12–10.01 (cel „Ruch”,
link z UTM na kartę modelu, 15 zł dziennie) tylko gdy działa strona /jak-kupic, zeszyt zapytań ze źródłem i linki z UTM.
Instagram traktujemy jako witrynę (te same filmy co na Facebooku), a link w bio powinien prowadzić do karty modelu tygodnia."""

SYSTEM = """Piszesz sekcję WNIOSEK cotygodniowego raportu Meta (Facebook i Instagram) dla właściciela pracowni złotniczej.
Dostajesz wyłącznie gotowe liczby policzone przez skrypt i krótki kontekst strategii. Napisz po polsku od 3 do 5 krótkich zdań (razem najwyżej 90 słów) zwykłym
tekstem: bez nagłówka, list, markdown i emoji. Podawaj tylko kilka najważniejszych liczb. Opieraj się tylko na podanych liczbach; nie wymyślaj danych, przyczyn ani liczb,
których nie ma. Powiedz, co w tym tygodniu było najważniejsze (porównaj z poprzednim tygodniem i trendem 8 tygodni),
co działa, a co nie, i zakończ jednym konkretnym krokiem na najbliższy tydzień. Gdy próba jest za mała, żeby wyciągać
wnioski (np. kilka kliknięć), powiedz to wprost. Pisz rzeczowo i życzliwie, w drugiej osobie („Twoje posty…”)."""


# --- pomocnicze ---------------------------------------------------------------------------------

class Meta:
    """Klient Graph API tylko do odczytu. Tokeny nigdy nie trafiają do wyjścia ani do błędów."""

    def __init__(self, token: str):
        self.secrets = [token]
        self.user_token = token
        self.page_token = None

    def scrub(self, obj):
        if isinstance(obj, dict):
            return {k: self.scrub(v) for k, v in obj.items() if k not in ("paging", "access_token")}
        if isinstance(obj, list):
            return [self.scrub(v) for v in obj]
        if isinstance(obj, str):
            for s in self.secrets:
                obj = obj.replace(s, "***")
        return obj

    def get(self, path, params=None, *, page=False, all_pages=True, max_pages=30):
        q = dict(params or {})
        q["access_token"] = self.page() if page else self.user_token
        url = API + path.lstrip("/") + "?" + urllib.parse.urlencode(q)
        data, first = [], None
        for _ in range(max_pages):
            try:
                with urllib.request.urlopen(url, timeout=60) as r:
                    body = json.loads(r.read().decode())
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors="replace")
                try:
                    msg = json.loads(msg).get("error", {}).get("message", msg)
                except Exception:  # noqa: BLE001
                    pass
                raise RuntimeError(f"Graph API {e.code} ({path.split('?')[0]}): {self.scrub(str(msg))[:200]}") from None
            except urllib.error.URLError as e:
                raise RuntimeError(f"Graph API niedostępne ({path.split('?')[0]}): {self.scrub(str(e.reason))[:120]}") from None
            first = first or body
            if isinstance(body.get("data"), list):
                data.extend(body["data"])
            nxt = (body.get("paging") or {}).get("next")
            if not (all_pages and nxt):
                break
            url = nxt
        out = self.scrub(first or {})
        if isinstance(out.get("data"), list):
            out["data"] = self.scrub(data)
        return out

    def page(self):
        """Token strony (potrzebny do statystyk strony i IG), pobierany przy każdym uruchomieniu i trzymany tylko w pamięci."""
        if self.page_token is None:
            url = API + "me/accounts?" + urllib.parse.urlencode({"fields": "id,access_token", "access_token": self.user_token})
            try:
                with urllib.request.urlopen(url, timeout=60) as r:
                    accounts = json.loads(r.read().decode()).get("data") or []
            except Exception as e:  # noqa: BLE001
                raise RuntimeError(f"nie mogę pobrać tokenu strony ({type(e).__name__})") from None
            tok = next((a.get("access_token") for a in accounts if a.get("id") == PAGE_ID), None)
            if not tok:
                raise RuntimeError("token Meta nie ma dostępu do strony PZ Nowak")
            self.page_token = tok
            self.secrets.append(tok)
        return self.page_token


def read_token():
    for p in META_TOKEN_PATHS:
        if p.is_file():
            return p.read_text().strip()
    raise SystemExit("Brak tokenu Meta: " + " albo ".join(str(p) for p in META_TOKEN_PATHS))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def div(a, b):
    return a / b if b else None


def fint(v):
    return "–" if v is None else f"{round(v):,}".replace(",", " ")


def fzl(v):
    return "–" if v is None else f"{v:,.2f}".replace(",", " ").replace(".", ",") + " zł"


def fproc(v):
    return "–" if v is None else f"{v:.2f}".replace(".", ",") + "%"


def zmiana(now, before):
    """„(poprzedni: 1 234, +12%)”: porównanie z poprzednim tygodniem."""
    if before is None:
        return ""
    if not before:
        return f" (poprzedni tydzień: {fint(before)})"
    d = (now - before) / before * 100
    return f" (poprzedni tydzień: {fint(before)}, {'+' if d >= 0 else '−'}{abs(d):.0f}%)"


def weeks_for(day: dt.date):
    """Osiem tygodni pn–nd kończących się tygodniem, w którym jest `day`."""
    monday = day - dt.timedelta(days=day.weekday())
    return [(monday - dt.timedelta(weeks=i), monday - dt.timedelta(weeks=i) + dt.timedelta(days=6))
            for i in range(WEEKS - 1, -1, -1)]


def week_of(day: dt.date, weeks):
    for i, (a, b) in enumerate(weeks):
        if a <= day <= b:
            return i
    return None


def ts(day: dt.date, end=False):
    t = dt.datetime.combine(day + dt.timedelta(days=1) if end else day, dt.time(), TZ)
    return int(t.timestamp())


def local_day(iso: str) -> dt.date:
    return dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(TZ).date()


def wk_label(a, b):
    return f"{a:%d.%m}–{b:%d.%m}"


SITE_RE = re.compile(r"(?:https?://)?(?:www\.)?pznowak\.pl[^\s\"'<>)\]]*", re.I)


def site_links(*texts):
    """Linki do pznowak.pl w treści posta i w załącznikach (rozwija przekierowania l.facebook.com)."""
    found = []
    for t in texts:
        if not t:
            continue
        if "l.facebook.com" in t or "l.instagram.com" in t:
            u = urllib.parse.parse_qs(urllib.parse.urlparse(t).query).get("u")
            if u:
                t = u[0]
        found += SITE_RE.findall(urllib.parse.unquote(t))
    return sorted(set(found))


def link_kind(links):
    utm = any("utm_" in l.lower() for l in links)
    card = any(re.search(r"pznowak\.pl/+pierscionki/+[\w-]+", l, re.I) for l in links)
    return utm, card


# --- pobieranie i liczenie ------------------------------------------------------------------------

def fetch_ads(m: Meta, weeks):
    """Reklamy tylko strony PZ Nowak, w tygodniach pn–nd (time_increment=7 od poniedziałku)."""
    flt = json.dumps([{"field": "effective_status", "operator": "IN", "value": ALL_STATUSES}])
    ads = m.get(f"{AD_ACCOUNT}/ads", {"limit": 200, "filtering": flt,
                                      "fields": "id,campaign_id,creative{actor_id,effective_object_story_id}"})["data"]
    page_ads, page_camps = set(), set()
    for a in ads:
        cr = a.get("creative") or {}
        actor = cr.get("actor_id") or (cr.get("effective_object_story_id") or "").split("_")[0]
        if actor == PAGE_ID:
            page_ads.add(a["id"])
            page_camps.add(a.get("campaign_id"))
    rows = m.get(f"{AD_ACCOUNT}/insights", {
        "level": "ad", "limit": 500, "time_increment": 7,
        "time_range": json.dumps({"since": str(weeks[0][0]), "until": str(weeks[-1][1])}),
        "fields": "ad_id,ad_name,campaign_id,campaign_name,objective,optimization_goal,spend,impressions,clicks,actions,results",
    })["data"]
    per_week = [dict.fromkeys(SUMS, 0.0) | {"results": {}, "campaigns": set()} for _ in weeks]
    for r in rows:
        if r.get("ad_id") not in page_ads:
            continue
        i = week_of(dt.date.fromisoformat(r["date_start"]), weeks)
        if i is None:
            continue
        rec = {"spend": num(r.get("spend")), "impressions": num(r.get("impressions")), "clicks_all": num(r.get("clicks"))}
        for a in r.get("actions") or []:
            col = API_ACTION_MAP.get(a.get("action_type"))
            if col:
                rec[col] = rec.get(col, 0.0) + num(a.get("value"))
        res = (r.get("results") or [{}])[0]
        ind = res.get("indicator") or OPT_GOAL_TO_INDICATOR.get(r.get("optimization_goal"))
        vals = res.get("values") or []
        if vals:
            results = num(vals[0].get("value"))
        else:  # pusty wynik przy znanym celu = 0 (np. kampania na rozmowy bez rozmów)
            results = rec.get(INDICATOR_TO_COLUMN.get(ind), 0.0) if ind else None
        w = per_week[i]
        for k in SUMS:
            w[k] += rec.get(k, 0.0)
        if ind and (rec["spend"] or rec["impressions"]):
            label = RESULT_LABELS.get(ind, ind)
            agg = w["results"].setdefault(label, {"results": 0.0, "spend": 0.0})
            agg["results"] += results or 0.0
            agg["spend"] += rec["spend"]
        if rec["spend"] or rec["impressions"]:
            w["campaigns"].add(r.get("campaign_name") or r.get("campaign_id"))
    for w in per_week:
        w["campaigns"] = sorted(w["campaigns"])
        w["cpc_link"] = div(w["spend"], w["link_clicks"])
        w["ctr_link"] = div(w["link_clicks"] * 100, w["impressions"])
        for agg in w["results"].values():
            agg["cost_per_result"] = div(agg["spend"], agg["results"]) if agg["results"] else None
    # aktywne kampanie tej strony (budżet z zestawów; kwoty w groszach)
    active = []
    only_active = json.dumps([{"field": "effective_status", "operator": "IN", "value": ["ACTIVE"]}])
    camps = m.get(f"{AD_ACCOUNT}/campaigns", {"limit": 200, "filtering": only_active,
                                             "fields": "id,name,objective,effective_status,stop_time,daily_budget"})["data"]
    adsets = m.get(f"{AD_ACCOUNT}/adsets", {"limit": 200, "filtering": only_active,
                                           "fields": "campaign_id,effective_status,daily_budget,end_time"})["data"]
    today = dt.datetime.now(TZ).date()
    for c in camps:
        sets = [s for s in adsets if s.get("campaign_id") == c["id"] and s.get("effective_status") == "ACTIVE"
                and not (s.get("end_time") and local_day(s["end_time"]) < today)]
        if c["id"] not in page_camps or c.get("effective_status") != "ACTIVE" or not sets:
            continue
        if c.get("stop_time") and local_day(c["stop_time"]) < today:
            continue  # kampania z datą końca w przeszłości już nie emituje, choć Meta zostawia jej status ACTIVE
        daily = num(c.get("daily_budget")) + sum(num(s.get("daily_budget")) for s in sets)
        end = c.get("stop_time") or max((s.get("end_time") or "" for s in sets), default="") or None
        active.append({"name": c.get("name"), "objective": c.get("objective"),
                       "objective_pl": OBJECTIVE_PL.get(c.get("objective"), c.get("objective")),
                       "daily_budget_pln": daily / 100 if daily else None,
                       "end": str(local_day(end)) if end else None, "weak_objective": c.get("objective") in WEAK_OBJECTIVES})
    return per_week, active


FB_METRICS = ["page_media_view", "page_post_engagements", "page_views_total", "page_daily_follows_unique",
              "page_follows", "page_messages_new_conversations_unique"]


def fetch_fb(m: Meta, weeks):
    """Statystyki strony (dni wg Meta, jak w Business Suite) i posty z linkami do pznowak.pl."""
    since, until = weeks[0][0], weeks[-1][1] + dt.timedelta(days=1)
    d = m.get(f"{PAGE_ID}/insights", {"metric": ",".join(FB_METRICS), "period": "day",
                                      "since": str(since), "until": str(until)}, page=True)["data"]
    per_week = [{k: 0.0 for k in FB_METRICS} for _ in weeks]
    seen = set()
    for series in d:
        name = series["name"]
        seen.add(name)
        for v in sorted(series.get("values") or [], key=lambda x: x["end_time"]):
            # end_time = koniec doby wg Meta, więc dzień to dzień przed end_time
            day = dt.date.fromisoformat(v["end_time"][:10]) - dt.timedelta(days=1)
            i = week_of(day, weeks)
            if i is None:
                continue
            if name == "page_follows":
                per_week[i][name] = num(v.get("value"))  # stan na koniec tygodnia
            else:
                per_week[i][name] += num(v.get("value"))
    missing = [k for k in FB_METRICS if k not in seen]

    posts = m.get(f"{PAGE_ID}/published_posts", {
        "since": ts(weeks[0][0]), "until": ts(weeks[-1][1], end=True), "limit": 100,
        "fields": "id,created_time,message,permalink_url,attachments{type,url,unshimmed_url},"
                  "insights.metric(post_media_view,post_activity_by_action_type,post_clicks_by_type)",
    }, page=True)["data"]
    out = []
    for p in posts:
        ins = {x["name"]: (x.get("values") or [{}])[0].get("value") for x in (p.get("insights") or {}).get("data", [])}
        act = ins.get("post_activity_by_action_type") or {}
        clicks = ins.get("post_clicks_by_type") or {}
        att = [u for a in (p.get("attachments") or {}).get("data", []) for u in (a.get("unshimmed_url"), a.get("url"))]
        links = site_links(p.get("message"), *att)
        utm, card = link_kind(links)
        out.append({"day": str(local_day(p["created_time"])), "text": (p.get("message") or "").strip(),
                    "permalink": p.get("permalink_url"), "views": num(ins.get("post_media_view")),
                    "comments": num(act.get("comment")), "shares": num(act.get("share")),
                    "link_clicks": num(clicks.get("link clicks")), "site_links": links, "utm": utm, "card": card})
    for i, w in enumerate(per_week):
        wp = [p for p in out if week_of(dt.date.fromisoformat(p["day"]), weeks) == i]
        w["posts"] = len(wp)
        w["posts_with_link"] = sum(1 for p in wp if p["site_links"])
        w["posts_with_utm"] = sum(1 for p in wp if p["utm"])
        w["posts_to_card"] = sum(1 for p in wp if p["card"])
        w["post_comments"] = sum(p["comments"] for p in wp)
        w["post_shares"] = sum(p["shares"] for p in wp)
        w["post_link_clicks"] = sum(p["link_clicks"] for p in wp)
    return per_week, out, missing


IG_METRICS = ["views", "reach", "total_interactions", "profile_views", "website_clicks", "comments", "shares", "saves"]


def fetch_ig(m: Meta, weeks):
    per_week = []
    for a, b in weeks:
        d = m.get(f"{IG_ID}/insights", {"metric": ",".join(IG_METRICS), "period": "day", "metric_type": "total_value",
                                        "since": ts(a), "until": ts(b, end=True)}, page=True, all_pages=False)["data"]
        per_week.append({x["name"]: num((x.get("total_value") or {}).get("value")) for x in d})
    acc = m.get(IG_ID, {"fields": "followers_count"}, page=True)
    media = m.get(f"{IG_ID}/media", {"since": ts(weeks[0][0]), "until": ts(weeks[-1][1], end=True), "limit": 100,
                                     "fields": "id,timestamp,caption,media_product_type,permalink"}, page=True)["data"]
    out = []
    for x in media:
        cap = x.get("caption") or ""
        out.append({"id": x["id"], "day": str(local_day(x["timestamp"])), "text": cap.strip(), "permalink": x.get("permalink"),
                    "type": x.get("media_product_type"), "site_links": site_links(cap),
                    "link_in_bio": bool(re.search(r"link\w*\s+w\s+bio", cap, re.I))})
    for i, w in enumerate(per_week):
        wp = [p for p in out if week_of(dt.date.fromisoformat(p["day"]), weeks) == i]
        w["posts"] = len(wp)
        w["posts_with_link"] = sum(1 for p in wp if p["site_links"] or p["link_in_bio"])
    # statystyki postów tylko z ostatniego tygodnia (do „najlepszego posta”)
    for p in out:
        if week_of(dt.date.fromisoformat(p["day"]), weeks) != len(weeks) - 1:
            continue
        try:
            ins = m.get(f"{p['id']}/insights", {"metric": "views,shares,saved,comments"}, page=True, all_pages=False)["data"]
            for x in ins:
                p[x["name"]] = num((x.get("values") or [{}])[0].get("value"))
        except RuntimeError:
            pass
    return per_week, out, acc.get("followers_count")


# --- raport -----------------------------------------------------------------------------------------

OK, WARN, INFO = "✓", "⚠", "·"


class Report:
    def __init__(self):
        self.sections = []  # (tytuł, [(znak, tekst)])

    def section(self, title):
        self.sections.append((title, []))

    def add(self, mark, text):
        self.sections[-1][1].append((mark, text))

    @property
    def warnings(self):
        return sum(1 for _, rows in self.sections for mk, _ in rows if mk == WARN)


def excerpt(t, n=70):
    t = re.sub(r"\s+", " ", t or "").strip()
    return (t[: n - 1] + "…") if len(t) > n else (t or "(bez opisu)")


def build(weeks, ads, active, fb, fb_posts, fb_missing, ig, ig_posts, followers, errors):
    r = Report()
    a, b = weeks[-1]
    cur, prev = -1, -2

    r.section("Reklamy (tylko strona PZ Nowak)")
    if ads is None:
        r.add(WARN, "nie udało się pobrać danych reklam: " + errors.get("ads", "?"))
    else:
        w, p = ads[cur], ads[prev]
        if w["spend"] or w["impressions"]:
            r.add(INFO, f"wydatek: {fzl(w['spend'])} (poprzedni tydzień: {fzl(p['spend'])}); kampanie: {', '.join(w['campaigns'])}")
            for label, agg in sorted(w["results"].items()):
                bad = label == "rozpoczęte rozmowy" and not agg["results"]
                r.add(WARN if bad else INFO,
                      f"wynik „{label}”: {fint(agg['results'])}, koszt wyniku {fzl(agg['cost_per_result'])} (z {fzl(agg['spend'])})")
            mk = WARN if not w["link_clicks"] else INFO
            r.add(mk, f"kliknięcia w link: {fint(w['link_clicks'])}, koszt kliknięcia {fzl(w['cpc_link'])}, "
                      f"CTR {fproc(w['ctr_link'])}; wyświetlenia strony docelowej: {fint(w['landing_page_views'])}")
            r.add(INFO, f"rozmowy z reklam: {fint(w['conversations'])}; komentarze {fint(w['comments'])}, "
                        f"udostępnienia {fint(w['shares'])}")
        else:
            r.add(OK, f"brak wydatków w tym tygodniu (poprzedni tydzień: {fzl(p['spend'])})")
        for c in active:
            txt = (f"aktywna kampania „{c['name']}”, cel {c['objective_pl']}"
                   + (f", ok. {fzl(c['daily_budget_pln'])}/dzień" if c["daily_budget_pln"] else "")
                   + (f", do {dt.date.fromisoformat(c['end']):%d.%m.%Y}" if c["end"] else ""))
            r.add(WARN if c["weak_objective"] else INFO,
                  txt + (": ten cel daje tanie liczby bez klientów (analiza 28.11)" if c["weak_objective"] else ""))
        spend8 = sum(x["spend"] for x in ads)
        conv8 = sum(x["conversations"] for x in ads)
        r.add(INFO, f"8 tygodni: {fzl(spend8)}, kliknięcia w link {fint(sum(x['link_clicks'] for x in ads))}, rozmowy {fint(conv8)}")

    r.section("Facebook (organika i reklamy razem, jak w Business Suite)")
    if fb is None:
        r.add(WARN, "nie udało się pobrać statystyk strony: " + errors.get("fb", "?"))
    else:
        w, p = fb[cur], fb[prev]
        r.add(INFO, "wyświetlenia: " + fint(w["page_media_view"]) + zmiana(w["page_media_view"], p["page_media_view"]))
        r.add(INFO, "zaangażowanie w posty (Meta wlicza też kliknięcia): " + fint(w["page_post_engagements"])
              + zmiana(w["page_post_engagements"], p["page_post_engagements"]))
        r.add(INFO, f"odwiedziny strony FB: {fint(w['page_views_total'])}; nowi obserwujący: {fint(w['page_daily_follows_unique'])}"
                    + (f" (razem {fint(w['page_follows'])})" if w["page_follows"] else ""))
        r.add(INFO, f"posty: {w['posts']}; komentarze {fint(w['post_comments'])}, udostępnienia {fint(w['post_shares'])}, "
                    f"kliknięcia w link {fint(w['post_link_clicks'])} (liczone do dziś dla postów z tego tygodnia)")
        if w["posts"]:
            ok = w["posts_to_card"] and w["posts_with_utm"]
            r.add(OK if ok else WARN,
                  f"posty z linkiem do pznowak.pl: {w['posts_with_link']} z {w['posts']}; z UTM: {w['posts_with_utm']}; "
                  f"do karty pierścionka: {w['posts_to_card']}")
        else:
            r.add(WARN, "brak postów w tym tygodniu")
        wp = [x for x in fb_posts if week_of(dt.date.fromisoformat(x["day"]), weeks) == len(weeks) - 1]
        if wp:
            t = max(wp, key=lambda x: x["views"])
            r.add(INFO, f"najwięcej wyświetleń: {t['day'][8:10]}.{t['day'][5:7]} „{excerpt(t['text'])}”: {fint(t['views'])} wyśw., "
                        f"{fint(t['comments'])} kom., {fint(t['shares'])} udost.")
        if fb_missing:
            r.add(WARN, "Meta nie zwróciła wskaźników: " + ", ".join(fb_missing))

    r.section("Instagram (statystyki konta z API; Business Suite pokazuje więcej wyświetleń, bo dolicza reklamy)")
    if ig is None:
        r.add(WARN, "nie udało się pobrać statystyk Instagrama: " + errors.get("ig", "?"))
    else:
        w, p = ig[cur], ig[prev]
        r.add(INFO, "wyświetlenia: " + fint(w.get("views")) + zmiana(w.get("views", 0), p.get("views")))
        r.add(INFO, f"konta w zasięgu: {fint(w.get('reach'))}; interakcje: {fint(w.get('total_interactions'))} "
                    f"(komentarze {fint(w.get('comments'))}, udostępnienia {fint(w.get('shares'))}, zapisania {fint(w.get('saves'))})")
        r.add(OK if w.get("website_clicks") else INFO,
              f"kliknięcia w link w bio: {fint(w.get('website_clicks'))}; odwiedziny profilu: {fint(w.get('profile_views'))}"
              + (f"; obserwujący: {fint(followers)}" if followers is not None else ""))
        r.add(INFO, f"posty i rolki: {w['posts']}, z tego z odesłaniem do strony (adres albo „link w bio”): {w['posts_with_link']}")
        wp = [x for x in ig_posts if week_of(dt.date.fromisoformat(x["day"]), weeks) == len(weeks) - 1 and "views" in x]
        if wp:
            t = max(wp, key=lambda x: x.get("views", 0))
            r.add(INFO, f"najwięcej wyświetleń: {t['day'][8:10]}.{t['day'][5:7]} „{excerpt(t['text'])}”: {fint(t.get('views'))} wyśw.")

    r.section("Zapytania")
    conv = None if ads is None else ads[cur]["conversations"]
    msgs = None if fb is None else fb[cur]["page_messages_new_conversations_unique"]
    r.add(INFO, f"rozmowy rozpoczęte z reklam: {fint(conv)}; nowe rozmowy na Messengerze (wszystkie): {fint(msgs)}")
    r.add(INFO, "zeszyt zapytań i wejścia z Umami: raport ich nie czyta, sprawdź ręcznie")
    return r


TREND_COLS = ["Tydzień", "FB wyśw.", "FB zaangaż.", "Posty FB (z linkiem)", "IG wyśw.", "IG klik w bio",
              "Reklamy", "Klik. z rekl.", "Rozmowy"]


def trend_rows(weeks, ads, fb, ig):
    rows = []
    for i, (a, b) in enumerate(weeks):
        f = fb[i] if fb else None
        g = ig[i] if ig else None
        x = ads[i] if ads else None
        conv = (x["conversations"] if x else 0) + (f["page_messages_new_conversations_unique"] if f else 0)
        rows.append([wk_label(a, b),
                     fint(f["page_media_view"]) if f else "–", fint(f["page_post_engagements"]) if f else "–",
                     f"{f['posts']} ({f['posts_with_link']})" if f else "–",
                     fint(g.get("views")) if g else "–", fint(g.get("website_clicks")) if g else "–",
                     fzl(x["spend"]).replace(",00", "") if x else "–", fint(x["link_clicks"]) if x else "–",
                     fint(conv) if (x or f) else "–"])
    return rows


def model_input(weeks, ads, active, fb, fb_posts, ig, ig_posts, followers):
    """To, co dostaje model: same liczby, bez treści maili i bez tokenów."""
    def wk(i):
        a, b = weeks[i]
        d = {"tydzien": f"{a}..{b}"}
        if ads:
            x = ads[i]
            d["reklamy"] = {k: round(x[k], 2) for k in ("spend", "impressions", "link_clicks", "landing_page_views", "conversations",
                                                         "comments", "shares")}
            d["reklamy"]["koszt_klikniecia"] = round(x["cpc_link"], 2) if x["cpc_link"] else None
            d["reklamy"]["wyniki"] = {k: {"liczba": v["results"], "koszt_wyniku": round(v["cost_per_result"], 2) if v["cost_per_result"] else None,
                                          "wydatek": round(v["spend"], 2)} for k, v in x["results"].items()}
        if fb:
            f = fb[i]
            d["facebook"] = {"wyswietlenia_z_reklamami": f["page_media_view"], "zaangazowanie_z_kliknieciami": f["page_post_engagements"],
                             "odwiedziny_strony_fb": f["page_views_total"], "nowi_obserwujacy": f["page_daily_follows_unique"],
                             "posty": f["posts"], "posty_z_linkiem_do_pznowak": f["posts_with_link"], "posty_z_utm": f["posts_with_utm"],
                             "posty_do_karty_pierscionka": f["posts_to_card"], "komentarze_pod_postami": f["post_comments"],
                             "udostepnienia_postow": f["post_shares"], "klikniecia_w_link_w_postach": f["post_link_clicks"],
                             "nowe_rozmowy_messenger": f["page_messages_new_conversations_unique"]}
        if ig:
            d["instagram"] = dict(ig[i]) | {"uwaga": "wyświetlenia z API są niższe niż w Business Suite (tam z reklamami)"}
        return d
    last = len(weeks) - 1
    top_fb = sorted([p for p in fb_posts if week_of(dt.date.fromisoformat(p["day"]), weeks) == last],
                    key=lambda p: -p["views"])[:5] if fb_posts else []
    top_ig = sorted([p for p in ig_posts if week_of(dt.date.fromisoformat(p["day"]), weeks) == last and "views" in p],
                    key=lambda p: -p.get("views", 0))[:3] if ig_posts else []
    return {
        "ten_tydzien": wk(last), "poprzedni_tydzien": wk(last - 1),
        "trend_8_tygodni": [wk(i) for i in range(len(weeks))],
        "aktywne_kampanie": active,
        "posty_fb_tego_tygodnia": [{"dzien": p["day"], "poczatek": excerpt(p["text"], 90), "wyswietlenia": p["views"],
                                     "komentarze": p["comments"], "udostepnienia": p["shares"], "klikniecia_w_link": p["link_clicks"],
                                     "link_do_pznowak": bool(p["site_links"]), "utm": p["utm"], "karta": p["card"]} for p in top_fb],
        "posty_ig_tego_tygodnia": [{"dzien": p["day"], "poczatek": excerpt(p["text"], 90), "wyswietlenia": p.get("views"),
                                     "udostepnienia": p.get("shares"), "zapisania": p.get("saved")} for p in top_ig],
        "obserwujacy_ig": followers,
    }


def wniosek(data):
    """3–5 zdań od Claude Sonnet 5.5 (effort high). Klucz API z pliku; bez klucza `claude -p` (np. na Macu)."""
    prompt = (f"Kontekst strategii:\n{KONTEKST}\n\nLiczby (JSON, kwoty w zł, tydzień = poniedziałek..niedziela):\n"
              + json.dumps(data, ensure_ascii=False))
    if ANTHROPIC_KEY.is_file():
        body = {"model": MODEL, "max_tokens": 16000, "output_config": {"effort": EFFORT}, "fallbacks": "default",
                "system": SYSTEM, "messages": [{"role": "user", "content": prompt}]}
        req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(body).encode(), headers={
            "content-type": "application/json", "x-api-key": ANTHROPIC_KEY.read_text().strip(),
            "anthropic-version": "2026-10-21", "anthropic-beta": "server-side-fallback-2026-07-01"})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                msg = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            err = e.read().decode(errors="replace")
            try:
                err = json.loads(err)["error"]["message"]
            except Exception:  # noqa: BLE001
                pass
            raise RuntimeError(f"Claude API {e.code}: {str(err)[:200]}") from None
        if msg.get("stop_reason") == "refusal":
            raise RuntimeError("model odmówił odpowiedzi")
        text = "\n".join(b.get("text", "") for b in msg.get("content", []) if b.get("type") == "text").strip()
    elif shutil.which("claude"):
        cmd = ["claude", "-p", "--model", MODEL, "--effort", EFFORT, "--output-format", "json", "--tools", "",
               "--strict-mcp-config", "--no-session-persistence", "--system-prompt", SYSTEM]
        with tempfile.TemporaryDirectory(prefix="raport-meta-") as empty:
            r = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=600, cwd=empty)
        if r.returncode != 0:
            raise RuntimeError(f"claude -p (kod {r.returncode}): {(r.stderr or r.stdout).strip()[-200:]}")
        out = json.loads(r.stdout)
        if out.get("is_error"):
            raise RuntimeError(f"claude -p: {str(out.get('result'))[:200]}")
        text = str(out.get("result") or "").strip()
    else:
        raise RuntimeError(f"brak klucza {ANTHROPIC_KEY} i brak polecenia claude")
    if not text:
        raise RuntimeError("model nie zwrócił tekstu")
    return re.sub(r"[*#`]", "", text)


def render_text(r: Report, weeks, trend, conclusion):
    out = []
    for title, rows in r.sections:
        out += ["", title.upper()]
        out += [f" {mk} {t}" for mk, t in rows]
    out += ["", f"TREND {WEEKS} TYGODNI"]
    widths = [max(len(TREND_COLS[i]), *(len(row[i]) for row in trend)) for i in range(len(TREND_COLS))]
    out.append("  ".join(c.ljust(widths[i]) if i == 0 else c.rjust(widths[i]) for i, c in enumerate(TREND_COLS)))
    for row in trend:
        out.append("  ".join(c.ljust(widths[i]) if i == 0 else c.rjust(widths[i]) for i, c in enumerate(row)))
    out += ["", "WNIOSEK", conclusion]
    out += ["", "Dane: Graph API v27.0, tylko strona PZ Nowak i jej Instagram. Dni statystyk strony i Instagrama liczy Meta "
                "(jak Business Suite), posty i reklamy według dnia publikacji/emisji."]
    return "\n".join(out).strip() + "\n"


def render_html(r: Report, weeks, trend, conclusion):
    e = html.escape
    color = {OK: "#2f6b3f", WARN: "#a3352b", INFO: "#8a8780"}
    p = ['<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1d1c1a;max-width:720px">']
    for title, rows in r.sections:
        p.append(f'<h3 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#5f5c55;margin:22px 0 6px">{e(title)}</h3>')
        for mk, t in rows:
            p.append(f'<div style="margin:2px 0"><span style="color:{color[mk]};font-weight:600;display:inline-block;width:1.3em">{mk}</span>{e(t)}</div>')
    p.append(f'<h3 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#5f5c55;margin:22px 0 6px">Trend {WEEKS} tygodni</h3>')
    p.append('<table style="border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums">')
    th = "padding:4px 8px;border-bottom:1px solid #d8d5cf;color:#5f5c55;font-weight:600;"
    p.append("<tr>" + "".join(f'<th style="{th}text-align:{"left" if i == 0 else "right"}">{e(c)}</th>' for i, c in enumerate(TREND_COLS)) + "</tr>")
    for j, row in enumerate(trend):
        bold = "font-weight:600;" if j == len(trend) - 1 else ""
        p.append("<tr>" + "".join(f'<td style="padding:4px 8px;border-bottom:1px solid #eeece8;{bold}text-align:{"left" if i == 0 else "right"};white-space:nowrap">{e(c)}</td>'
                                  for i, c in enumerate(row)) + "</tr>")
    p.append("</table>")
    p.append('<h3 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#5f5c55;margin:22px 0 6px">Wniosek</h3>')
    p.append(f'<div style="border-left:3px solid #8a6a1f;padding:6px 12px;background:#f7f4ec">{e(conclusion)}</div>')
    p.append('<p style="font-size:12px;color:#8a8780;margin-top:22px">Dane: Graph API v27.0, tylko strona PZ Nowak i jej Instagram. '
             "Dni statystyk strony i Instagrama liczy Meta (jak Business Suite), posty i reklamy według dnia publikacji/emisji.</p></div>")
    return "\n".join(p)


def load_env(path):
    env = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def send(subject, text, html_body):
    env = load_env(SMTP_CONF)
    # osobny odbiorca niż raport dzienny (RAPORT_TO), żeby zmiany jednego nie ruszały drugiego
    to = env.get("RAPORT_META_TO") or DEFAULT_TO
    sender = env.get("RAPORT_META_FROM") or formataddr(("Raport Meta", parseaddr(env["SMTP_FROM"])[1]))
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = sender, to, subject
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")
    port = int(env.get("SMTP_PORT", "465"))
    ctx = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(env["SMTP_HOST"], port, context=ctx, timeout=30) as s:
            s.login(env["SMTP_USER"], env["SMTP_PASS"]); s.send_message(msg)
    else:
        with smtplib.SMTP(env["SMTP_HOST"], port, timeout=30) as s:
            s.starttls(context=ctx); s.login(env["SMTP_USER"], env["SMTP_PASS"]); s.send_message(msg)
    return to


def main():
    ap = argparse.ArgumentParser(description="Tygodniowy raport Meta dla PZ Nowak")
    ap.add_argument("--na-sucho", action="store_true")
    ap.add_argument("--bez-wniosku", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--tydzien", type=dt.date.fromisoformat)
    a = ap.parse_args()
    today = dt.datetime.now(TZ).date()
    day = a.tydzien or (today - dt.timedelta(days=today.weekday() + 7))
    weeks = weeks_for(day)
    m = Meta(read_token())

    errors, ads, active, fb, fb_posts, fb_missing, ig, ig_posts, followers = {}, None, [], None, [], [], None, [], None
    try:
        ads, active = fetch_ads(m, weeks)
    except Exception as e:  # noqa: BLE001  jedna sekcja nie może zepsuć reszty raportu
        errors["ads"] = m.scrub(f"{type(e).__name__}: {e}")
    try:
        fb, fb_posts, fb_missing = fetch_fb(m, weeks)
    except Exception as e:  # noqa: BLE001
        errors["fb"] = m.scrub(f"{type(e).__name__}: {e}")
    try:
        ig, ig_posts, followers = fetch_ig(m, weeks)
    except Exception as e:  # noqa: BLE001
        errors["ig"] = m.scrub(f"{type(e).__name__}: {e}")

    data = model_input(weeks, ads, active, fb, fb_posts, ig, ig_posts, followers)
    if a.json:
        print(json.dumps(m.scrub(data), ensure_ascii=False, indent=1, default=str))
        return
    r = build(weeks, ads, active, fb, fb_posts, fb_missing, ig, ig_posts, followers, errors)
    trend = trend_rows(weeks, ads, fb, ig)
    if a.bez_wniosku:
        conclusion = "(pominięty: uruchomienie z --bez-wniosku)"
    elif len(errors) == 3:
        conclusion = "(pominięty: brak danych z Meta)"
    else:
        try:
            conclusion = wniosek(m.scrub(data))
        except Exception as e:  # noqa: BLE001
            conclusion = f"(nie udało się napisać wniosku: {str(e)[:200]})"
            r.sections[-1][1].append((WARN, "wniosek modelu niedostępny w tym tygodniu"))

    wa, wb = weeks[-1]
    subject = (f"{'⚠️' if r.warnings else '📊'} PZ Nowak: Meta, tydzień {wa:%d.%m}–{wb:%d.%m.%Y}"
               + (f" ({r.warnings} × uwaga)" if r.warnings else ""))
    text = render_text(r, weeks, trend, conclusion)
    if a.na_sucho:
        print(subject + "\n\n" + text)
        return
    to = send(subject, text, render_html(r, weeks, trend, conclusion))
    print(f"{dt.datetime.now(dt.timezone.utc):%F %T} UTC: mail wysłany do {to}: {subject}")


if __name__ == "__main__":
    main()
