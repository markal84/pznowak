# Zlecenie X.2 – formularz kontaktowy: dokończenie po odpowiedziach Michała

Data: 05.11.2026 · Zleca: Marcin (spisała Klaudia) · Model: **Sonnet 5.5 high** (drobne, punktowe zmiany na istniejącej gałęzi).
Kontynuacja zlecenia X (`docs/zlecenia/2026-11-02_zlecenie-X_formularz-kontaktowy.md`). Pracuj na **tej samej gałęzi i PR**: `claude/festive-curie-21d291` / [#43](https://github.com/markal84/pznowak/pull/43). Nowej gałęzi nie zakładaj.

## Stan wyjściowy (04.11)

- PR #43 gotowy do przeglądu, **nie scalony**. Commity: cb80713 (kod), ce46734 (KOLEJKA), 1bc634a (.env.example). Pełny raport w opisie PR.
- `npm ci` na Macu: zrobione. Migracji bazy brak, na stagingu nic do uruchomienia.
- Decyzje Marcina (już w kodzie, nie zmieniać):
  1. Mail-potwierdzenie dla klienta: **niewdrożony**, na razie nie.
  2. Przy temacie „Naprawa” formularz nie pyta „Jak wolisz porozmawiać?” (`MEETING_TOPICS`, `cms/src/lib/submissions/options.ts`).

## Do zrobienia

1. **Wysyłka gotowej biżuterii – Michał potwierdził 04.11: TAK, kurierem.**
   - `HERO_TRUST` w `cms/src/lib/site.ts` („Zamówienia wysyłamy do klientów w całej Polsce”, `confirmed: true`) zostaje.
   - Na `/na-zamowienie` jest żółte `[Do potwierdzenia: rozmowy wideo i wysyłka gotowej biżuterii.]`. Wysyłkę uznaj za potwierdzoną (np. „Gotową biżuterię wysyłamy kurierem.”); **rozmowy wideo nadal niepotwierdzone** – zostaw tylko tę część jako `DoUzupelnienia`.
   - Nadal **nie** proponuj wysyłki miarek/obrączek do przymiarki (ustalone 01.11).
2. **Czas odpowiedzi – Michał 04.11: „tego samego dnia roboczego”.**
   `RESPONSE_TIME` w `cms/src/lib/site.ts` zmień na: „Odpowiadamy zwykle tego samego dnia roboczego.” Popraw testy, które sprawdzają stary tekst.
3. **`cms/.env.example` – duplikaty.** `SUBMISSIONS_NOTIFY_TO` (l. ~19), `SITE_ENV` (~42) i `SITE_URL` (~44) już są wyżej, więc **usuń dopisane na końcu komentarze** z tymi trzema nazwami (l. ~66–68). Jeśli coś z nich jest wartościowe (np. „ustawić już przy `next build`; wyłącza klucze testowe Turnstile”), przenieś to do istniejącego komentarza przy zmiennej. Placeholdery typu `PAYLOAD_SECRET=REPLACE_...` zostają.
4. **E2E na preview.** Uruchom workflow „E2E na preview” na podglądzie gałęzi (testy z prawdziwym Turnstile nie przeszły w chmurze, bo Cloudflare był zablokowany). Jeśli z chmury dalej nie da się dosięgnąć Cloudflare, nie obchodź tego – zapisz w raporcie, że test trzeba puścić z Maca, i podaj dokładną komendę.
5. **KOLEJKA.md:** wpis X → „X.2 – do przeglądu Klaudii”, z numerem PR #43.

## Poza zakresem (już mają osobne PR-y – nie ruszaj)

- Mapa na `/kontakt` i `/pracownia` przy 320–412 px → **PR #45**.
- Kolekcja `users` bez reguły `create` → **PR #44** (`access.create: isAdmin`).

## Notatka na przeprowadzkę na MyDevil (tylko do raportu, nic nie wdrażaj)

- `SITE_ENV=production` (także przy `next build`), `SITE_URL=https://pznowak.pl`.
- `SMTP_HOST/PORT/USER/PASS/FROM` + `SUBMISSIONS_NOTIFY_TO` – bez nich maile nie wychodzą.
- `CLIENT_IP_HEADER`: `cf-connecting-ip`, gdy DNS idzie przez Cloudflare; inaczej `x-forwarded-for` + `CLIENT_IP_PROXY_HOPS=1`. Po pierwszym zgłoszeniu sprawdzić w logu „[zgloszenia] nagłówki adresu klienta: …”; „NIEODCZYTANY” = do zmiany.
- Cron raz na dobę (dopiero po włączeniu zdjęć): `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://pznowak.pl/api/zgloszenia/zalaczniki/sprzatanie`.

## Ograniczenia

- Bez produkcji, bez merge, bez maili do ludzi (testy na transporcie testowym), bez zakładania kont u dostawców poczty.
- Tylko punkty 1–5. Inne żółte miejsca na stronie (ceny, terminy, kamienie, asortyment) czekają na odpowiedzi Michała – nie zgaduj ich.

## Raport

Dopisz w opisie PR #43 sekcję „X.2”: co zmienione (punkty 1–5), wynik E2E na preview, co zostało dla Marcina. Krótko.
