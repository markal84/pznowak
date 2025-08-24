# UI Refresh – Plan i Checklista (gałąź: feature/ui-refresh)

## Stack i wersje (z package.json)
- Next: 15.2.4 (Turbopack)
- React / React DOM: ^19.0.0
- Tailwind CSS: ^4.1.3
- @tailwindcss/postcss: ^4.1.5
- Tailwind Plugins: aspect-ratio ^0.4.2, forms ^0.5.10, typography ^0.5.16
- Inne: yet-another-react-lightbox ^3.23.0

Uwagi implementacyjne:
- Tailwind v4: zachowujemy standardowe klasy narzędziowe; tokeny kolorów/spacingu/radiusu zdefiniujemy jako zmienne i mapowania w theme (zgodnie z v4).
- Budowanie/dev: `npm run dev-turbo` (port wg logu 3006), build: `npm run build`.

## Kierunek projektowy (skrót)
- Estetyka premium, spokojna, czytelna. Baza: biel/kość słoniowa + ciepłe szarości/grafit; akcent „złoto” (zatwierdzony).
- Typografia: nagłówki Playfair Display, treść Lato; wyraźna hierarchia.
- UX: prostota nawigacji, jednoznaczne CTA, przewidywalna siatka i breakpoints.
- Dostępność: focus states, kontrast AA, obsługa klawiatury.
- Dark mode: wdrażamy równolegle, zgodnie z preferencjami systemu (prefers-color-scheme); light/dark w parze.

## Checklista prac

### 1) Design tokens (kolory, typografia, spacing)
- [x] Kolory brand (złoto), neutrals (szarości/grafit), stany (hover/focus)
- [x] Paleta dark (tła, teksty, obramowania, stany) – dopasowana 1:1 do light
- [x] Skala typografii (H1–H6, lead, body, small) + wagi
- [x] Spacing: sekcyjny rytm (`--space-section-sm/md/lg`)
- [ ] Container widths (sm/md/lg/xl)
- [x] Radius (8px – zatwierdzony) i cienie (shadow-sm/md/lg)
- [x] Animacje (150–200ms, ease), focus ringi

### 2) Komponenty bazowe
- [x] Button (primary/secondary/tertiary; sm/md/lg; full-width opcjonalnie)
- [x] Card (produkt/galeria: obraz, tytuł, meta, hover)
- [x] SectionTitle / Eyebrow (nagłówki sekcji)
- [x] Container (max-w, padding responsywny)
- [ ] Input / Select / Textarea (stany: focus/invalid/disabled)
- [ ] Badge/Tag (opcjonalnie do metadanych)
- [ ] Warianty dark dla wszystkich powyższych

### 3) Layout i nawigacja
- [x] Header: aktywne linki (aria-current + styling), sticky, stan mobile (menu overlay)
- [ ] Footer: kolumny linków, kontakt, prawa autorskie
- [ ] Siatki: ogólna siatka sekcji, przerwy między blokami

### 4) Strony kluczowe
- [ ] Home: hero, skróty do katalogu, highlighty
- [ ] Katalog: siatka kart, filtry (UI), paginacja/ładowanie
- [ ] Produkt: galeria + szczegóły
- [x] Produkt: CTA kontakt/zapytanie (spójny Button, centered)
- [ ] Galeria: spójne karty + lightbox, paginacja (infinite/load more)
- [ ] O nas: sekcje kotwic (intro/mission/craft) + timeline
- [ ] Kontakt: formularz, dane, mapa (opcjonalnie)

### 5) Interakcje i stany
- [x] Aktywne linki w nawigacji
- [ ] Hover/focus states, pressed (globalnie)
- [ ] Skeletony/placeholdery (ładowanie kart i obrazów)
- [ ] Subtelne motion (transform/opacity, prefer-reduced-motion)

### 6) Dostępność i responsywność
- [ ] Kontrast AA (tekst/CTA/stan nieaktywny)
- [ ] Focus visible i kolejność tab-stop
- [ ] Responsywność: 360 / 768 / 1024 / 1280 (real test na localhost:3006)
- [ ] Dark mode respektuje prefers-color-scheme (bez przełącznika lub z opcją nadpisania później)

### 7) Wydajność i porządki
- [ ] `next/image` i preloading kluczowych assets
- [ ] Prefetch krytycznych tras (linki)
- [ ] Redukcja zbędnych klas/stylów, porządek w CSS

### 8) Dostarczenie
- [ ] PR: opis zmian, migawki, lista wpływów

## Notatki i decyzje
- Akcent kolorystyczny (złoto): `#B8860B` / `#BFA181` – zatwierdzone.
- Grafit/neutrals: użyjemy odcieni w okolicach `#111827` / `#374151`.
- Radius: 8px – zatwierdzony.
- Dark mode: robimy od razu; domyślnie zgodny z ustawieniami systemu.

## Postęp (aktualizowany)
- [x] Utworzono gałąź `feature/ui-refresh`
- [ ] Tokens
- [ ] Komponenty bazowe
- [ ] Layout
- [ ] Strony
- [ ] Interakcje
- [ ] A11y/Responsive
- [ ] Wydajność
- [ ] PR

### Następny krok (po tej sesji)
- [x] Wdrożyć `Container` i `SectionTitle` na stronie głównej
- [x] Lekkie odświeżenie `Header`/`Footer` dla spójności (kolory, spacing, hover/focus)
