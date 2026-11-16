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
- Preview CMS korzysta z żywej bazy (gałąź Neon `production`, endpoint `ep-nameless-butterfly`);
- Production CMS na Vercelu nie jest aktywowany; produkcja strony działa na MyDevil;
- runtime CMS jest przypięty do `fra1`, blisko Neon `aws-eu-central-1`.

### Bazy Neon (od 17.11.2026)

| Gałąź Neon | Co to jest | Plik na Macu | Kto używa |
|---|---|---|---|
| `production` (domyślna) | **żywa baza** pznowak.pl, endpoint `ep-nameless-butterfly` | `backend/.env.production.local`, `NEON_BRANCH=production` | MyDevil, panel Vercel Preview, skrypty treści, kopie na Hetznerze (`live.env`) |
| `archiwum-2026-11` | stara baza sprzed przeprowadzki (34 karty), endpoint `ep-frosty-queen` | `backend/.env.local` (= `cms/.env.local`), `NEON_BRANCH=archiwum` | lokalny `npm run dev`, kopia na Hetznerze (`database.env`) |

Do 16.11.2026 żywa gałąź nazywała się `staging`, a archiwum `production`. Nazwy skryptów `staging:*` zostały z tamtych
czasów, ale skrypty działają na żywej bazie: `cms/scripts/db-guard.ts` wymaga `NEON_BRANCH=production` **i** endpointu
żywej bazy (`scripts/live-db.ts`). Uruchamiać je najpierw bez `--apply` (podgląd).

Dane testowe (`staging:check`, `staging:seed`, `staging:cleanup-tests`, `test:int:staging`) czytają
`backend/.env.test.local` i działają tylko na osobnej gałęzi z `NEON_BRANCH=test`; na żywej bazie odmawiają. Takiej
gałęzi dziś nie ma. Skrypt `staging:mirror` usunięto: kopiował archiwum na żywą bazę.

Nowe zdjęcia z panelu na Vercel Preview trafiają do `cms/media-staging/`, z MyDevil i ze skryptów treści do
`cms/media/` (`src/lib/staging-media.ts`). Oba prefiksy są w tej samej żywej bazie.

Dane historycznych importów znajdują się w `../data/legacy/`. Kopie w root
`src/lib/collection.json` i `public/jewelry/` utrzymują działający stary frontend.

## Magazyn mediów: Vercel Blob albo Cloudflare R2

Zdjęcia i filmy katalogu (kolekcja `media`) są domyślnie w publicznym magazynie Vercel Blob. Zmienna
`MEDIA_STORAGE` przełącza magazyn (`src/lib/media-storage.ts`):

| `MEDIA_STORAGE` | Magazyn | Wymagane zmienne |
|---|---|---|
| puste / `vercel-blob` | Vercel Blob (jak dotąd) | `BLOB_READ_WRITE_TOKEN` |
| `r2` | Cloudflare R2 (API S3) | `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` |

- Adres pliku jest wyliczany przy każdym odczycie z pól `prefix` i `filename`, a nie z kolumny `url` w bazie.
  Dlatego przełączenie nie wymaga zmian w bazie, tylko zmiennej i ponownego zbudowania (`R2_PUBLIC_URL` trafia też
  do listy hostów `next/image` w `next.config.mjs`).
- **Przed przełączeniem na `r2`** wszystkie pliki z Vercel Blob muszą być skopiowane do bucketu pod tymi samymi
  kluczami (`cms/media/...`, `cms/media-staging/...`), a bucket musi mieć publiczną domenę z `R2_PUBLIC_URL`.
- Powrót: `MEDIA_STORAGE=vercel-blob` i ponowne zbudowanie. Pliki dodane w panelu trafiają tylko do aktualnie
  wybranego magazynu, więc po powrocie trzeba je dograć do drugiego.
- Wysyłanie plików w panelu: przy Vercel Blob prosto z przeglądarki; przy R2 domyślnie przez serwer aplikacji.
  `R2_CLIENT_UPLOADS=1` włącza wysyłanie prosto do R2 (wymaga reguły CORS bucketu dla adresu strony; potrzebne
  na Vercelu, gdzie żądanie do funkcji ma limit 4,5 MB).
- `src/app/(payload)/admin/importMap.js` zawiera komponenty wysyłania obu magazynów; `payload generate:importmap`
  zostawia tylko aktywny, więc drugi wpis trzeba przywrócić (pilnuje tego test `media-storage`).
- Skrypty `staging-mirror`, `bootstrap-catalog-content`, `migrate-legacy-videos` oraz zdjęcia od klientów
  (`src/lib/attachments/storage.ts`) nadal działają wyłącznie na Vercel Blob.

## MyDevil (produkcja poza Vercelem)

Produkcja `https://pznowak.pl` działa na MyDevil (FreeBSD, Node 24, Phusion Passenger); Vercel zostaje jako
podgląd. Pliki: `scripts/mydevil/`.

- `app.cjs`: start pod Passengerem. W `~/domains/<domena>/public_nodejs/app.js` jeden wiersz:
  `require('/usr/home/<konto>/pznowak-cms-prod/cms/scripts/mydevil/app.cjs')`.
- `build.sh`: `next build --webpack` przez systemowy Node (konto nie wykonuje plików z katalogu domowego, więc bez
  `cross-env` i `node_modules/.bin`), `TMPDIR` w katalogu klonu, limit pamięci 3,5 GB, `BUILD_CPUS=2`.
- `deploy.sh <domena> [gałąź]`: `git pull` (fast-forward) → `npm ci --ignore-scripts` → build → `devil www restart`.
- `cron-sprzatanie.sh`: odpowiednik zadania z `vercel.json` (wpis do `crontab` w nagłówku pliku).

Zasady:

- FreeBSD nie ma natywnego kompilatora SWC: `@next/swc-wasm-nodejs` w `optionalDependencies` musi mieć **dokładnie
  tę samą wersję co `next`** (zmienne `NEXT_TEST_WASM*` ustawiają skrypty). Po każdej aktualizacji `next` build na
  MyDevil jest pierwszym testem.
- Konfiguracja to `next.config.mjs` (zwykły JS). Pliki `.ts`, które importuje (`src/lib/indexing.ts`,
  `legacy-redirects.ts`, `seo.ts`, `site.ts`), wczytuje sam Node z usuwaniem typów: importy między nimi muszą mieć
  rozszerzenie `.ts` i nie mogą używać składni wymagającej kompilacji (`enum`, aliasy `@/`).
- Zmienne w `cms/.env.production.local` (prawa 600, poza repozytorium): `SITE_ENV=production` i
  `SITE_URL=https://pznowak.pl` już przy budowaniu, `CLIENT_IP_HEADER=cf-connecting-ip` (ruch przez Cloudflare),
  `SMTP_*`, `CRON_SECRET`; **bez** `NEON_BRANCH` i bez zmiennych `VERCEL*`.
- Na serwerze nie uruchamiać `payload migrate` ani seedów.

## SEO i indeksowanie

- **Indeksowanie** włącza wyłącznie `SITE_ENV=production` (zapasowo `VERCEL_ENV=production`). Poza produkcją
  strony mają `noindex` (meta, nagłówek `X-Robots-Tag`, `robots.txt` z `Disallow: /`). Zmienna musi być ustawiona
  już podczas `next build` (część stron i `robots.txt` powstaje przy budowaniu).
- `SITE_URL` (domyślnie `https://pznowak.pl`) to adres w `rel=canonical`, `sitemap.xml` i Open Graph; podglądy też
  wskazują na adres produkcyjny.
- **Przekierowania** starych adresów: `src/lib/legacy-redirects.ts` (źródło prawdy), tabela i opis w
  [`../docs/seo/przekierowania.md`](../docs/seo/przekierowania.md). Po zmianie: `npm run seo:redirects-doc`.
- **Tytuły i opisy** podstron: `pageMetadata()` w `src/lib/seo.ts`, treść w plikach stron. Pierścionki: zakładka
  „SEO” w panelu (wtyczka `@payloadcms/plugin-seo`); puste pola uzupełnia `src/lib/product-seo.ts`.
- Dane strukturalne (JewelryStore) i mapa strony: `src/lib/structured-data.ts`, `src/app/sitemap.ts`.

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

### Zdjęcia od klientów (Zlecenie B, przełącznik `ATTACHMENTS_ENABLED`)

Formularz kontaktowy może przyjmować do 5 zdjęć (JPG, PNG, WebP, HEIC). Logika: `src/lib/attachments/`.

- Zgłoszenie zapowiada pliki (`attachments: [{ size }]`); odpowiedź 201 niesie jednorazowe bilety (15 min),
  wydawane dopiero po honeypocie, czasie, walidacji, Turnstile i limitach. Każdy plik idzie osobno
  (`POST /api/zgloszenia/zalaczniki`, do 4 MB; przeglądarka wcześniej zmniejsza duże zdjęcia).
- Serwer rozpoznaje typ po zawartości, sprawdza wymiary przed dekodowaniem i zapisuje wyłącznie obraz
  zakodowany od nowa jako JPEG (bez EXIF/GPS) w **prywatnym** magazynie Vercel Blob
  (osobny magazyn: `ATTACHMENTS_BLOB_STORE_ID` z panelu Vercela albo `ATTACHMENTS_BLOB_READ_WRITE_TOKEN`).
  Podgląd tylko w panelu
  (`/api/zgloszenia/zalaczniki/[id]`, sesja administratora lub redaktora).
- Kwarantanna, wyczerpany limit plików albo brak magazynu: zgłoszenie bez zdjęć, klient dostaje prośbę o e-mail.
- Sprzątanie raz na dobę (`vercel.json` → `crons`, wymaga `CRON_SECRET`): porzucone przesyłania, retencja
  (6 miesięcy bez „Zachowaj zdjęcia”), pliki bez wiersza w bazie. Usunięcie zgłoszenia usuwa też zdjęcia.
- Schemat: migracja `20261021_182906_zlecenie_b_zalaczniki`. Lokalnie bez magazynu w chmurze:
  `ATTACHMENTS_STORAGE=local` (pliki w `cms/.zalaczniki-lokalne/`).
- Testy: `tests/int/attachments-*.int.spec.ts` (staging w `npm run test:int:staging`), e2e
  `tests/e2e/zalaczniki.e2e.spec.ts` z `E2E_ATTACHMENTS=on` i panel `zalaczniki-panel.e2e.spec.ts`
  (`E2E_PANEL=staging`, zakłada i usuwa tymczasowego redaktora).

Uwaga: `getPayload` poza produkcją sam regeneruje `src/payload-types.ts`; bez `BLOB_READ_WRITE_TOKEN`
znikają pola wtyczki Blob (`prefix`, `_objectKey`) i build na Vercelu pada. Przed commitem sprawdź
`git diff src/payload-types.ts`.

## Kontrola jakości

```bash
npm run lint
npx tsc --noEmit
npm run test:int -- --run tests/int/public-products.int.spec.ts
```
