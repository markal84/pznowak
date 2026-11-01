# Zlecenie R – /realizacje: historie prawdziwych zleceń zamiast starej galerii

Data: 01.11.2026 · Zleca: Marcin (spisała Klaudia) · Model: Marcin decyduje (sugestia: Sonnet 5.5 high – nowa kolekcja + interakcja).
**Jedna sesja, praca kolejno, bez subagentów i bez zadań w tle.** Jeden worktree, jeden PR do `main`.
Najpierw `_ZASADY-GIT.md` (w chmurze: sekcja „Sesja w chmurze”) i `2026-10-25_design-fundament.md`.
**Zależność:** Q (PR #32) jest scalone – usunęło z /realizacje sekcję „Przed i po naprawie”. Gałąź zawsze od świeżego `origin/main`.

## Dlaczego
- Dziś /realizacje to stara galeria z WordPressa (kolekcja `gallery-items`: jedno zdjęcie, nazwa, alt). Kod dokleja każdemu
  kafelkowi etykietę „Na zamówienie” i tytuł „Realizacja N” – nikt tego nie sprawdzał. Jeden kafelek to sam kamień.
- Cel strony (Marcin): Michał ma dostawać zapytania o pierścionki. Realizacja = rzecz zrobiona **dla konkretnej osoby**,
  z krótką historią. Pierścionek zrobiony „na półkę” to produkt – jego miejsce jest w katalogu.
- W materiałach z FB są prawdziwe historie zleceń ze zdjęciami (niżej).

## Układ strony (decyzja Marcina)
1. **Górne okno stoi w miejscu.** Domyślnie pokazuje realizację wyróżnioną (pierścionek „wyspa”).
2. **Pod spodem kafelki realizacji.** Kliknięcie kafelka podmienia treść górnego okna na tę realizację – reszta strony bez zmian.
3. Okno: duże zdjęcie + miniatury pozostałych zdjęć tej realizacji (klik w miniaturę zmienia duże zdjęcie);
   obok: rodzaj i rok, tytuł, „Zadanie”, „Co zrobiliśmy”, opcjonalnie „Czas”; przycisk zależny od rodzaju biżuterii
   („Chcę podobny pierścionek” / „Chcę podobną obrączkę” / „Chcę coś podobnego”) → `/kontakt?temat=nowy`;
   jeśli realizacja ma powiązany produkt – drugi link „Zobacz w katalogu”.
4. **Adres:** wybrana realizacja w URL (`/realizacje?r=<slug>`), renderowana też po stronie serwera (link wysłany komuś
   otwiera od razu tę historię). Kliknięcie kafelka dodaje wpis do historii – przycisk „wstecz” wraca do poprzedniej.
5. **Telefon:** po kliknięciu kafelka strona przewija się płynnie do górnego okna (jeśli jest poza ekranem), inaczej nikt
   nie zauważy zmiany. Szanuj `prefers-reduced-motion`.
6. Kafelek wybranej realizacji oznaczony wizualnie + `aria-current`. Okno ogłasza zmianę czytnikom ekranu (`aria-live="polite"`
   na tytule albo fokus na nagłówek okna).
7. Filtry nad kafelkami: „Wszystkie” · „Na zamówienie” · „Przeróbki”. Gdy filtr ukrywa wybraną realizację, okno jej nie zmienia.
8. Ze strony znika siatka starej galerii („Realizacja 1–10”). Kolekcja `gallery-items` zostaje w CMS bez zmian (archiwum zdjęć),
   strona przestaje jej używać. Przekierowania `/galeria` → `/realizacje` zostają.

## CMS – nowa kolekcja „Realizacje” (`works`)
Wzoruj się na `GalleryItems.ts` (dostęp, wersje/drafty, `trash`, rewalidacja – nowy tag np. `works`). Pola:
- `title` (wymagane), `slug` (unikalny, z tytułu),
- `kind`: `zamowienie` | `przerobka` (etykieta: „Na zamówienie” / „Przeróbka”),
- `jewelryType`: `pierscionek` | `obraczka` | `kolczyki` | `inne` (steruje tekstem przycisku),
- `year` (liczba, opcjonalnie),
- `task` („Zadanie”), `whatWeDid` („Co zrobiliśmy”), `duration` („Czas”, opcjonalnie) – textarea, krótkie,
- `photos`: tablica {`image` upload → `media`, `alt` wymagany}, min. 1; pierwsze = okładka kafelka,
- `featured` (checkbox; jeśli zaznaczonych kilka/żadna – bierz pierwszą wg `position`),
- `position`, `product` (relacja do `products`, opcjonalnie).
Panel po polsku, opisy pól zrozumiałe dla Michała/Kamili (bez żargonu). **Migracja Payload** w repo (na produkcji uruchomi Marcin –
dopisz do listy „Przed startem produkcji” w `KOLEJKA.md`).

**Jedna komenda na staging:** dodaj w `cms/package.json` skrypt `staging:realizacje` (te same `--env-file` co `staging:seed`),
który robi migrację na stagingu i seed 6 realizacji, idempotentnie (drugie uruchomienie niczego nie dubluje), z trybem
sprawdzenia bez `--apply`. W chmurze nie uruchomisz go (brak `.env`) – sprawdź logikę testem int na lokalnej bazie testowej,
jeśli projekt ją ma, a komendę wpisz na górze opisu PR („Do uruchomienia na Macu: `cd cms && npm run staging:realizacje -- --apply`”).

## Treść startowa (seed tylko na staging, jak przy imporcie katalogu)
Zdjęcia są w repo: **`cms/seed/realizacje/*.webp`** (już przeskalowane do maks. 1600 px; prefiks pliku = numer realizacji z tabeli,
nazwy plików niżej bez rozszerzenia). Seed wgrywa je do `media` jak import katalogu. Teksty = szkice z postów Michała; każde pole tekstowe w seedzie
oznacz jako do potwierdzenia przez Michała (wzorzec `DoUzupelnienia`/`byEnv` – na produkcji bez żółtych ramek i nawiasów).
Nie dopisuj faktów, których nie ma w postach (karaty, czas, ceny → placeholder).

| # | Realizacja | Zdjęcia (kolejność) | Rodzaj | Z postów (sens) | Produkt |
|---|---|---|---|---|---|
| 1 ★ | Pierścionek zaręczynowy z niebieskim diamentem („wyspa”) | `1-wyspa_01…07` (okładka 01 – dłonie) | zamówienie · pierścionek · 2026 | Przyszły narzeczony zaprojektował go razem z Michałem; niebieski diament z białymi w białym złocie, ręcznie od podstaw; zaręczyny na wyspie (posty 19.02–28.07.2026) | „Pierścionek zaręczynowy klienta (wyspa)” |
| 2 | Pierścionek z brylantem w szlifie szmaragdowym (certyfikat GIA) | `2-gia_01…05` | zamówienie · pierścionek · 2024 | Klientka wymarzyła kamień o dokładnie takim kształcie i szlifie; kamień z certyfikatem GIA, pierścionek ręcznie od podstaw (20.12.2024) | „Brylant w szlifie szmaragdowym 0,41 ct” |
| 3 | Pierścionek „wąż” z diamentami | `3-waz_01…04` (04 = praca w warsztacie) | zamówienie · pierścionek · 2025 | Motyw zwierzęcy, oczy z czarnych diamentów na życzenie klientki (01 i 13.08.2025) | brak |
| 4 | Obrączka eternity odtworzona na wzór | `4-eternity_01…03` | zamówienie · obrączka · 2026 | Klientka chciała odtworzyć obrączkę eternity; dobrane proporcje i rozmiar, diamenty w mikropavé, pasuje do pierścionka zaręczynowego (18.01.2026) | „Obrączka eternity odtworzona dla klientki” |
| 5 | Pierścionek z morganitem „Od niego. Dla niej.” | `5-morganit_01-kolaz` – to kolaż 3 kadrów: użyj zdjęć z karty produktu „Morganit w oprawie halo”, jeśli są lepsze; kolażu nie przycinaj na siłę | zamówienie · pierścionek · 2026 | Zainspirował się fasonem z pracowni, chciał wersję w innym kolorze właśnie dla niej (27.08.2026) | sprawdź „Morganit w oprawie halo” |
| 6 | Pierścionek z tanzanitem z wisiorka i kolczyków | `6-tanzanit_01` (przed: pióro) + `02–03` (po) | przeróbka · pierścionek · 2026 | Klientce znudził się wisiorek i kolczyki-pióra; Michał zaproponował pierścionek, w centrum wymarzony tanzanit (20.08.2026) | brak |

Kolejność: jak w tabeli (1 wyróżniona). W repo celowo nie ma zdjęcia pary z twarzami (czeka na zgodę) ani niepewnego zdjęcia
z warsztatu do #2 – nie szukaj ich. Alt-y konkretne, po polsku.
Zdjęcia 6-tanzanit to zdjęcia z telefonu – w oknie bez powiększania ponad rozdzielczość.

## Treści strony
- `metadata.description` i wstęp: bez napraw (po Q naprawy mają własną stronę). Kierunek: „Biżuteria zrobiona dla konkretnych osób –
  i krótko, jak powstała.” Link „Naprawy i przeróbki →” może zostać.
- Sekcje „Opinie klientów” i ciemny pasek CTA na dole zostają bez zmian.

## Sprawdzenie
- Zrzuty: desktop 1440×900 i telefon 375×812 – stan domyślny, po kliknięciu kafelka (telefon: widać przewinięcie do okna),
  otwarcie `/realizacje?r=<slug>` bezpośrednio, „wstecz”, filtr „Przeróbki”.
- Testy: int (kolekcja, seed, publiczne serializowanie bez draftów), e2e (`/realizacje`: domyślna wyróżniona, klik zmienia okno i URL,
  `?r=` po stronie serwera, nieznany slug → wyróżniona), poprawka testów, które sprawdzały starą siatkę. Lint, tsc.
- Raport w opisie PR (decyzje + co zostało do potwierdzenia przez Michała), w `KOLEJKA.md` status „do przeglądu Klaudii” + PR. Produkcja – stop.

## Pytania do Michała (Marcin, rozmowa 01.11) – nie blokują startu
1. Czy para zgodzi się na pokazanie zdjęcia z twarzami? (bez zgody zostają dłonie i packshoty)
2. Czy `2-gia_POTWIERDZIC_proces.jpg` (19.12.2024) to ten sam pierścionek?
3. Lata, czas wykonania i 1 zdanie poprawki do każdej historii.
4. Kolczyki dla klientek (07.2026, 06.2026) i „wąż” z niebieskimi diamentami (10.2026) mają na FB tylko filmy – czy są zdjęcia?
5. Czy któreś z 10 zdjęć starej galerii to prace dla klientów (z historią)?
