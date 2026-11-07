# Opinie Google na stronie

Sekcja opinii jest na stronie głównej (`/`, tytuł „Opinie z Google”) i w Realizacjach (`/realizacje`, „Opinie klientów”).
Dane są w **jednym pliku**: `cms/src/lib/opinie-google.json`. Kod i style się przy aktualizacji nie zmieniają.

## „Zaktualizuj sekcję z opiniami Google”

1. Marcin wkleja zrzut wizytówki (średnia i liczba opinii) i listy opinii z panelu menedżera.
2. W `opinie-google.json` zmienić:
   - `srednia` (np. `4.7`, kropka dziesiętna) i `liczbaOpinii`,
   - `stanNa` (data zrzutu, `RRRR-MM-DD`) i miesiąc w `notatka` („stan na listopad 2026”),
   - `opinie`: 3–4 opinie z oceną 4–5 **z tekstem**. Tekst przepisany słowo w słowo (bez poprawiania literówek i
     polskich znaków; najwyżej bez emotek). `data` = miesiąc i rok („listopad 2026”), `autor` jak w Google.
   - Długie opinie można dać: na stronie przycina je CSS po 7 liniach (pełny tekst zostaje w HTML).
3. Testy: `npx vitest run --config ./vitest.config.mts tests/int/placeholders.int.spec.ts tests/int/google-reviews.int.spec.ts`
   (placeholders sprawdza m.in. tekst „15 opinii w Google” – przy innej liczbie poprawić to oczekiwanie).
4. Gałąź + PR jak zwykle.

Nie wybierać tylko najkrótszych „Polecam!”: najlepiej działają opinie, które mówią, co pracownia zrobiła
(naprawa, pierścionek, czas, obsługa). Średnia i liczba zawsze z całej wizytówki, nigdy wyliczone z wybranych.

## Później: automat (Places API)

Kod jest gotowy (`src/lib/google-places.ts`, `google-reviews-source.ts`), uśpiony bez zmiennych
`GOOGLE_PLACES_API_KEY` i `GOOGLE_PLACE_ID`. Decyzja 07.11.2026: wdrożyć dopiero po starcie strony. Wtedy:
konto rozliczeniowe w Google Cloud (Marcin je odpiął), tylko „Places API (New)” włączone, klucz ograniczony do
tego API, limit w Quotas, `npm run google:place-id`, zmienne w Vercelu. Plik JSON zostaje jako zapas.
