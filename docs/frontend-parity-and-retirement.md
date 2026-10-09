# Frontend Astra: porównanie i plan wycofania kopii z katalogu głównego

Stan na 2026-09-23. Bazą porównania jest stary frontend z `src/` na commicie
`8ea2be7` oraz publiczna aplikacja w `cms/src/` z tego samego commitu.

## Układ gałęzi i wdrożenia

- `codex/astra-dynamic-frontend` jest gałęzią roboczą zmian wyglądu i zachowania
  publicznych stron.
- `astra_version_backend` jest gałęzią integracyjną dla projektu Vercel
  `pznowak-cms`. Po przeglądzie zmiany frontendu trafiają do niej przez merge.
- W obu gałęziach kod frontendu i Payload znajduje się w jednej aplikacji
  `cms/`. Wdrożenie `pznowak-cms` buduje `cms/` jako całość; sama granica gałęzi
  nie tworzy drugiej aplikacji.
- `src/` i `public/` w katalogu głównym pozostają teraz punktem odniesienia.
  Nie wyłączamy starej witryny ani nie zmieniamy domen lub projektów Vercel.

## Wynik porównania 1:1

| Obszar | Wynik | Co pozostaje do sprawdzenia |
| --- | --- | --- |
| Trasy | Przeniesiono `/`, `/katalog`, `/katalog/[slug]`, `/galeria`, `/o-nas`, `/kontakt` i stronę 404. `katalog-api-test` było stroną diagnostyczną i nie trafiło do CMS. | Przejść wszystkie trasy i stany mobilne przy tym samym zestawie danych. |
| Styl i komponenty | `globals.css` jest identyczny bajt po bajcie. Z 24 wspólnych komponentów 18 jest identycznych, a 6 ma zmiany: pobieranie danych, kontakt z `site-content` lub białe znaki. | Porównać interakcje: menu mobilne, lupa, lightbox, galeria produktu i formularz. |
| Pliki stałe | 19 wspólnych plików jest identycznych bajt po bajcie. 110 lokalnych zdjęć `public/jewelry/` nie skopiowano do `cms/public/`, ponieważ CMS podaje zdjęcia z Vercel Blob. | Potwierdzić wizualnie każdą istotną miniaturę i pełny kadr z Blob. |
| Dane katalogu | Stary plik ma 34 produkty, 106 przypiętych zdjęć, 27 filmów i 11 pozycji galerii. Odczyt produkcyjnego Neon w transakcji `READ ONLY` potwierdził ten sam porządek i pola produktów, referencje mediów, galerię i opublikowane `site-content`. | Sprawdzić wynik renderowania całej kolekcji przy tych danych; porównanie nie obejmowało bajtów plików Blob. |
| Bieżący Preview | Strona główna i katalog w Preview `pznowak-cms` mają ten sam układ i wspólne elementy wizualne co stara Astra. | Preview czyta staging: 1 produkt i 1 pozycję galerii oraz testowy nagłówek i opis. Nie potwierdza więc jeszcze końcowej zgodności treści 1:1. |

Wykryta drobna różnica przy jednym produkcie: katalog pokazuje „1 projekty”.
Przed końcowym porównaniem trzeba dodać poprawną odmianę liczby produktów.
Nagłówki wpisane w CMS jako niestandardowy tekst tracą ręcznie wyróżnione
kursywą fragmenty starego wzorca; trzeba ustalić ich docelowy sposób edycji.

## Plan usunięcia starej aplikacji z katalogu głównego

1. Na gałęzi frontendu poprawić powyższe różnice i wykonać porównanie stron
   desktop/mobile, interakcji oraz adresów URL na równoważnym zestawie danych.
   Dane produkcyjne pozostają wyłącznie do odczytu. Zatwierdzić listę świadomych
   odstępstw od starej wersji.
2. Przenieść `src/lib/collection.json` i potrzebne pliki `public/jewelry/` do
   neutralnego katalogu z danymi historycznego importu (np. `data/legacy/`).
   Zaktualizować odwołania w `cms/scripts/seed-staging.ts`,
   `cms/scripts/import-legacy-catalog.ts`, `cms/scripts/bootstrap-catalog-content.ts`,
   `cms/scripts/migrate-legacy-videos.ts`, skryptach/testach `backend/` i ich
   dokumentacji. Dopiero wtedy usunięcie `src/` nie przerwie odtwarzania danych.
3. Usunąć wyłącznie starą aplikację: root `src/app`, `src/components`, zbędne
   `src/lib`, nieużywane pliki `public/` oraz konfiguracje/dependencies budowania
   Next.js z root (`package.json`, lockfile, `next.config.ts`, `postcss.config.mjs`,
   `tsconfig.json`, `eslint.config.mjs`) po potwierdzeniu, że nic innego ich nie
   używa. Zastąpić główny `README.md` krótką mapą `cms/`, `backend/` i danych
   historycznych.
4. Sprawdzić, czy `.openai/hosting.json`, stary wynik `out/` i dawna strona
   Astra są jeszcze potrzebne do porównania lub cofnięcia zmian. Ich publikacja
   i usuwanie to osobna decyzja; ten etap nie zmienia domen ani projektów.
5. Wykonać lint, TypeScript, testy integracyjne i build aplikacji `cms/`, testy
   historycznego `backend/` korzystające z przeniesionych danych oraz smoke test
   Preview: `/`, katalog, produkt, galeria, kontakt, `/admin`, `/products`.
   Zmiana produktu w panelu musi pojawić się na stronie bez ponownego wdrożenia.
6. Po przeglądzie scalić gałąź frontendu do `astra_version_backend` i zweryfikować
   jedno wdrożenie Preview `pznowak-cms`. Produkcja i domeny pozostają bez zmian.

**Warunek usunięcia:** pełna zgodność zaakceptowanego wyglądu i treści,
działające ścieżki odtwarzania danych oraz zielona weryfikacja Preview.
Do tego czasu stary frontend pozostaje w repozytorium.

## Realizacja 2026-10-09

Dane importowe: `data/legacy/collection.json` i `data/legacy/jewelry/`.
Kopie dla działającej starej aplikacji pozostają w root. Wyniki bieżącego
porównania i testów: `cms/docs/parity-2026-10-09/PARITY.md` oraz `RAPORT.md`.
