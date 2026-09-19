# pznowak catalog API

Minimalny, niezależny backend katalogu przygotowany do osobnego wdrożenia na Vercelu.

## Zakres etapu 2

- `GET /health` potwierdza, że usługa działa.
- `OPTIONS /health` pozwala później łączyć się z API z innej domeny.
- Backend nie ma jeszcze bazy, produktów, zapisu danych, logowania, CMS, MCP ani WebMCP.

## Lokalna kontrola

```bash
npm test
```

Lokalny serwer Vercel można uruchomić poleceniem:

```bash
npm run dev
```
