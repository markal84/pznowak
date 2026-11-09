# Kolejka zleceń pznowak-cms

Aktualizują: koordynator (statusy), Klaudia (nowe zlecenia, odpowiedzi, przeglądy), Marcin (decyzje).
Odchudzona przez Klaudię 31.10.2026. Pełna historia do 31.10 (zamknięte zlecenia, pytania, odpowiedzi):
`archiwum/KOLEJKA-archiwum_do-2026-10-31.md`. Zamknięte zlecenia, raporty i zrzuty: `archiwum/`.

**Limit:** ten plik ma mieć najwyżej ~10 KB. Gdy urośnie, wpisy „scalone” i zamknięte pytania przenosimy do
`archiwum/KOLEJKA-archiwum_*.md`. Żaden plik `.md` w `docs/zlecenia` nie przekracza 500 KB.

Od 31.10: Marcin uruchamia zlecenia sam, pojedynczo; domyślnie Sonnet 5.5 medium (high przy trudniejszych).
Od 01.11: zlecenia i ta kolejka są w gicie – można je robić w chmurze („zrób zlecenie R”); zasady: `_ZASADY-GIT.md` → „Sesja w chmurze”.

Statusy: `gotowe do startu` · `w toku` · `czeka na Marcina` · `do przeglądu Klaudii` · `do merge` · `scalone` · `wstrzymane`

## Aktywne

| # | Zlecenie | Plik | Gałąź / PR | Status | Co dalej |
|---|---|---|---|---|---|
| Y.2 | Wizualizacje tylko w wycinku kamienia (biały diament) + podpis „Film: oryginał (…)” przy wariancie | `2026-11-05_zlecenie-Y2_bialy-diament-maska-i-film.md` | gałąź od `main` | gotowe do startu | Opus 5.5 high + Codex, lokalnie |
| AA | Warianty, partia 1: Maia, Delos, Pelagia, Athena, Aria, Ianthe, Erythea, Merope × 4 kolory, 2 obrazy na kolor | `2026-11-05_zlecenie-AA_warianty-partia-1.md` | `feat/aa-partia-1` / PR #71 | do przeglądu Klaudii, PR #71 (zrobione: Maia, Pelagia, Athena; Delos brak; Aria, Ianthe, Erythea, Merope jeszcze nie) | Sonnet 5.5 high + Codex, lokalnie; partia 2 (15 fasonów) po ocenie AA |
| AB | Jeden fason: Urania + Pyrrha + Nyx (prawdziwe zdjęcia jako warianty, przekierowania 308) | `2026-11-05_zlecenie-AB_polaczenie-urania-pyrrha-nyx.md` | `feat/ab-urania` / PR #49 | do przeglądu Klaudii (PR #49) | po scaleniu: `npx payload migrate` (migracja `20261105_110548_ab_film_wariantu`, kolumna filmu wariantu) + wdrożyć kod + `npm run staging:polaczenie -- --apply` w `cms`; filmy Pyrrhy i Nyx przechodzą na warianty (Marcin 05.11) |
| AD | Jeden fason: Harmonia + Eirene + Leto (turmalin Eirene jako wariant, Leto tylko archiwum, przekierowania 308) | lista PZ Nowak, sekcja 5, pkt 1 | `claude/project-thread-c7l3f1` | do przeglądu Klaudii | po scaleniu: wdrożyć kod + `npm run staging:harmonia -- --apply` w `cms`; potem `npm run staging:opisy-ac` (opis Harmonii) |
| AC2 | Thalassa jako zielony wariant Aiona (prawdziwe zdjęcia zamiast wizualizacji, przekierowanie 308) | bez osobnego pliku zlecenia (lista PZ Nowak 5.2) | `claude/project-thread-iipbjl` | do przeglądu | po scaleniu: wdrożyć kod + `npm run staging:thalassa -- --apply` w `cms` (Marcin 07.11: tylko staging) |
| H-D1 | Sync przez Meta Graph API | `2026-10-26_zlecenie-H_proces-katalogu-z-fb-ig.md` (etap D) | – | wstrzymane | brak dostępu w Meta Business Suite |
| H-D2 | Eksport przyrostowy (dalszy ciąg) | jw., etap D | – | czeka na zlecenie Klaudii | ustalenia niżej („Na D2”) |
| H-E | Zakładka „Proces” + panel pod człowieka | jw., etap E + `2026-10-26_NOTATKA_panel-katalogu-dla-czlowieka.md` | – | wstrzymane | czeka na zlecenie Klaudii |

Ostatnio scalone (02–05.11, pliki zleceń w `archiwum/`, staging wgrany): #46 Y cała galeria w kolorze kamienia · #48 Z kółka bez dubli (**staging: Marcin – `npx payload migrate` + `npm run staging:warianty -- --apply` w `cms`**) · #34 R realizacje · #36 S nazwy nowych pierścionków · #37 T film z pracowni · #38 U opisy pierścionków · #40 V warianty kamieni na karcie · #41/#42 W wizualizacje Codex · #43 X formularz kontaktowy (+ X.2: wysyłka kurierem, „tego samego dnia roboczego”) · #44 konta zakłada tylko admin · #45 mapa na telefonie · #47 X.3 przewijanie po wysłaniu.
Wcześniej (31.10): #26 K · #27 L · #28 M · #29 N · #30 O · #31 P · #32 Q – szczegóły w `archiwum/KOLEJKA-archiwum_do-2026-10-31.md`.
Otwarte po K: mystic topaz bez koloru w filtrze.

## Czeka na zlecenie (Klaudia)
- **Partia 2 wariantów (po ocenie AA):** Phoebe, Iris, Ione, Gaia, Asteria, Helios, Chloris, Rhodope, Iole, Eos, Chryse, Amphitrite, Calypso, Electra, Dione. Doszły (Kamila 05.11): **Celaeno** – kolorowe drobne kamienie w „żyłkach” liścia (wzory kolorów od Kamili: `docs/od-kamili/2026-11-05/kama-wizualizacje/celaeno-wzor-*.png`, tylko jako wzór, nie na stronę; najpierw 1 kolor na próbę – trudne, dużo drobnych kamieni); **Adamas** – kamień środkowy; prawdziwe zdjęcie z szafirem naturalnym z FB (18.11.2024, `adamas-szafir-naturalny-fb-2024-11-18.png` to zrzut – oryginał z eksportu FB) jako wariant „zdjęcie”, reszta kolorów jako wizualizacje. Bez wariantów: Rhea (agat – inny szlif). 
- **Zasady wariantów:** propozycja Klaudii 05.11 – 2 zdjęcia na kolor (główne + boczne),
  tylko fasony z co najmniej 2 prawdziwymi zdjęciami (bez klatek z filmu); Michał wybiera 8–10 najczęściej pytanych. Biały diament:
  generować tylko wycinek z kamieniem (maska), reszta zdjęcia nietknięta.
- **Kreator – karta „Projekt wysłany”** ma ten sam problem z przewijaniem co formularz przed X.3 (kreator schowany, nie pilne).
- **`payload-types.ts` – dryf** (`prefix`, `_objectKey` w Media wracają przy generowaniu): ustalić, skąd starsza konfiguracja.
- **Zdjęcia na dłoni (Kamila 01.11):** z FB wyciągnąć zdjęcia pierścionków na dłoni Kamili i dołączyć do galerii fasonu
  przy kolorze oryginału (najlepiej jako 2. zdjęcie). Po V.
- **Godziny otwarcia z Payload:** pole `site-content.openingHours` nie jest podłączone (godziny w `SITE.hours`, zmienione 01.11
  na prośbę Michała). Zmienić pole na listę dni/godzin i czytać na stronie + w danych dla Google.
- Galeria kilku filmów na karcie pierścionka (dziś CMS przyjmuje 1 film; dodatkowe czekają w `source.facebookPayload`).
- Szczegóły wyglądu strony, sekcja po sekcji – hero na telefonie = zlecenie M; dalej kolejne sekcje (uwagi: `2026-10-25_uwagi-po-F.md`, fundament: `2026-10-25_design-fundament.md`;
  na telefonie zdjęcie hero pod linią przewijania).
- `ContactMap` także na stronie „Pracownia” (dziś placeholder).
- Polityka prywatności i regulamin – szkic Klaudii z obecnej pznowak.pl + tabela z raportu J (`archiwum/2026-10-26_zlecenie-J-raport.md`).
- Korekty treści od Michała (30.10): stary numer 41 378 84 34 nie działa – wszędzie 501 321 347; bez wzmianek o zegarkach;
  naprawy biżuterii zostają jako usługa lokalna; nazwa „Pracownia Złotnicza Michał Nowak”.

- **Uproszczenie przeglądu pierścionków (Marcin 31.10, nie teraz – później):** idea przeglądu OK, ale liczba decyzji
  (połącz karty, „to nie ten”, katalog/materiał, AI, warianty) przytłacza. Cel: jedna karta = jedno pytanie do Marcina,
  domyślne odpowiedzi proponowane przez skrypt, Marcin tylko potwierdza albo poprawia.

## Na D2 (ustalenia z przeglądów, szczegóły w archiwum kolejki)
- Kolejkę kroku 2 budować tylko z postów z datą ≥ SINCE (stare posty bez daty dawały zły film).
- `merge_export.py`: dla `hd`/`dash` nowszy wpis wygrywa (adresy CDN wygasają); `.bak` z datą w nazwie.
- Karty „Nowe z eksportu DD.MM” (data eksportu; data najstarszego posta w podpowiedzi): obsługa w `export_selection.py`
  i `similarity.py`, sekcja na stałe w `review_template.html`.
- Krok 2 (reel/photo/album) automatem przez Claude in Chrome pod nadzorem Marcina, bez własnego rozszerzenia.
- Limit Astry: zostały 3 wywołania (4/7); każde „same” idzie do Astry – po pierwszym eksporcie decyzja Marcina o limicie.
- Para 2↔D1 = karta mieszana (pierścionek + sygnet z awenturynem) – odłożone przez Marcina.

## Przed startem produkcji (Marcin, przed 21.11 – wygasa home.pl)
- Zlecenie AB: `npx payload migrate` na produkcji (migracja `20261105_110548_ab_film_wariantu`, jedna kolumna `video_id` w wariantach) przed wdrożeniem kodu.
- Zlecenie Y: `npx payload migrate` (migracja `20261104_231900_warianty_cala_galeria`) przed wdrożeniem kodu Y; zlecenie Z – jego migracja wartości kółek.
- Formularz (X): `SITE_ENV=production` (także przy `next build`), `SITE_URL=https://pznowak.pl`, `SMTP_*` + `SUBMISSIONS_NOTIFY_TO` (skrzynka na MyDevil), `CLIENT_IP_HEADER` wg Cloudflare – szczegóły w opisie PR #43.
- Realizacje (R): dane na produkcję – tym samym seedem z flagą dla produkcji albo ręcznie w panelu; decyzja Marcina.
- Zlecenie R: `npx payload migrate` na produkcji (migracja `20261101_101210_realizacje`, tylko nowe tabele „Realizacje”) przed wdrożeniem kodu; potem Michał dodaje realizacje w panelu (na produkcji do czasu dodania strona pokazuje krótki pusty stan, seed jest tylko na staging).
- Zlecenie V: `npx payload migrate` na produkcji (migracja `20261102_100513_warianty_kamieni`, tylko nowe tabele wariantów) przed wdrożeniem kodu – bez niej karty pierścionków nie działają; warianty Aion i poprawki Leto/Aion są na razie tylko na stagingu (`staging:warianty`).
- `npx payload migrate` na produkcji (migracje z I i H-C) – przed wdrożeniem kodu. Szczegóły: `archiwum/2026-10-26_zlecenie-I-raport.md`.
- Kod K + dane razem (22 adresy, przekierowania 308) – `archiwum/2026-10-28_zlecenie-K-raport.md`.
- Polityka prywatności + regulamin podpięte (stopka, pasek cookies, `consent.ts`).
- Michał/Kamila: żółte pola – patrz „Od Michała / Kamili” (godziny już są: 01.11).
- Hosting MyDevil, skrzynki, SEO/przekierowania/mapa strony, rekord TXT Google – `pznowak-marketing/home-pl-inwentaryzacja.md`.

## Od Michała / Kamili (otwarte)
- **Próbka Y (05.11):** ocena kolorów na całej galerii + propozycja „2 zdjęcia na kolor” i dopisek na stronie, że wizualizacja pokazuje kolor, a prawdziwy kamień pokazują przed zamówieniem.
- **Żółte pola (pytania wysłane 04.11):** ceny „od” i widełki na zamówienie; czas wykonania (na zamówienie, obrączki); bezpłatna pierwsza rozmowa / zaliczka; rozmowy wideo; skąd kamienie, certyfikaty, laboratoryjne; asortyment poza pierścionkami.
- Prawdziwe zdjęcie Aion (dziś tylko klatka z filmu).
- Czy pracownia robi skup złota – od tego zależy domknięcie odwołania kategorii w Google (bez wysokiego priorytetu).
- Zatwierdzenie i redakcja 11 szkiców z FB (po przeglądzie Marcina).
- Plan opinii Google (odpowiedzi szkicuje Klaudia, publikuje Marcin, stopniowo).

Rozstrzygnięte 04.11: wysyłka gotowej biżuterii kurierem – tak; „Odpowiadamy zwykle tego samego dnia roboczego”; szafir granatowy OK; szmaragd spokojniejszy.
## Sprzątanie (Marcin)
- Worktree po scalonych PR: `pznowak-cms-formularz-przewiniecie` (#47); po scaleniu #46 – `pznowak-cms-warianty-cala-galeria`.
- Zdalne gałęzie scalonych PR na GitHubie: `chore/fb-export-skrypt`, `chore/fb-groups-json`, `chore/fb-przeglad-katalogu`,
  `feat/cookies-baner`, `feat/fb-import-cms`, `feat/fb-weryfikacja-modelem`, `feat/fb-wybor-zdjec`, `feat/strona-glowna`,
  `fix/fb-pola-prywatne`, `fix/legacy-payload-prywatne`, `feat/pierscionki-lista-i-karta`.
- Worktree `pznowak-cms-k-pierscionki` (#26 scalony; git oznacza go jako „prunable”) – do usunięcia.
- Gałąź `chore/gitignore-fb-export` / PR #25 – sprawdzić, czy scalony.
- `.git/stale-*` – pozostałości po blokadach gita, do skasowania.
- 31.10: raporty C, D, F, I były śledzone w gicie i zostały przeniesione do `archiwum/` – w `git status` widać je jako
  usunięte; przy najbliższym commicie porządkowym zatwierdzić.

## Pytania do Klaudii
_(koordynator dopisuje tu; brak otwartych na 31.10)_

## Odpowiedzi Klaudii
_(przeglądy z 31.10 przeniesione do `archiwum/KOLEJKA-archiwum_do-2026-10-31.md`; przeglądy od 02.11 – w opisach PR i w wierszach tabeli)_
