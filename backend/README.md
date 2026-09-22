# pznowak catalog API

Historyczny, niezależny backend katalogu wdrożony osobno na Vercelu.

Nowi konsumenci powinni używać kanonicznego endpointu Payload:
`https://pznowak-cms.vercel.app/products`. Ten katalog pozostaje tymczasowo dla
zgodności i narzędzi utrzymaniowych; nie należy dodawać tu nowej logiki
publikacji.

## Dostępne endpointy

- `GET /health` potwierdza, że usługa działa.
- `GET /products` zwraca trzy losowe opublikowane produkty z tabel Payload CMS w Neon PostgreSQL.
- `GET /products?limit=5` pozwala zmienić liczbę wyników w zakresie od 1 do 10.
- `OPTIONS` pozwala łączyć się z API z innej domeny.

Backend ma wyłącznie publiczny odczyt z bazy. Zapis, logowanie i zarządzanie
produktami są obsługiwane przez osobną aplikację Payload w katalogu `cms`.

## Konfiguracja bazy

Sekrety produkcji znajdują się w `.env.local`, sekrety gałęzi staging w
`.env.staging.local`, a lokalny kontekst Neon w `.neon`. Wszystkie te pliki są
wykluczone z Gita. Wymagane nazwy zmiennych są opisane w `.env.example`;
prawdziwych wartości nie należy kopiować do repozytorium.

Na Vercelu `DATABASE_URL` dla środowiska Preview wskazuje na gałąź Neon
`staging`, a zmienna dla Production na gałąź `production`. Migracje i importy
korzystają z bezpośredniego `DATABASE_URL_UNPOOLED`; działające API korzysta z
połączenia puli `DATABASE_URL`.

Docelową strukturę katalogu i dane z `src/lib/collection.json` przygotowuje na
staging:

```bash
npm run db:setup:staging
```

Polecenie jest powtarzalne. Tworzy lub aktualizuje tabele produktów, mediów,
galerii i historii importów, a następnie importuje 34 opublikowane produkty,
133 przypisane media oraz 11 elementów galerii bez dublowania produktów.

Repozytorium zawiera wyłącznie 34 opublikowane produkty. Nie zawiera treści 17
produktów oczekujących i jednego szkicu widocznych wcześniej w WordPressie;
te rekordy wymagają osobnego eksportu z uwierzytelnionego panelu i nie są
odtwarzane z domysłów.

## Media katalogu

Zdjęcia i filmy produktów są zarządzane przez Payload i przechowywane w
publicznym Vercel Blob pod prefiksem `cms/media`. Publiczny backend odczytuje
główne zdjęcia z relacji `cms_products_media` → `cms_media`; nie korzysta z
adresów WordPressa ani home.pl.

Migrację mediów uruchamia:

```bash
npm run media:migrate:staging
```

To historyczne polecenie służy wyłącznie do odtworzenia starego stagingowego
importu. Bieżące media należy dodawać przez Payload. Sekret
`BLOB_READ_WRITE_TOKEN` jest przechowywany w ignorowanym pliku `.env.local` i
nie trafia do repozytorium.

## Backup bazy na VPS

Skrypt `ops/backup-neon.sh` tworzy skompresowany backup przez bezpośrednie
połączenie `DATABASE_URL_UNPOOLED`, sprawdza go poleceniem `pg_restore --list`
i usuwa kopie starsze niż 30 dni. Na VPS jest uruchamiany codziennie przez cron.

Sekret połączenia znajduje się wyłącznie na serwerze w pliku
`/home/marcin/.config/pznowak-backup/database.env` z uprawnieniami `600`.
Kopie trafiają do `/home/marcin/backups/pznowak-neon` i nie są częścią repozytorium.
Przy odtwarzaniu kopii do innego serwera należy użyć opcji
`pg_restore --no-owner --no-privileges`, ponieważ neonowy właściciel bazy nie
musi istnieć w docelowej instancji PostgreSQL.

## Lokalna kontrola

```bash
npm run check
```

Lokalny serwer Vercel można uruchomić poleceniem:

```bash
npm run dev
```
