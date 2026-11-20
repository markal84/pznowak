# Poradniki i teksty stron w panelu

Od 20.11.2026 poradniki i najczęściej poprawiane teksty stron edytuje się w panelu Payload, bez PR i wdrożenia.
Zmiana jest widoczna na stronie od razu po kliknięciu **Opublikuj**.

## Co jest w panelu

**Strona → Poradniki** (kolekcja `guides`, `src/collections/Guides.ts`)

- Zakładka *Treść*: tytuł (H1), wstęp i **Sekcje**. Każda sekcja ma nagłówek H2, kotwicę (adres po `#`) i nazwę
  w spisie treści. Rodzaje sekcji:
  - *Sekcja*: zwykły tekst (akapity, pogrubienie, kursywa, linki, listy, nagłówki H3) i bloki osadzone:
    kalkulator rozmiaru, tabela rozmiarów, rysunek średnicy i obwodu, tabela porównania kamieni, zwykła tabela,
    wyróżniona uwaga, tekst zależny od cen w kolekcji (`{cena}` = najniższa cena „od … zł”).
  - *Kamień*: opis kamienia z twardością, kolorami i do 3 pierścionkami z kolekcji (dobranymi po kamieniu głównym karty).
  - *Przykłady cen z kolekcji*: cztery pierścionki z cenami; bez cen sekcja znika (także ze spisu treści).
- Zakładka *Pytania*: sekcja „Częste pytania” na końcu poradnika i dane FAQPage dla Google.
- Zakładka *Kafelek i SEO*: adres, krótka nazwa, opis (Google i kafelek), tytuł w Google, temat, daty, czas
  czytania, kolejność.

Nowy poradnik = nowy wpis w panelu. Sam trafia na listę `/poradniki`, do kafelków, mapy strony i danych
strukturalnych. Linki: wpisuj adresy względne (`/na-zamowienie`, `/poradniki/…`) albo kotwice (`#kalkulator`).

**Strona → Teksty stron** (global `site-content`, `src/globals/SiteContent.ts`)

| Zakładka | Co zmienia |
| --- | --- |
| Strona główna | H1 (fragment w `*gwiazdkach*` = druga linia kursywą) i wstęp |
| Pierścionki | H1, wstęp, zdanie przy cenie „od”, tytuł i opis dla Google |
| Na zamówienie | H1, wstęp, zdanie przy cenie, pytania i odpowiedzi, tytuł i opis dla Google |
| Obrączki | H1, wstęp, cena na przywieszce, zdanie przy cenie, pytania, tytuł i opis dla Google |
| Poradniki (lista) | H1, wstęp, tytuł i opis dla Google strony `/poradniki` |
| Pracownia | H1 i wstęp |
| Pasek z komunikatem | pasek nad menu na każdej stronie, np. „Zamówienia na święta przyjmujemy do 10 grudnia”, z linkiem i datą, po której sam znika |

Puste pole = dotychczasowy tekst z `src/content/page-texts.ts`, więc nagłówek nie zniknie przez przypadek.

## Szkice i klucz API

Obie rzeczy mają wersje robocze jak karty pierścionków: **Zapisz szkic** nic nie zmienia na stronie, dopiero
**Opublikuj**. Konto z kluczem API (rola Redaktor) może tylko tworzyć i zmieniać szkice (`src/lib/api-key-draft-only.ts`),
nie publikuje i nie przywraca wersji. Różnice między szkicem a opublikowaną wersją widać w zakładce *Wersje*.

**Kto co robi (ustalenie Marcina z 20.11.2026):**

- **Nowe poradniki** zakłada konto worker (Automat) przez API, zawsze jako szkic: tytuł, wstęp, sekcje z kotwicami,
  pytania, linki wewnętrzne i pola z zakładki *Kafelek i SEO*.
- **Poprawki, edycję, zatwierdzenie i publikację** robi Marcin w panelu. Worker nie zmienia istniejących poradników
  ani tekstów stron; proponuje zmiany w wątku, a Marcin wprowadza je sam.
- Pierwszy poradnik założony tą drogą: „Na której ręce nosi się pierścionek zaręczynowy”
  (`/poradniki/na-ktorej-rece-nosi-sie-pierscionek-zareczynowy`, szkic z 20.11.2026).

## Co zostaje w kodzie

Wygląd i układ stron, kalkulator rozmiaru, tabela rozmiarów (liczona z `src/lib/ring-size.ts`), rysunek, wybór
pierścionków do przykładów, dane kontaktowe i godziny (`src/lib/site.ts`, także w danych LocalBusiness), pytania
strony głównej, kroki „Jak pracujemy” na `/na-zamowienie`. Linki z kart pierścionków do sekcji kamieni
(`src/lib/guide-links.ts`) zakładają kotwice `diament`, `szafir`, `rubin`, `szmaragd`, `tanzanit`, `topaz`,
`oliwin`, `ametyst-cytryn`, `turmalin-morganit`: tych kotwic nie zmieniaj w panelu.

## Gdy baza nie ma treści

Bez opublikowanych poradników w bazie albo przy błędzie bazy strona pokazuje treść z `src/content/guides-seed.ts`
i teksty domyślne z `src/content/page-texts.ts` (błąd trafia do logu). Dzięki temu kod wdrożony przed migracją
nie psuje strony, ale poprawki z panelu działają dopiero po migracji i przeniesieniu treści.

## Wdrożenie (jednorazowo, 20.11.2026)

Najpierw kod, potem baza: nowy kod na bazie przed migracją pokazuje treść z kodu (sprawdzone), a stary kod
nie zobaczy nigdy bazy po migracji.

1. Scalenie PR i od razu wdrożenie na MyDevil: `sh ~/pznowak-cms-prod/cms/scripts/mydevil/deploy.sh pznowak.pl`
   (nocny auto-deploy nie wdraża commitów z migracjami). Strony wyglądają jak dotąd; panel Poradniki i Teksty
   stron działa dopiero po kroku 2.
2. Migracja na żywej bazie, lokalnie na aktualnym `main`, z katalogu `cms`:
   `node --env-file=.env --env-file=.env.local --env-file=../backend/.env.production.local node_modules/payload/bin.js migrate`
   (samo `npx payload migrate` trafia do innej bazy).
3. Przeniesienie treści: `npm run tresci:przenies` (sprawdzenie), potem `npm run tresci:przenies -- --apply`.
4. Kontrola: panel → Strona → Poradniki (3 opublikowane) i Teksty stron; strony `/poradniki/…`, `/na-zamowienie`,
   `/obraczki`, `/pierscionki` wyglądają jak przed zmianą.
