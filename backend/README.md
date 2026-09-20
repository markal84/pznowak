# pznowak catalog API

Minimalny, niezależny backend katalogu przygotowany do osobnego wdrożenia na Vercelu.

## Dostępne endpointy

- `GET /health` potwierdza, że usługa działa.
- `GET /products` zwraca trzy losowe opublikowane produkty z Neon PostgreSQL.
- `GET /products?limit=5` pozwala zmienić liczbę wyników w zakresie od 1 do 10.
- `OPTIONS` pozwala łączyć się z API z innej domeny.

Backend ma obecnie wyłącznie publiczny odczyt z bazy. Nie ma jeszcze zapisu danych,
logowania, CMS, MCP ani WebMCP.

## Konfiguracja bazy

Sekrety lokalne znajdują się w `.env.local`, a lokalny kontekst Neon w `.neon`.
Oba są wykluczone z Gita. Wymagane nazwy zmiennych są opisane w
`.env.example`; prawdziwych wartości nie należy kopiować do repozytorium.

Po połączeniu katalogu z projektem Neon strukturę i dane testowe przygotowują:

```bash
npm run db:setup
```

Polecenie jest powtarzalne: tworzy brakującą tabelę i aktualizuje osiem rekordów
testowych bez ich dublowania.

## Lokalna kontrola

```bash
npm run check
```

Lokalny serwer Vercel można uruchomić poleceniem:

```bash
npm run dev
```
