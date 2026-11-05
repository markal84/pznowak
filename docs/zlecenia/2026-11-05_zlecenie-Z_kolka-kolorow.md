# Zlecenie Z – kółka kolorów kamieni: bez dubli na jednej karcie

Data: 05.11.2026 · Zleca: Marcin (wyłapała Klaudia na telefonie) · Model: **Haiku 5.5 high**.
**Gałąź od `feat/warianty-cala-galeria` (zlecenie Y, PR #46), nie od `main`** – Y zmienia te same pliki i dodaje migrację. PR do `main`, scalany dopiero **po #46**.

## Problem (podgląd Y, 375 px)
Na jednej karcie dwa kółka mają prawie ten sam kolor i klient nie wie, które jest które:
- **Topaz London blue** i **Szafir granatowy** – oba `granatowy` (#1E2A55) – Cyane, Daphne.
- **Oryginał Daphne (turmalin oliwkowy)** i **Szmaragd** – oba `zielony` (#2F6B4F): `originalSwatch()` w `cms/src/lib/stone-variants.ts` wrzuca „oliwk” do zielonego.

## Do zrobienia
1. W `SWATCHES` (`cms/src/lib/stone-variants.ts`) dodaj dwa kolory:
   - `londonblue` – „London blue”, ciemny niebiesko-morski, np. **#1F5A6E** (wyraźnie inny od granatowego i niebieskiego).
   - `oliwkowy` – „Oliwkowy”, np. **#7C7A2F** (wyraźnie inny od zielonego i żółtego).
   Sprawdź kontrast kółek na tle karty i od siebie nawzajem (wzrokowo na zrzucie 375 px).
2. `originalSwatch()`: `oliwk|oliwin|peridot` → `oliwkowy` (szmaragd/zielony/chryzopraz/awenturyn zostają `zielony`); `topaz london|london` → `londonblue` (granatowy/tanzanit zostają `granatowy`). Kolejność reguł i komentarz popraw tak, żeby remis dalej rozstrzygał się dobrze.
3. Pole `swatch` w `Products` bierze opcje z `SWATCHES`, więc nowe wartości wymagają **migracji** (`npx payload migrate:create`) – dodaj ją; nic poza nowymi wartościami listy.
4. Dane: w `cms/seed/warianty/warianty.json` warianty „Topaz London blue…” → `swatch: "londonblue"`; wgraj na staging (`staging:warianty`) po `payload migrate` na stagingu.
5. Przejdź wszystkie karty z wariantami i wypisz w raporcie, czy na którejkolwiek nadal są dwa kółka tego samego koloru (wraz z oryginałem). Nie poprawiaj na ślepo – tylko lista.
6. Testy: `originalSwatch` dla „Turmalin oliwkowy” → `oliwkowy`, „Topaz London blue” → `londonblue`, „Szmaragd” → `zielony`, „Szafir granatowy” → `granatowy`.

## Ograniczenia
Bez zmian w obrazach, tekstach i układzie. Bez produkcji. Migracja tylko na stagingu; w raporcie dopisz ją do listy „Przed startem produkcji”. W `KOLEJKA.md` dodaj wiersz Z (nie ma go jeszcze) ze statusem „do przeglądu Klaudii” + numer PR.
