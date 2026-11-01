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
| R | /realizacje: kolekcja „Realizacje” z historiami zleceń; górne okno podmieniane kliknięciem kafelka (`?r=slug`), 6 historii z FB na start; stara galeria znika ze strony | `2026-11-01_zlecenie-R_realizacje-historie.md` | `claude/eloquent-noether-v7ijrt` / [#34](https://github.com/markal84/pznowak/pull/34) | do przeglądu Klaudii | opis PR; na Macu: `cd cms && npm run staging:realizacje -- --apply` |
| S | Nowe pierścionki z FB: imiona z mitologii (Leucothea, Calypso…) + publikacja na stagingu | `2026-11-01_zlecenie-S_nazwy-nowych-pierscionkow.md` | `feat/nazwy-nowych-pierscionkow` / PR | do przeglądu Klaudii | opis PR; na Macu: `cd cms && npm run staging:nazwy -- --apply` |
| H-D1 | Sync przez Meta Graph API | `2026-10-26_zlecenie-H_proces-katalogu-z-fb-ig.md` (etap D) | – | wstrzymane | brak dostępu w Meta Business Suite |
| H-D2 | Eksport przyrostowy (dalszy ciąg) | jw., etap D | – | czeka na zlecenie Klaudii | ustalenia niżej („Na D2”) |
| H-E | Zakładka „Proces” + panel pod człowieka | jw., etap E + `2026-10-26_NOTATKA_panel-katalogu-dla-czlowieka.md` | – | wstrzymane | czeka na zlecenie Klaudii |

Ostatnio scalone (31.10, pliki w `archiwum/`): #26 K pierścionki · #27 L moissanity i media spoza FB · #28 M hero na telefonie · #29 N cookies na telefonie · #30 O obrączki – zdjęcia · #31 P /na-zamowienie bez „3D” · #32 Q /naprawy – zdjęcia przed/po i mniej tekstu.
Otwarte po K: mystic topaz bez koloru w filtrze.

## Czeka na zlecenie (Klaudia)
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
- Realizacje (R): dane na produkcję – tym samym seedem z flagą dla produkcji albo ręcznie w panelu; decyzja Marcina.
- Zlecenie R: `npx payload migrate` na produkcji (migracja `20261101_101210_realizacje`, tylko nowe tabele „Realizacje”) przed wdrożeniem kodu; potem Michał dodaje realizacje w panelu (na produkcji do czasu dodania strona pokazuje krótki pusty stan, seed jest tylko na staging).
- `npx payload migrate` na produkcji (migracje z I i H-C) – przed wdrożeniem kodu. Szczegóły: `archiwum/2026-10-26_zlecenie-I-raport.md`.
- Kod K + dane razem (22 adresy, przekierowania 308) – `archiwum/2026-10-28_zlecenie-K-raport.md`.
- Polityka prywatności + regulamin podpięte (stopka, pasek cookies, `consent.ts`).
- Michał/Kamila: treść „[TERMIN]”, ceny „od” (Marcin 29.10: przynajmniej „cena od …”), asortyment sklepu, godziny, opinie z Google.
- Hosting MyDevil, skrzynki, SEO/przekierowania/mapa strony, rekord TXT Google – `pznowak-marketing/home-pl-inwentaryzacja.md`.

## Od Michała / Kamili (otwarte)
- Zatwierdzenie i redakcja 11 szkiców z FB (po przeglądzie Marcina).
- Ceny „od”, godziny, plan opinii Google – rozmowa Marcina z Michałem 01.11.

## Sprzątanie (Marcin)
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
- **31.10, przegląd Q (PR #32): OK do merge.** Podgląd gałęzi 1440×900: hero z przed/po rubinu w pełnych proporcjach,
  przycisk „Zapytaj o naprawę”, sekcja „Przed i po” po liście usług, /realizacje bez sekcji, główna bez „model 3D”.
  Tekst −40% (217→130 słów) – zgoda, dalej szłyby fakty. Zmiany ponad zlecenie (przycisk w hero, usunięta etykieta
  zasłaniająca „po”, godziny tylko w hero) – akceptuję. Otwarte: zestaw zdjęć nierówny (brylanty i powiększanie to nie
  „przed/po”, brak łańcuszków i kolczyków) – zdjęcia od Michała (pytanie 14a na 01.11), potem małe zlecenie.
- **31.10, przegląd P (PR #31): OK do merge.** Commit 16d88bf zmienia tylko `na-zamowienie/page.tsx` + 2 testy.
  Na podglądzie gałęzi (1440×900) sprawdzone: wstęp, krok 2, wynik kroku i odpowiedź FAQ w żółtych ramkach, na stronie
  brak „3D”, został jeden przycisk „Umów rozmowę o projekcie”. `toConfirm` = `DoUzupelnienia` z `fallback` (span w `<p>` –
  poprawny HTML), na produkcji zwykły tekst. Do dorobienia osobno (1 linijka): strona główna, krok „Projekt i wycena”
  – „Szkic i model 3D.” (`page.tsx:187`). Test `placeholders.int.spec.ts` (/obraczki, „Obrączki z pracowni”) pada już
  na main po O – do poprawy przy następnym zleceniu.
- **31.10, przegląd M (PR #28): OK do merge.** Tylko `.hero-home` (klasy `hero-tag`/`hero-trust` są wyłącznie na głównej,
  więc przeniesienie reguł nic nie psuje na podstronach), desktop bez zmian, e2e na 3 rozmiarach telefonu + desktop.
  Zrzut 375×812: zdjęcie, tytuł, przycisk i link na pierwszym ekranie. Pasek cookies – osobna sprawa (niżej).
- **31.10, przegląd L (PR #27): OK do merge.** Media spoza FB i plakietka AI zgodnie ze zleceniem, `selection.json` nietknięty,
  AI blokowane w eksporcie bez `allow: true`. Drobiazgi na później: tylko `.jpg` (zdjęcia HEIC z iPhone'a trzeba
  przekonwertować), walidacja przez `assert` (znika przy `python -O`). Decyzje Marcina 31.10: połączyć 32↔34, 1 ct i 2 ct
  jako dwie karty z odsyłaczem w opisie, ETERNITY poza katalogiem do czasu prawdziwego zdjęcia.
