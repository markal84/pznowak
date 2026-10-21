# Raport — parity i dane legacy, 2026-10-09

Dla Marcina i Klaudii. Wykonano kroki 1–2 zlecenia w
`/Volumes/crucial/projects/pznowak-cms`, gałąź `codex/astra-dynamic-frontend`.
Stara aplikacja pozostaje w repozytorium. Bez merge, zmian Production, domen,
projektów Vercel i gałęzi produkcyjnych; produkcja Neon wyłącznie READ ONLY.

## Stan zastany i zachowane zmiany

Przed rozpoczęciem były zmodyfikowane: `AGENTS.md`, `README.md`, konfiguracja
Next, strony galerii/katalogu/404, CSS, komponenty galerii i karty produktu,
konfiguracja Payload; nowe: `global-not-found.tsx`, `NotFoundContent.tsx`,
`RingImage.tsx`. Zatrzymano pracę i uzyskano zgodę Marcina na kontynuację.

Po analizie diff zachowano polski panel, globalne 404, Next Image, placeholdery,
SEO galerii i układ kart. Powiązane zmiany CMS włączono do sprawdzonego commitu;
nie odrzucano ich. Pierwotne zmiany `AGENTS.md` i root `README.md` pozostają
niezacommitowane i nietknięte. Nie używano reset, clean ani usuwania aplikacji.

## Wykonane prace i commity

- `6472e36` — pełny staging mirror, izolacja mediów, poprawki odmiany i nagłówków,
  zachowane usprawnienia frontendu oraz dane historyczne i ścieżki importów.
- `fd3400f` — skrypt mirror pobiera istniejący sterownik pg przez adapter Payload,
  także przy instalacji z izolowanymi zależnościami; bez nowych pakietów.
- `PARITY.md` i ten raport dokumentują końcowe dowody i decyzje; obrazy nie są
  commitowane. Push wyłącznie `origin/codex/astra-dynamic-frontend`.

### A. Staging i media

`npm run staging:mirror` i `--check` są bez-zapisowe; `--apply` kopiuje katalog
przez Payload Local API. Produkcja jest czytana przez pg w pojedynczej
transakcji `REPEATABLE READ READ ONLY`, zakończonej ROLLBACK. Źródło i cel
muszą mieć odpowiednio etykiety production/staging i różne endpointy.
Konfiguracja Payload jest inicjalizowana dopiero na staging.

Wybrano A2(a): kopie plików pod `cms/media-staging/`, bez usuwania lub
nadpisywania obiektów produkcji. Dodatkowa blokada w Preview/staging zabrania
edycji i usuwania starszych rekordów spoza tego prefiksu oraz wskazania innego
prefiksu przy zapisie. Preview rozpoznaje środowisko przez `VERCEL_ENV=preview`
(jego konfiguracja nie zawiera NEON_BRANCH). Istniejące środowiska Vercel nie
były modyfikowane.

| Dowód | Production | Staging |
| --- | ---: | ---: |
| Opublikowane produkty | 34 | 34 |
| Opublikowana galeria | 11 | 11 |
| Powiązane, odrębne media pełnego katalogu | 137 | 137 kopii |
| HTTP 200 dla każdego powiązanego medium | 137/137 | 137/137 |
| Kolejność slugów produktów | wzorzec | identyczna |

Publiczne API: 106 przypiętych zdjęć produktów, 27 filmów i 11 pozycji galerii.
Pełna liczba rekordów stagingu nie jest zrównana przez usuwanie historii:
pozostaje 1 produkt seed jako archiwalny szkic, 1 szkic galerii seed i 3 stare
rekordy mediów, chronione przed zmianą/usunięciem. Staging łącznie: 35 produktów,
12 galerii, 140 mediów. Równość dotyczy opublikowanego katalogu i jego relacji.

Idempotencja po ponownym APPLY i końcowym CHECK: `uploads=0`,
`recordChanges=0`, ponownie zgodna kolejność i HTTP 200 wszystkich 137 mediów.
Po błędzie mirror może być ponowiony; nie czyści automatycznie ewentualnych
nieprzypiętych kopii Blob. Podczas wdrażania adapter zwracał z create URL sprzed
losowego sufiksu — skrypt odczytuje zapisany dokument ponownie przed kontrolą.

### B–C. Frontend

Jedna funkcja odmiany: singular tylko dla 1; testy wszystkich 12 wymaganych
liczb, w tym 21 i 112. Nagłówki CMS obsługują `*fragment*` jako em, z automatycznym
escapowaniem tekstu przez React; test HTML i niedomkniętej gwiazdki. Panel ma
opis przy obu polach. Staging odtwarza wyróżnienia i łamanie nagłówków wzorca.
Naprawiono także reset stanu zdjęcia po wyborze innej miniatury.

36 pełnych zrzutów tras w 1440 i 390 px oraz dodatkowe stany interakcji,
publikacji i Preview są w ignorowanym `screenshots/`. Wszystkie 8 właściwych
tras mają identyczną wysokość strony względem wzorca w obu szerokościach.
Tabela różnic i linki: [PARITY.md](PARITY.md).

Menu (otwarcie/Escape/nawigacja), lupa (mysz/strzałki/Escape), miniatury,
lightbox produktu i galerii oraz wymagalność/minimalna długość wiadomości
przeszły w obu wersjach. Nie wywołano wysyłki formularza ani otwarcia mailto.
Pozostałe błędy kategorii „błąd”: **brak w sprawdzonym zakresie**.
Świadome odstępstwa: responsive Next Image i placeholder, cała karta jako link,
etykieta i SEO globalnego 404, edycja formatowania nagłówka z CMS.

### D. Dane historyczne

`data/legacy/collection.json` i `data/legacy/jewelry/` są teraz źródłem importów
CMS i backendu. Zaktualizowano wszystkie cztery wskazane skrypty CMS, skrypty
importu i mediów backendu, testy i dokumentację. Wybrano zachowanie kopii w
`src/lib/collection.json` i `public/jewelry/` dla działającego starego frontendu.
Hash JSON oraz wszystkich 110 plików zdjęć potwierdził identyczność kopii.
Nie dodano zależności ani nie zmieniono lockfile.

## E. Kontrole i Preview

| Kontrola | Wynik |
| --- | --- |
| CMS `npm run lint` | PASS; 0 błędów, 18 zastanych ostrzeżeń (img, nieużywane argumenty migracji/testów). |
| Root `npm run lint` | PASS; 0 błędów, 13 zastanych ostrzeżeń. |
| CMS `npx tsc --noEmit` | PASS. |
| CMS testy integracyjne/jednostkowe na stagingu | 30/30 PASS, 7 plików. |
| CMS `npm run build` ze stagingowym env | PASS. |
| Backend `npm run check` | PASS, 14/14 testów. |
| Build starej aplikacji w root | PASS, 47 wygenerowanych stron. |
| Playwright, 9 tras × 2 szerokości × 2 wersje | PASS; CMS poprawne 200/404, brak uszkodzonych zdjęć i poziomego overflow. |
| Zmiana produktu w panelu → frontend → przywrócenie | PASS, opis Merope; bez rebuild/deploy w trakcie testu, przywrócony oryginał. |
| Preview: strony, `/admin`, `/products?all=true` | PASS, dokładny commit fd3400f. Logowanie i dashboard panelu również PASS. |

Preview: [pznowak-1n9cutbjv](https://pznowak-1n9cutbjv-markal84s-projects.vercel.app),
wdrożenie `dpl_9UwCoL9pMss1EU32LvC7CQEN5cFh`, stan READY,
SHA `fd3400f7ac94561aff6abbbf4958320668f70994`. Host bazy Preview potwierdzony
jako staging. W przeglądarce sprawdzono `/`, `/katalog`, `/katalog/electra-2`,
`/galeria`, `/kontakt`, `/products?all=true`, brakującą trasę (404), `/admin`
i logowanie. Wszystkie sprawdzone media wczytane. Dostęp przez istniejące
uwierzytelnienie CLI/OIDC; nie wyłączano ochrony.

Pierwsze testy integracyjne wskazały nieuruchomiony lokalny Postgres; powtórzono
je ze stagingiem i zaliczono. Pierwszy build z flagami Node env-file wywołał
błąd workera Next; końcowy build przez przekazanie env do procesu przeszedł.
Są to rozwiązane problemy uruchomienia, nie pozostawione błędy aplikacji.

Tymczasowy administrator stagingu miał losowe silne hasło i nieistniejący
adres example.invalid. Po teście usunięto wyłącznie to konto i jego ignorowany
plik sekretów. Opis testowy jest przywrócony; wersje zmian pozostają w historii
CMS. Sekretów nie ma w commitach ani zrzutach. Oryginalne env pozostają bez zmian.

## Otwarte decyzje Marcina

1. Akceptacja tekstów, szczególnie opisu pracowni i obietnic dotyczących wykonania.
2. Potwierdzenie zdjęć-koncepcji AI albo zamiana na zdjęcia pracowni i produktów.
3. Docelowa wysyłka formularza: pozostawienie mailto lub późniejsza integracja
   serwerowa; odbiorcy i zasady obsługi. W tym etapie nie zmieniono mechanizmu.
4. Decyzja o 17 oczekujących produktach i 1 szkicu z WP wskazanych w zleceniu:
   dobór treści/mediów i zatwierdzenie publikacji. Nie kopiowano ich jako
   opublikowanych i nie weryfikowano ponownie bieżącego stanu WordPress.
5. Akceptacja świadomych odstępstw z PARITY i decyzja po audycie Klaudii o
   dalszej integracji oraz kroku 3 (wycofanie starej aplikacji).

Nie przygotowano wersji raportu dla Michała i Kamili. Produkcja pozostaje
poza zakresem tej realizacji.
