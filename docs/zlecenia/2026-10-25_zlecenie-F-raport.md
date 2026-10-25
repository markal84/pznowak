# Zlecenie F: raport (ogólny przebieg designu)

Data: 2026-10-25. Gałąź `claude/design-ogolny-f` (z `main`), PR do `main`. Nic nie trafiło do `release`.

- **PR:** {{PR}}
- **Preview:** {{PREVIEW}}
- **Zrzuty:** `2026-10-25_zlecenie-F-zrzuty/przed/` i `…/po/` (strona główna, obrączki, pracownia, naprawy; 1440 i 390 px).

## Co powstało

| Element | Plik | Do czego |
| --- | --- | --- |
| `SectionIntro` | `cms/src/components/site/SectionIntro.tsx` | Tytuł sekcji, pod nim opcjonalny krótki wstęp i akcja. Jedna kolumna, miara 34em. Zastępuje wiersze „h2 z lewej, akapit z prawej”. Obsługuje też `h1` (nagłówki podstron, skala bez zmian). |
| `PriceOffer` | `cms/src/components/site/PriceOffer.tsx` | Cena i wezwanie do działania jako jeden blok: papierowa przywieszka z ceną (ta sama co przy pierścionkach), obok przycisk i notka, od czego zależy cena. |
| `Icon` | `cms/src/components/site/Icon.tsx` | Jeden zestaw 16 ikon SVG w stylu ilustracji „Jak powstaje pierścionek”: cienka linia w kolorze tekstu (grafit; na zieleni jasna), złoto tylko na kamieniach, połysku i złocie. Siatka 32 × 32, linia 1,35, `currentColor`, `aria-hidden`. Zastępuje ikony z `/grafiki/ikony` wstawiane jako `<img>` (te nie reagowały na kolor i były słabo widoczne). |
| Style | `cms/src/app/(frontend)/globals.css`, blok „zlecenie F” na końcu | `.sec-intro`, `.offer`, `.tiles`/`.tile`, `.icon`, `.chrono` (oś czasu), ruch. |

Ikony: pierścionek, obrączki, szkic, naprawa, rozmiar, czyszczenie, lupa (przegląd oprawy), oprawa (łapki), kamień, łańcuszek, grawer, renowacja, zdjęcie, przetopienie (rodzinne złoto), kalendarz, karta (jasne informacje). Pokrywają 8 pozycji napraw, 4 kafle strony głównej, „Na początek wystarczy” i „Na czym nam zależy”, puste miejsca na zdjęcia obrączek. Rozmiary: 48 px w kaflach, 44 px w naprawach, 40 px w listach. Na telefonie sprawdzone przy DPR 2.

## Zmiany na stronach

**Strona główna**
- „Cztery pokolenia przy jednym fachu”: sam tytuł (`SectionIntro`), bez wstępu.
- „Z czym możesz do nas przyjść”: zamiast czterech bloków tekstu z cenami są kafle: ikona, tytuł, jedno zdanie, link. Cały kafel jest klikalny (link rozciągnięty na kafel). Najechanie i fokus zapalają złotą linię u góry i ożywiają ikonę.
- „Pierścionki z pracowni”: `SectionIntro` z jednym zdaniem; przycisk „Wszystkie pierścionki (N)” przeniesiony pod siatkę (tam, gdzie kończy się przeglądanie).
- „Jak powstaje pierścionek na zamówienie”: `SectionIntro` (tekst bez zmian).

**Obrączki**
- Nagłówek strony: `SectionIntro as="h1"`, pod nim `PriceOffer`: „Para obrączek / od [X] zł za parę” + „Umów przymiarkę” + „Cena zależy od szerokości, wagi i próby złota.”
- „Rodzaje obrączek” (`BandTypes`): wiersz nagłówka zamieniony na `SectionIntro` (tekst bez zmian, `id="rodzaje-obraczek"` zostaje). Dolny wiersz z przyciskiem i notką o cenie przeniesiony do bloku ceny w nagłówku strony.
- Puste miejsca na zdjęcia: ikona obrączek z zestawu zamiast starego `<img>`.

**Pracownia**
- Oś czasu na komputerze: zamiast naprzemiennych wierszy z dużymi datami (`.year-big`) jest zwarta oś: cienka pionowa linia z kropką, data w skali nagłówków sekcji (serif 26 px, patyna), zdjęcie 240 px tuż obok tekstu. Strona skróciła się z 5283 do 4269 px (1440). Najechanie na wpis zapala kropkę na złoto.
- Telefon: jedna kolumna przy linii (data, zdjęcie na całą szerokość, tekst). Krótsza niż wcześniej (14884 → 13876 px przy DPR 2), kolejność i treść te same.
- „Na czym nam zależy”: `SectionIntro` + ikony karta / oprawa / renowacja.

**Na zamówienie**
- Nagłówek: cena i przyciski jako `PriceOffer` („Pierścionek na zamówienie / zwykle [X–Y] zł”).
- „Na początek wystarczy jedno z nich”: `SectionIntro` + ikony.
- „Cztery etapy, jeden złotnik”: `SectionIntro` (wstęp zostaje).

**Naprawy**
- „Co robimy i ile to trwa”: `SectionIntro` (wstęp o cenach orientacyjnych zostaje), ikony z zestawu przy 8 pozycjach.

**Realizacje**
- Nagłówek strony: `SectionIntro as="h1"` (tekst bez zmian).
- „Przed i po naprawie”: sam tytuł.
- „Opinie klientów”: `SectionIntro`, placeholder linku do Google jako akcja pod tytułem.

**Pierścionki**
- Nagłówek strony: `SectionIntro as="h1"` (tekst bez zmian).

Bez zmian: hero strony głównej (skala ta sama), nawigacja, struktura podstron, formularze, CMS, SEO, przekierowania, treści produktów. Nietknięte też wiersze h2 + link w „Podobne pierścionki” na stronie produktu i w ukrytym kreatorze (to nie są wiersze tytuł + akapit).

## Usunięte i przeniesione teksty

| Gdzie było | Tekst | Co z nim |
| --- | --- | --- |
| Główna, „Cztery pokolenia” | „Od kuźni pradziadka w Szańcu do stołu złotniczego w Busku-Zdroju. Narzędzia się zmieniły, dbałość o detal została.” | Usunięte. To samo mówi nagłówek strony Pracownia („Od kuźni w Szańcu do stołu złotniczego w Busku”), do której prowadzi link pod sekcją. |
| Główna, „Pierścionki z pracowni” | „Nazwy pochodzą z mitologii i gwiazdozbiorów.” | Usunięte (zostało „Każdy projekt to punkt wyjścia do Twojej wersji.”). |
| Główna, kafel „Z pomysłem…” | „Przygotujemy szkic, model 3D i wycenę, zanim zaczniemy pracę.” | Usunięte z kafla; ten przebieg opisują etapy na „Na zamówienie” i sekcja „Jak powstaje” niżej na głównej. |
| Główna, kafel „Po projekt…” | „…wykonamy w Twoim rozmiarze. Możemy zmienić kamień albo kolor złota.” | Skrócone do jednego zdania: „…wykonamy w Twoim rozmiarze, z innym kamieniem albo złotem.” |
| Główna, kafel „Po obrączki…” | „Mierzymy oboje i grawerujemy w środku to, co ważne.” | Skrócone do „…dla Was dwojga, z grawerem w środku.” Pełne zdanie jest w nagłówku „Obrączki”. |
| Główna, kafel „Z biżuterią…” | „nowe łapki dla kamienia” | „nowe łapki” |
| Główna, kafle: ceny | „Zwykle [X–Y] zł”, „Od [X] zł”, „Od [X] zł za parę”, „Wycena na miejscu” | Przeniesione na podstrony, gdzie już były: [X–Y] w bloku ceny „Na zamówienie”, „od [X] zł” w nagłówku „Pierścionki” i na kartach, „od [X] zł za parę” w bloku ceny „Obrączki”, wycena w cenniku „Naprawy”. |
| Realizacje, „Przed i po naprawie” | „Ten sam kadr przed przyjęciem i po odbiorze. Wystarczy zdjęcie telefonem na tym samym tle.” | Usunięte ze strony; to instrukcja dla Michała, nie dla klienta. **Dla Michała:** zdjęcia przed i po róbcie w tym samym kadrze i na tym samym tle; telefon wystarczy. |
| Obrączki, dół „Rodzaje obrączek” | Przycisk „Umów przymiarkę obrączek” + „Cena zależy od szerokości, wagi i próby złota.” | Przeniesione do bloku ceny w nagłówku strony (przycisk „Umów przymiarkę”). |
| Na zamówienie, nagłówek | „Pierścionki na zamówienie kosztują zwykle [X–Y] zł” | Ta sama cena w bloku ceny; dodana notka „Cena zależy od kamieni i złota.” (sformułowanie z FAQ na głównej). |

Placeholdery (`[X]`, `[X–Y]`, `[cena]`, `[czas]`, `[TERMIN…]`, `[zdjęcie do uzupełnienia]`) zostały bez zmian. Nie dopisałem żadnych faktów ani cen.

## Ruch

Wszystko w CSS, bez bibliotek i bez nowego JS. Przy `prefers-reduced-motion: reduce` ruchu nie ma wcale (osobny blok `no-preference` + istniejąca reguła globalna).

| Ruch | Gdzie | Dlaczego tak |
| --- | --- | --- |
| Pojawianie się przy przewijaniu: krótkie uniesienie (18 px) i rozjaśnienie, z lekkim przesunięciem w czasie między sąsiednimi elementami | Kafle na głównej, siatka pierścionków, oś czasu i „Na czym nam zależy” (Pracownia), lista napraw, „Na początek wystarczy” i etapy (Na zamówienie), rodzaje obrączek | Zamiast IntersectionObserver użyłem animacji sterowanej przewijaniem (`animation-timeline: view()` w `@supports`). Powód: nie trzeba ukrywać treści przed hydracją, więc nie ma mignięcia ani rozjazdu SSR/klient. Działa na wątku kompozytora (tylko `opacity` i `transform`), więc jest płynna na słabych telefonach i nie zmienia układu (brak CLS). Przeglądarki bez wsparcia (dziś Firefox i starsze Safari) po prostu pokazują treść od razu. Element poniżej ekranu jest widoczny (druk, skok do kotwicy, czytniki); stan początkowy włącza się dopiero, gdy element dochodzi do dołu ekranu. |
| Ikony ożywają: błysk na kamieniu, rysowanie linii, przesunięcie obrączki, młoteczek, lupa, obrót strzałki itd. | Kafle, naprawy, listy z ikonami | Reakcja na działanie człowieka. Uruchamia się przy najechaniu **i przy fokusie z klawiatury** (`:focus-within` na kaflu/wierszu). |
| Złota linia u góry kafla | Kafle na głównej | Pokazuje, który kafel jest aktywny (najechanie i fokus). |
| Podkreślenie linków tekstowych gęstnieje i odsuwa się | Wszystkie `.tl` | Drobna odpowiedź na najechanie/fokus. |
| Lekkie przybliżenie zdjęcia w karcie (1,035) | Karty pierścionków | Tylko w obrębie kadru, nie całej sekcji. |
| Przywieszka z ceną kołysze się raz | Blok ceny (Obrączki, Na zamówienie) | Przy najechaniu lub fokusie przycisku obok. |

Nie ma przybliżania całych sekcji ani ruchu bez udziału użytkownika poza jednym pojawianiem się przy przewijaniu.

## Weryfikacja

- `tsc --noEmit`: bez błędów. ESLint na `src/app/(frontend)` i `src/components/site`: bez uwag.
- `next build --webpack` (jak na Vercelu, ze zmiennymi stagingu): {{BUILD}}
- Testy int dotyczące frontu (creator-flags, heading-and-count, catalog, seo, indexing, legacy-redirects, frontend-publication): 91/91.
- E2E `tests/e2e/frontend.e2e.spec.ts`, projekty `chromium` i `telefon`, lokalny serwer z bazą stagingową, `E2E_SUBMISSIONS=off`: 54 przeszło, 10 pominiętych (testy kreatora i konfiguratora, wyłączone przełącznikami). Testy sprawdzają, że formularze nie wysyłają żadnych żądań zapisu.
- `prefers-reduced-motion: reduce`: brak animacji ikon i pojawiania się (sprawdzone w przeglądarce: `animation-name: none`), treść widoczna od razu.
- Klawiatura: Tab po linkach w kaflach daje widoczny fokus (złota obwódka 2 px), kafel zapala górną linię, a ikona rusza tak samo jak przy najechaniu.
- Zrzuty „po” są robione z wyłączonym ruchem, żeby pokazać ułożenie końcowe (na zrzucie całej strony animacja przewijania zatrzymałaby się w połowie). Zrzut `po/glowna-390.png` ma gęstość 1,6 zamiast 2: strona jest dłuższa niż limit jednego zrzutu w Chrome. Z tego samego powodu w `przed/glowna-390.png` ostatni fragment (FAQ i stopka) powtarza górę strony; te sekcje się nie zmieniły.

## Pytania do Marcina

1. **Ceny na głównej.** Zniknęły z kafli, zgodnie ze zleceniem; zostały na podstronach. Jeśli jedna orientacyjna cena na głównej ma zostać (np. obrączki), łatwo ją dodać pod zdaniem w kaflu.
2. **Pierścionki: cena w zdaniu.** Nagłówek „Pierścionki” nadal ma „Ceny zaczynają się od [X] zł” w akapicie. Nie zrobiłem z tego bloku ceny, bo strona nie ma jednej akcji (to katalog). Zrobić tak jak przy obrączkach?
3. **Obrączki: dwa przyciski „Umów przymiarkę”?** Teraz jest jeden, w nagłówku. Na dole „Rodzajów obrączek” zostały tylko linki „Zapytaj o obrączki …”. Czy na końcu strony potrzebny jest jeszcze jeden przycisk?
4. **Ikony.** Zestaw jest mój, w stylu ilustracji etapów. Jeśli Michał ma uwagi do konkretnych narzędzi (np. jak wygląda młoteczek albo łapki), poprawię pojedyncze rysunki w jednym pliku.
5. **Pojawianie się przy przewijaniu** działa dziś w Chrome, Edge i nowym Safari; w Firefoksie treść jest po prostu widoczna od razu. Czy to wystarczy, czy ruch ma być wszędzie (wtedy mały skrypt z IntersectionObserver, z ryzykiem mignięcia przy wolnym ładowaniu)?
