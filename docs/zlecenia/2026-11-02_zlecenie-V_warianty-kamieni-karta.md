# Zlecenie V – karta pierścionka: „Zamów z innym kamieniem” (warianty z wizualizacjami) + poprawka Leto

Data: 02.11.2026 · Zleca: Marcin (spisała Klaudia, prośby Kamili z 01.11) · Model: Sonnet 5.5 high.
Jedna sesja, bez subagentów. W chmurze: `_ZASADY-GIT.md` → „Sesja w chmurze”. Gałąź `feat/warianty-kamieni` od `origin/main`.

## Dlaczego
Kamila: „Mamy główny model, ale pod spodem dodajemy możliwość zamówienia z innym kamieniem, np. z ametystem, szafirem,
topazem… i te wizualizacje jak najbardziej autentyczne.” Klient chce widzieć, co zamawia. Michał dobiera kamień u dostawcy
według dostępności, więc wariant to **propozycja do rozmowy**, nie produkt z magazynu. Cel strony bez zmian: zapytanie
o pierścionek (formularz /kontakt), nie koszyk.

## Co zrobić
1. **Payload, kolekcja `products`** – nowa zakładka „Inne kamienie”, pole `stoneVariants` (array, opcjonalne):
   - `stone` (text, wymagane) – np. „Szmaragd i diamenty”, „Topaz London blue”.
   - `swatch` (select, wymagane) – kolor kółka: `zielony`, `niebieski`, `granatowy`, `jasnoniebieski`, `fioletowy`,
     `czerwony`, `rozowy`, `bialy` (+ hex w kodzie). Te same nazwy co filtr kolorów katalogu, jeśli się pokrywają.
   - `image` (upload → media, wymagane) i `alt` (text).
   - `isVisualization` (checkbox, domyślnie **true**) – false tylko dla prawdziwego zdjęcia wykonanego pierścionka.
   Migracja Payload w repo (bez uruchamiania na stagingu/produkcji – patrz niżej). Dostęp publiczny jak reszta produktu.
2. **Karta `/pierscionki/[slug]`** – pod galerią i parametrami sekcja „Zamów z innym kamieniem” (tylko gdy są warianty):
   - rząd kółek-kolorów z nazwą kamienia (dostępne z klawiatury, `aria-pressed`); pierwsze kółko = oryginał.
   - kliknięcie podmienia **główne zdjęcie** na obraz wariantu (bez przeładowania; URL `?kamien=<slug>` do udostępnienia,
     działa też przy wejściu z linku) i nazwę kamienia w parametrach na „<kamień> (na zamówienie)”.
   - na obrazie wariantu z `isVisualization` stała etykieta w rogu „Wizualizacja”, w stylu istniejących etykiet
     („Kierunek sesji · wizualizacja AI” / `tag-corner`). Pod rzędem kółek jedno zdanie:
     „Wizualizacje pokazują kolor kamienia; gotowy pierścionek może różnić się detalami. Dostępność kamienia potwierdza pracownia.”
   - przycisk „Zapytaj o ten pierścionek” przenosi wybrany kamień: `/kontakt?projekt=<nazwa>&kamien=<kamień>`, a formularz
     wpisuje go do treści/tematu (dziś przenosi tylko `projekt`).
   - na liście `/pierscionki` bez zmian (nie mnożymy kafelków); opcjonalnie mała kropka „+N kolorów” na kafelku – tylko
     jeśli mieści się w obecnym designie bez nowego wiersza.
3. **Dane strukturalne:** wariantów nie dodawaj jako osobnych `Offer`/produktów (to nie towar z ceną). Bez zmian w SEO poza tym,
   że `?kamien=` ma `canonical` na kartę bez parametru.
4. **Skrypt na staging** `npm run staging:warianty` (podgląd domyślnie, zapis z `--apply`), czyta
   `cms/seed/warianty/warianty.json` (format: `[{ "slug", "variants": [{ "stone", "swatch", "file", "alt", "isVisualization" }] }]`),
   wgrywa obrazy z `cms/seed/warianty/obrazy/` do Media i ustawia `stoneVariants`. Idempotentny (ponowne uruchomienie nie dubluje).
   Na start w JSON tylko **Aion** (eternity, id 46 na stagingu) z trzema obrazami od Kamili (`docs/zlecenia/materialy/2026-11-01_kamila/`):
   - `eternity-rozowy-szafir-diamenty.png` → „Różowy szafir i diamenty”, `rozowy`
   - `eternity-szmaragd-diamenty.png` → „Szmaragd i diamenty”, `zielony`
   - `eternity-diamenty-biale.png` → „Białe diamenty”, `bialy`
   (oryginał Aion: diamenty niebieskie na przemian z białymi; wszystkie trzy to wizualizacje). Obrazy przytnij do proporcji
   galerii (czarne pasy z góry/dołu to zrzut z telefonu – usuń), zapisz jako webp ≤ 300 KB.
5. **Poprawka danych Leto** (ten sam skrypt albo osobna flaga): kamień „Morganit różowy i diamenty” (było „kamień różowy”);
   alt zdjęć i kolor w filtrze → różowy. Potwierdzone przez Kamilę 01.11 (boczne kamienie to diamenty).

## Czego nie robić
- Nie generuj wizualizacji w tym zleceniu – robi je osobny proces (zlecenie W, Codex). Tu tylko mechanizm + 3 gotowe obrazy.
- Bez koszyka, cen, „dostępne od ręki”. Bez zmian w obrączkach i /realizacje.

## Sprawdzenie
- Test e2e: karta Aion na podglądzie – 4 kółka, klik podmienia zdjęcie i pokazuje „Wizualizacja”, `?kamien=` działa z linku,
  link „Zapytaj” niesie kamień, formularz go pokazuje. Karta bez wariantów – sekcji nie ma.
- Zrzuty 1440×900 i 375×812 (Aion po kliknięciu szmaragdu). Lint, tsc, testy.
- Raport w opisie PR, na górze „Do uruchomienia na Macu”: migracja stagingu + `npm run staging:warianty -- --apply`.
  W `KOLEJKA.md` V → „do przeglądu Klaudii”. Produkcja – stop.
