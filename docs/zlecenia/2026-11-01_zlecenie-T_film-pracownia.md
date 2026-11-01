# Zlecenie T – /pracownia: film z pracowni z napisami etapów

Data: 01.11.2026 · Zleca: Marcin (spisała Klaudia) · Model: Sonnet 5.5 medium.
Jedna sesja, bez subagentów. W chmurze: `_ZASADY-GIT.md` → „Sesja w chmurze”. Gałąź od `origin/main`, potem
`git checkout origin/docs/zlecenie-t -- cms/public/filmy docs/zlecenia` (pliki filmu i to zlecenie są na gałęzi `docs/zlecenie-t`).

## Co jest gotowe (nie montuj filmu od nowa)
- `cms/public/filmy/pracownia.mp4` – 29,7 s, 864×1080 (4:5), H.264, **bez dźwięku**, `faststart`, ~6,8 MB. Zmontowany przez Klaudię
  z filmów Michała z FB (topienie złota → stół → mikroskop → oprawa → sygnet → obrączki → gotowy pierścionek). Początek i koniec
  wyciemnione, więc pętla jest płynna.
- `cms/public/filmy/pracownia-poster.jpg` – kadr okładki.
- `cms/public/filmy/pracownia-etapy.vtt` – **napisy etapów (źródło prawdy)**, 7 wpisów z czasami.

## Co zrobić
1. **/pracownia:** w sekcji „Od Michała” zamień placeholder `video-ph` („[Film z pracowni, 60–90 s…]”) na film:
   `<video autoplay muted loop playsInline preload="metadata" poster=…>`, proporcje 4:5 (bez czarnych pasów, bez przeskoku układu –
   zarezerwuj miejsce `aspect-ratio`). Na telefonie film nad tekstem, na desktopie obok, jak dziś placeholder.
   `prefers-reduced-motion: reduce` → bez autoplay, sam poster + przycisk odtwarzania.
2. **Napisy etapów jako nakładka HTML, nie wypalone w filmie.** Czytaj wpisy z `pracownia-etapy.vtt` (`<track kind="captions" srclang="pl"
   default>` + TextTrack API, `mode="hidden"` i własne wyświetlanie). Wygląd: mała etykieta w lewym dolnym rogu filmu, font i kolory
   z design systemu strony (jak `Tag`/`tag-corner` na kafelkach), łagodne pojawianie się/znikanie (≤ 250 ms), czytelna na jasnym
   i ciemnym kadrze (np. półprzezroczyste tło). `aria-live="polite"` **nie** – napisy zmieniają się co kilka sekund w pętli; zamiast
   tego `aria-label` filmu z krótkim opisem: „Film z pracowni: topienie złota, praca przy stole, oprawa kamieni i gotowy pierścionek”.
   Bez JS: film działa, napisów nie ma (to w porządku).
3. Placeholder „Od Michała” (tekst w nawiasie) zostaje jak jest – to osobny temat. Ramka `DoUzupelnienia` ma obejmować już tylko tekst,
   nie film (film jest gotowy i ma być widoczny także na produkcji).
4. Usuń z kolejki/notatek ewentualną prośbę do Michała o nagranie filmu „60–90 s”, jeśli gdzieś jest (`KOLEJKA.md`, pytania).

## Sprawdzenie
- Zrzuty/opis: 1440×900 i 375×812; widać napis przy 2–3 różnych etapach; brak poziomego przewijania; Lighthouse/CLS bez skoku.
- Test e2e: film ma `muted`, `loop`, `playsinline`, poster; track `.vtt` się ładuje; przy `prefers-reduced-motion` brak autoplay.
- Lint, tsc. Raport w opisie PR, w `KOLEJKA.md` T → „do przeglądu Klaudii”. Bez komend na staging (nic w bazie). Produkcja – stop.
