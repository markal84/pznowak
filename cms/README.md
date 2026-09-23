# PZ Nowak CMS

Panel Payload zarządza pierścionkami, zdjęciami i filmami. Dane relacyjne są
przechowywane w Neon PostgreSQL, a pliki w publicznym Vercel Blob pod prefiksem
`cms/media`.

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
Strony `/`, `/katalog`, `/katalog/[slug]`, `/galeria`, `/o-nas` i
`/kontakt` czytają opublikowane dane przez Payload Local API po stronie serwera.
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

Staging ma ten sam schemat migracji co production, ale tylko kontrolowany zestaw
jednego produktu i jednej pozycji galerii. Polecenia są idempotentne:

```bash
npm run staging:check
npm run staging:seed
```

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

## Kontrola jakości

```bash
npm run lint
npx tsc --noEmit
npm run test:int -- --run tests/int/public-products.int.spec.ts
```
