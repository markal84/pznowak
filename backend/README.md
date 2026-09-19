# pznowak catalog API

Minimalny, niezależny backend katalogu przygotowany do osobnego wdrożenia na Vercelu.

## Dostępne endpointy

- `GET /health` potwierdza, że usługa działa.
- `GET /products` zwraca trzy losowe produkty z kontrolowanej migawki katalogu.
- `GET /products?limit=5` pozwala zmienić liczbę wyników w zakresie od 1 do 10.
- `OPTIONS` pozwala łączyć się z API z innej domeny.

Backend nie ma jeszcze bazy, zapisu danych, logowania, CMS, MCP ani WebMCP.

## Lokalna kontrola

```bash
npm test
```

Lokalny serwer Vercel można uruchomić poleceniem:

```bash
npm run dev
```
