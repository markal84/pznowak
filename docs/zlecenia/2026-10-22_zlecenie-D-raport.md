# Raport – zlecenie D: SEO fundament przed przeprowadzką (22.10.2026)

Dla Marcina. Gałąź `claude/seo-fundament-d`, PR do `main`. Nic nie zostało zmienione na produkcji ani w `release`.
Wygląd strony bez zmian (zmieniły się tylko tytuły kart, opisy i znaczniki w `<head>` oraz jeden ukryty skrypt JSON-LD).

## Co zrobione

| # | Zakres | Gdzie |
| --- | --- | --- |
| 1 | **Mapa przekierowań**: 39 adresów z mapy witryny starej strony + 11 z Google Search Console (wszystkie w tabeli), do tego 34 adresy `/ring/…` i 11 `/gallery/…` z zaplecza WordPress. Razem 83 przekierowania i 2 adresy bez zmian (`/`, `/kontakt`), każde przekierowanie jednym skokiem (308), także wersja ze skośnikiem. | `docs/seo/przekierowania.md`, `cms/src/lib/legacy-redirects.ts`, `cms/next.config.ts` |
| 2 | **Tytuły i opisy** wszystkich 8 podstron wg `plan-reklamy-lokalnej.md` rozdz. 4.2 (bez fragmentów z `[X]`). Strona główna ma w tytule „Busku-Zdroju”. `/kreator` ma `noindex`. | `cms/src/app/(frontend)/*/page.tsx`, `cms/src/lib/seo.ts` |
| 3 | **Wtyczka SEO** `@payloadcms/plugin-seo` 3.90.1 w `products`: zakładka „SEO” (tytuł, opis, obraz, podgląd w Google) i przyciski „Wygeneruj”. Strona pierścionka używa pól wtyczki, a gdy puste, tych samych generatorów. Migracja `20261022_095455_seo_pierscionki`. | `cms/src/payload.config.ts`, `cms/src/lib/product-seo.ts`, `cms/src/lib/product-seo-admin.ts` |
| 4 | **`metadataBase`**, adres kanoniczny na każdej stronie, `sitemap.xml`, `robots.txt` z odnośnikiem do mapy na produkcji, Open Graph i Twitter. | `cms/src/lib/seo.ts`, `cms/src/app/sitemap.ts`, `cms/src/app/robots.ts` |
| 5 | **JSON-LD JewelryStore** na stronie głównej i `/kontakt`: adres, telefon, e-mail, godziny, FB i IG; bez `geo`, bez `aggregateRating`, bez placeholderów. | `cms/src/lib/structured-data.ts`, `cms/src/components/site/JsonLd.tsx` |
| – | **Niezależność od hostingu**: zmienna `SITE_ENV=production` ma pierwszeństwo, `VERCEL_ENV` jest zapasem. Przekierowania w kodzie aplikacji. | `cms/src/lib/indexing.ts`, `cms/.env.example`, `cms/README.md` |

### Przekierowania: najważniejsze ustalenia

- **Slugi się zgadzają.** Wszystkie 34 slugi pierścionków (w tym `pierscionek-8`, `-10`, `-12`, `-21`) istnieją w Payload
  (sprawdzone odczytem bazy stagingowej) i są identyczne ze starymi. `/katalog/<slug>` → `/pierscionki/<slug>` zawsze trafia
  w działającą stronę.
- **Łańcuch przez skośnik był realny** (sprawdzone: z domyślnym ustawieniem `/katalog/aria/` → `/katalog/aria` → `/pierscionki/aria`).
  Wbudowane przekierowanie skośnika w Next działa przed przekierowaniami z konfiguracji, więc stare reguły dawały dwa skoki. Dlatego
  w `next.config.ts` jest `skipTrailingSlashRedirect: true`, każdy stary adres ma wpisaną wersję ze skośnikiem i bez,
  a ogólna reguła `/:path+/` → `/:path+` stoi na końcu listy. Sprawdzone na serwerze deweloperskim i na buildzie produkcyjnym.
- **Stara strona to dwie rzeczy na jednej domenie.** Google widzi statyczny eksport (`/katalog/…`, `/galeria/…`). Pod tą samą
  domeną odpowiada też WordPress (`/ring/…`, `/gallery/…`, `/feed/`, `/wp-json/`), ale jego adresy kanoniczne wskazują na
  `serwer1542079.home.pl`, więc Google nie ma ich pod pznowak.pl (GSC: 0 takich adresów). Przekierowania `/ring/…` i
  `/gallery/…` są zabezpieczeniem, nie ratunkiem ruchu.
- **Adresy bez odpowiednika** (`/przykladowa-strona`, `/witaj-swiecie`, `/category/bez-kategorii`, `/feed`, `/wp-json`,
  `/wp-sitemap.xml`) zwracają 404; nie idą na stronę główną. Zlecenie dopuszczało 410, ale Next nie robi 410 z konfiguracji,
  a nic z tych adresów nie jest w Google, więc nie dokładałem własnej obsługi.
- **Nie miałem eksportu z GSC** (raport „Strony”/„Skuteczność” z 16 miesięcy). Użyłem 11 adresów podanych w zleceniu i mapy
  witryny. Lista „do uzupełnienia z GSC” jest na końcu `docs/seo/przekierowania.md`.

### Wtyczka SEO i migracja (opis dla PR)

Migracja dodaje **6 kolumn, wszystkie opcjonalne**, i 2 indeksy:
`cms_products.meta_title`, `meta_description`, `meta_image_id` (klucz obcy do `cms_media`, `ON DELETE SET NULL`) oraz ich odpowiedniki
w tabeli wersji `_cms_products_v` (`version_meta_*`). Nic nie jest usuwane ani zmieniane, więc stary kod dalej działa.
Odwrócenie (`down`) usuwa te kolumny.

- **Zastosowana na stagingu** (`ep-nameless-butterfly…`, odczyt statusu przed i po: czekała tylko ta jedna). Bez niej
  strony na podglądzie przestałyby działać, bo Payload czyta nowe kolumny.
- **Nie zastosowana na produkcji.** Przed wdrożeniem kodu na produkcję: `npx payload migrate` na bazie produkcyjnej
  (pamiętaj, że `cms/.env.local` wskazuje produkcję).
- `payload-types.ts` ma tylko dopisane pole `meta` (generator bez tokenu Blob kasuje `prefix` i `_objectKey`, więc dopisałem
  ręcznie, tak jak w notatce z Zlecenia B). `importMap.js` ma 5 nowych komponentów wtyczki.
- Automatyczne uzupełnianie nie zapisuje nic do bazy: puste pola SEO są uzupełniane przy wyświetlaniu strony, więc 34 istniejące
  pierścionki mają gotowe SEO bez ręcznej edycji, a szkic dodany z Facebooka dostaje je od razu po publikacji. Sprawdzone na
  wszystkich 34 (żaden tytuł ani opis nie jest pusty), funkcje stojące za przyciskami „Wygeneruj” (tytuł, opis, obraz) sprawdzone na danych
  ze stagingu (przycisków w panelu nie klikałem).

Przykłady (z danych stagingu): `Phoebe — tanzanit, diamenty w żółtym złocie`, `Merope — pierścionek w złocie`.

### Dane strukturalne

- **JewelryStore**: tak. Walidację w Rich Results Test/validator.schema.org robi się wklejeniem kodu, a ja nie mam do nich
  dostępu, więc **nie wykonałem jej w zewnętrznym narzędziu**. Zamiast tego test (`seo.int.spec.ts`, `seo.e2e.spec.ts`)
  sprawdza, że JSON jest poprawny, ma typ `JewelryStore`, adres, godziny zgodne z `site.ts`, a nie ma `aggregateRating`,
  `geo`, `priceRange` ani nawiasów `[...]`. Kod do wklejenia: `curl -s http://localhost:3000/ | grep -o '<script type="application/ld+json">.*</script>'`.
- **Product: nie dodany.** Google dla wyników produktowych wymaga `offers`, `review` albo `aggregateRating`. Bez ceny Product
  nie ma szansy na wynik rozszerzony, a Search Console zgłaszałby w nim błędy. Wróci razem z cenami (T1 w planie reklamy).

## Decyzje dla Marcina

1. **Nazwa firmy w JSON-LD (D1 z planu).** Wpisałem „Michał Nowak Pracownia Złotnicza” (nazwa profilu na FB). Ma być identyczna
   z szyldem i wizytówką Google; zmiana to jedna stała `BUSINESS_NAME` w `cms/src/lib/structured-data.ts`.
2. **Zdjęcie domyślne do udostępniania** (decyzja zmieniona 22.10.2026): `cms/public/og-pracownia.jpg`, 1200×630, kadr z
   `about-us-son.png` (Michał przy mikroskopie). **TYMCZASOWE: kadr z about-us-son.png, podmienić na oryginał z pracowni.**
   Zmiana: plik w `cms/public/` i `DEFAULT_OG_IMAGE` w `cms/src/lib/seo.ts`. Na stronach pierścionków w podglądzie jest ich własne zdjęcie.
3. **Odstępstwa od brzmienia ze zlecenia w tekstach generowanych dla pierścionków.** Opis zastępczy to
   „Pierścionek Phoebe: tanzanit, diamenty, żółte złoto. Ręcznie wykonany w pracowni Michała Nowaka w Busku-Zdroju.”
   (zlecenie: „… z <kamień> w <złoto>”). Nazwy kamieni z katalogu są w mianowniku („Szafir i Diamenty”) i automat nie odmieni
   ich poprawnie. W tytule bez kamienia jest „Merope — pierścionek w złocie”. Jeśli wolisz dosłownie, to dwie funkcje w
   `cms/src/lib/product-seo.ts`.
4. **Długość tytułów.** 5 z 8 podstron ma tytuł z dopiskiem „— Michał Nowak” dłuższy niż ok. 60 znaków (strona główna 66,
   `/naprawy` 62, `/pierscionki` i `/kontakt` 61), więc Google może uciąć końcówkę z marką. Treść jest z planu 4.2; skrócenie to
   decyzja o brzmieniu, nie techniczna.
5. **`alt` zdjęć.** Frontend nie czyta pola `alt` z CMS, tylko sam składa tekst: na liście „Pierścionek Phoebe: tanzanit,
   diamenty”, na stronie pierścionka „Phoebe: zdjęcie 1: widok z boku”. Nigdy nie jest pusty ani nie jest nazwą pliku (miniatury
   mają `alt=""` celowo). Słabość: podpisy „widok z boku”, „oprawa z bliska”, „obrączka” są przypisane do numeru zdjęcia, a nie do
   tego, co jest na zdjęciu. Nie ruszałem (zlecenie: tylko sprawdzić).
6. **Zdjęcia i podpisy w `/realizacje`** to ogólne „Realizacja pracowni 1…” bez opisu. Zostawiłem.
7. **`SITE_ENV` na docelowym serwerze.** Ma być `production` podczas `next build` i przy uruchamianiu (zob. lista poniżej).
   Na podglądach nie ustawiać go na `production`. `www` → bez `www` i `http` → `https` to konfiguracja serwera/DNS, poza zakresem.
8. **Migracja na produkcji**: kiedy (przed wdrożeniem kodu na produkcję, zob. wyżej).

## Jak to sprawdzić

W katalogu `cms`, z bazą stagingową (nie `.env.local`, bo to produkcja):

```bash
set -a && . ../backend/.env.staging.local && set +a
npx next dev --webpack -p 3007
# w drugim terminalu:
E2E_BASE_URL=http://localhost:3007 npx playwright test tests/e2e/seo.e2e.spec.ts --project=chromium
npm run test:int
```

- `curl -sI http://localhost:3007/katalog/aria/` → `308`, `location: /pierscionki/aria` (jeden skok).
- `curl http://localhost:3007/robots.txt` → `Disallow: /`; z `SITE_ENV=production` → `Allow: /` i `Sitemap:`.
- `curl http://localhost:3007/sitemap.xml` → 8 podstron i opublikowane pierścionki z `lastmod`.
- W panelu: pierścionek → zakładka „SEO” → „Wygeneruj” przy tytule, opisie i obrazie (**tej zakładki nie oglądałem przez
  logowanie do panelu**; sprawdziłem konfigurację pól, mapę importów i działanie generatorów na danych stagingu).

Wyniki moich testów:

- Testy integracyjne: 317 przeszło, 29 pominiętych. `tests/int/api.int.spec.ts` pada, bo wymaga lokalnego
  Postgresa na `127.0.0.1:5432` (nie związane ze zleceniem; **nie uruchamiałem go z bazą**).
- E2E `seo.e2e.spec.ts`: 102 testy, wszystkie zielone na serwerze deweloperskim; na buildzie produkcyjnym z `SITE_ENV=production`
  101 zielonych + 1 pominięty (test podglądu); na buildzie bez `SITE_ENV` znów 102 zielone (`noindex` na podglądzie potwierdzony
  nagłówkiem, metą i `robots.txt`).
- `tsc --noEmit` i `next build` bez błędów; ESLint bez błędów.
- Nie uruchamiałem w innych przeglądarkach (testy HTTP bez przeglądarki) ani na wdrożonym podglądzie Vercela.

Zmieniony istniejący test: `creator-flags.int.spec.ts` oczekiwał, że `/kreator` nie ma żadnych metadanych; teraz ma tylko `noindex`
(wymóg zlecenia D).

## Lista kontrolna na dzień przeprowadzki (21.11.2026)

Przed przełączeniem:

1. `npx payload migrate` na produkcyjnej bazie (migracja `20261022_095455_seo_pierscionki`).
2. Na serwerze docelowym: `SITE_ENV=production` **podczas budowania i uruchamiania**, `SITE_URL` puste albo `https://pznowak.pl`.
3. Po wdrożeniu `curl https://pznowak.pl/robots.txt` (ma być `Allow: /` i `Sitemap:`), `curl -sI https://pznowak.pl/` (brak
   `X-Robots-Tag: noindex`), `view-source` strony głównej (`<meta name="robots" content="index, follow">`).
4. Przekliknąć 10 najważniejszych starych adresów (każdy ma dać jedno przekierowanie i 200): `/katalog/cassiopeia/`,
   `/katalog/celaeno/`, `/katalog/merope-2/`, `/katalog/taygete/`, `/katalog/pierscionek-8/`, `/katalog/pierscionek-10/`,
   `/katalog/pierscionek-12/`, `/katalog/pierscionek-21/`, `/galeria/`, `/o-nas/`. Test automatyczny na adresie produkcyjnym:
   `E2E_BASE_URL=https://pznowak.pl SITE_ENV=production npx playwright test tests/e2e/seo.e2e.spec.ts --project=chromium`.
5. W Search Console: zgłosić `https://pznowak.pl/sitemap.xml` (stara mapa ma te same adresy, ale w starym układzie), użyć
   „Sprawdzenie adresu URL” na `/` i na jednej stronie pierścionka, kliknąć „Poproś o zindeksowanie”.
6. Sprawdzić, że `/kreator`, `/admin` i `/api` nie ma w mapie strony.
7. Wkleić kod JSON-LD ze strony głównej do Rich Results Test i validator.schema.org (nie zrobiłem tego z poziomu kodu).

Po przeprowadzce:

8. Po tygodniu: raport „Strony” (zindeksowane vs nie) i „Przekierowanie strony” w Search Console; adresy zgłoszone jako
   „Nie znaleziono (404)” porównać z tabelą w `docs/seo/przekierowania.md`.
9. Po 2–4 tygodniach: kliknięcia i pozycje dla „złotnik busko zdrój” i „jubiler busko” względem punktu startowego (38 kliknięć,
   672 wyświetleń od 6.02.2026, pozycje 1–2).
10. Uzupełnić `docs/seo/przekierowania.md` o adresy z eksportu GSC, jeśli są poza tabelą.

## Poza zakresem (jak w zleceniu)

Blog, badanie fraz, nowe podstrony, ceny, analityka (W4), Google Ads, zmiany wyglądu, produkcja i DNS.
