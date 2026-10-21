# PZ Nowak CMS

Panel Payload zarządza pierścionkami, zdjęciami i filmami. Dane relacyjne są
przechowywane w Neon PostgreSQL, a pliki w publicznym Vercel Blob pod prefiksem
`cms/media` (production) lub `cms/media-staging` (staging/Preview).

## Uruchomienie lokalne

Sekrety są pobierane z ignorowanego pliku `.env.local`. Panel uruchamia się na
porcie 3001:

```bash
npm run dev -- -p 3001
```

## Publiczne dane produktów

- `GET /products?limit=3` zwraca losową próbkę zgodną z testową stroną katalogu.
- `GET /products?all=true` jest kanonicznym publicznym endpointem katalogu. Zwraca
  wszystkie opublikowane produkty, galerię i publiczną część `site-content`.

Oba warianty zwracają wyłącznie publiczne adresy Vercel Blob.

Historyczny projekt Vercel `backend` nie jest już źródłem dla nowych
konsumentów. Pozostaje tymczasowo jako ścieżka zgodności i zostanie wycofany po
okresie obserwacji.

## Dynamiczny frontend

Publiczne strony i panel Payload działają w jednej aplikacji `pznowak-cms`.
Strony `/`, `/pierscionki`, `/pierscionki/[slug]`, `/obraczki`, `/kreator`,
`/na-zamowienie`, `/naprawy`, `/pracownia`, `/realizacje` i `/kontakt` (nowy design Opus 5.5;
stare adresy `/katalog`, `/galeria`, `/o-nas` przekierowują). Katalog i galeria czytają opublikowane dane przez Payload Local API po stronie serwera.
Wyniki są buforowane pod tagami `products`, `gallery` i `site-content`.
Hooki Payload odświeżają odpowiednie tagi i ścieżki po publikacji, wycofaniu
lub usunięciu treści. Nie jest potrzebny eksport danych ani kolejny build.
`/products` pozostaje publicznym API dla zewnętrznych konsumentów.

## Środowiska i Vercel

- projekt `pznowak-cms`, root `cms`, uruchamia Payload i publiczne API;
- projekt `pznowak`, root repozytorium, pozostaje historycznym frontendem;
- projekt `backend` jest historycznym API zgodności;
- Preview CMS korzysta z gałęzi Neon `staging`;
- Production CMS nie jest aktywowany; sekretów produkcyjnych nie dodano;
- runtime CMS jest przypięty do `fra1`, blisko Neon `aws-eu-central-1`.

Staging ma ten sam schemat migracji co production. Pełny opublikowany katalog
kopiuje idempotentny mirror; domyślnie wykonuje tylko kontrolę:

```bash
npm run staging:mirror
npm run staging:mirror -- --check
npm run staging:mirror -- --apply
```

Źródło: ignorowany `backend/.env.local` (`NEON_BRANCH=production`), cel:
`backend/.env.staging.local` (`NEON_BRANCH=staging`). Odczyt źródła odbywa się
w jednej transakcji PostgreSQL `REPEATABLE READ READ ONLY`; zapis wyłącznie
przez Payload Local API na staging. Skrypt nie tworzy schematu ani migracji.
Kopiuje pliki do `cms/media-staging/`, zachowuje relacje i kolejność oraz sprawdza
HTTP 200 każdego medium. Powtórzenie nie tworzy ponownie istniejących plików
ani nie zapisuje niezmienionych rekordów. Kontrolowany produkt i galeria seed
pozostają szkicami; nie usuwa się ich plików. Inne nadmiarowe publikacje
powodują błąd weryfikacji, a nie automatyczne usuwanie.

Starsze media z `cms/media/` są na staging chronione przed edycją i usunięciem;
blokada działa także na Preview. Pliki nowo utworzone mają stagingowy prefiks.
Po przerwaniu mirroru można uruchomić go ponownie. Kopie Blob już przesłane
mogą pozostać po błędzie bazy; skrypt nie usuwa automatycznie żadnych obiektów.

Dane historycznych importów znajdują się w `../data/legacy/`. Kopie w root
`src/lib/collection.json` i `public/jewelry/` utrzymują działający stary frontend.
`staging:seed` służy tylko inicjalizacji pustego stagingu; nie uruchamiać go
na stagingu z pełnym katalogiem.

## Uzupełnienie treści po migracji

Skrypt sprawdza i uzupełnia galerię oraz globalną treść strony przez Payload
Local API. Domyślnie niczego nie zapisuje:

```bash
npm run content:check
npm run content:apply
```

W bazie pola `url` dwóch najstarszych rekordów mediów mogą pozostać relatywne
(`/api/media/file/...`). Jest to prawidłowy format magazynowy adaptera Payload;
publiczny odczyt zwraca dla nich adresy Vercel Blob, dlatego nie należy ich
naprawiać bez potwierdzonego błędu w API.

## Migracja historycznych filmów

Skrypt jest idempotentny i pozostaje w repozytorium na wypadek odtwarzania lub
kolejnego batcha:

```bash
npm run migrate:videos:check
npm run migrate:videos
```

Opcja `--delete-legacy` usuwa stare obiekty dopiero po potwierdzeniu kompletu
relacji oraz poprawnych odpowiedzi wszystkich nowych adresów:

```bash
npm run migrate:videos -- --delete-legacy
```

## Zgłoszenia z kreatora i formularza kontaktowego

`POST /api/zgloszenia` (logika w `src/lib/submissions/`) przyjmuje oba formularze: honeypot, minimalny
czas wypełnienia (podpisany token z `GET /api/zgloszenia?form=…`), walidacja serwerowa, Cloudflare Turnstile,
limit IP na godzinę i dzienny sufit (liczniki w tabeli `cms_limit_counters`). Zgłoszenie zapisuje się jako
szkic w kolekcji „Zgłoszenia”; wizualizację wydaje tylko `claimVisualization()` w granicach dziennego limitu.

- Zmienne: `cms/.env.example` (klucze Turnstile tylko w env; bez klucza witryny formularze nie wysyłają).
  Lokalnie i na Preview klucze testowe Cloudflare; Production: klucze widżetu pznowak.pl.
- Schemat: migracja `20261020_173112_etap2_zgloszenia` (`npx payload migrate` ze zmiennymi docelowej bazy).
- Testy na bazie stagingowej (prawdziwy Postgres i siteverify z kluczami testowymi):

```bash
npm run test:int:staging
npm run staging:cleanup-tests            # liczy zgłoszenia i liczniki testowe
npm run staging:cleanup-tests -- --apply # usuwa je
```

- E2E w wielu przeglądarkach na gotowym serwerze (WebKit to silnik Safari w wersji Playwrighta,
  nie prawdziwy Safari; Edge na Windows w workflow `.github/workflows/e2e.yml`, uruchamianym ręcznie):

```bash
E2E_BASE_URL=<adres> npm run test:e2e:cross
E2E_BASE_URL=<adres> E2E_CHANNEL=chrome npx playwright test --project=chromium --project=telefon
```

Uwaga: `getPayload` poza produkcją sam regeneruje `src/payload-types.ts`; bez `BLOB_READ_WRITE_TOKEN`
znikają pola wtyczki Blob (`prefix`, `_objectKey`) i build na Vercelu pada. Przed commitem sprawdź
`git diff src/payload-types.ts`.

## Kontrola jakości

```bash
npm run lint
npx tsc --noEmit
npm run test:int -- --run tests/int/public-products.int.spec.ts
```
