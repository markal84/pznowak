# Zlecenie H – powtarzalny proces: posty FB/IG → przegląd → katalog na stronie

Data: 26.10.2026 · Zleca: Marcin (spisała Klaudia) · Wykonawca: Claude Code
**Model: Opus 5.5, effort high** (architektura i decyzje; implementację kolejnych etapów można dać Sonnetowi 5.5 high)
Podstawa: zlecenia G i G2 (raporty obok), PR #15. **Etap 1 to wyłącznie plan i raport. STOP przed implementacją.**

## Po co
Wstępna selekcja z FB jest zatwierdzona i proces się sprawdził. Teraz ma się stać rutyną, a nie jednorazową akcją:
co tydzień nowe posty Michała (FB, potem także IG) → przegląd z decyzjami → nowe pierścionki w katalogu na stronie.
Cel za celem: Michał dostaje zapytania o pierścionki i **nie przepisuje sam postów** na stronę.

Źródła zdjęć, w kolejności preferencji:
1. Oryginały od Michała (folder iCloud/Google Drive, jeśli zacznie wrzucać) – najlepsza jakość.
2. FB i/lub IG – gdy folderu nie ma. Jakość „pod www” wystarcza: strona potrzebuje ok. 2000 px na dłuższym boku,
   nie plików do druku.

## A. Łączenie kart (brakuje dziś)
- Przycisk „to ten sam pierścionek” jest tylko przy parach wykrytych automatycznie. Dodać **ręczne „połącz z kartą…”**
  (lista kart z miniaturą) dla wszystkich kart Nowe / Do decyzji.
- Znany przypadek od Marcina: **karta 31 „ETERNITY: kamienie kolorowe i brylanty” i karta 10 „Obrączka eternity
  z różowymi szafirami”** – ta sama obrączka jest na zdjęciu (31) i w filmie (10). Zaproponować w UI jako
  połączenie do potwierdzenia, nie łączyć samodzielnie.
- Jeśli Marcin wpisze w notatce „= karta N”, potraktować to jak propozycję połączenia.

## B. Weryfikacja wizualna tam, gdzie hash nie daje rady
dHash nie łączy zdjęcia z filmem nagranym pod innym kątem (przykład wyżej). Plan dwustopniowy:
1. **Claude (vision)** przegląda pary kandydatów: karty o podobnych tytułach/kamieniach, zdjęcie ↔ klatki filmów
   (więcej niż 3 klatki na film), i zwraca: ten sam / inny / niepewne + jedno zdanie uzasadnienia.
2. **Tylko „niepewne”** idą do **headless Codex z modelem Astra 6** (wybór Marcina: mocny w vision i rozpoznaniu
   przestrzennym). Sprawdź w dokumentacji Codex CLI aktualny sposób uruchamiania bez interakcji i przekazywania
   obrazów – nie zgaduj flag; jeśli się nie da, opisz w raporcie.
- Wynik to **wyłącznie propozycje** widoczne w przeglądzie (plakietka „model: prawdopodobnie ten sam – 85 %”
  + uzasadnienie). Decyzję podejmuje Marcin. Żaden model nie zmienia `selection.json`.
- Policz i podaj w raporcie koszt/czas na pełny przebieg (~200 postów) i na tygodniowy przyrost.

## C. Eksport → import do CMS
- Z `catalog-selection.json` do kolekcji produktów w Payload (`cms/`). Najpierw przeczytaj obecny model danych
  katalogu i sposób zapisu mediów (w tym Vercel Blob / `_objectKey`).
- Zdjęcia: przeskalowanie pod www (np. 2000 px, WebP/JPEG, bez EXIF z lokalizacją), okładka pierwsza.
- **Tryb „na sucho” najpierw:** raport, co zostanie utworzone/zmienione, bez zapisu. Potem import na stagingu.
  Produkcja tylko po akceptacji Marcina.
- Idempotentnie: drugi import tych samych danych nic nie dubluje (klucz: `post_id` + plik). Istniejących produktów
  nie nadpisywać bez potwierdzenia; uzupełnienia galerii (`galleryAdditions`) jako osobny, jawny krok.
- Opisy: szkic z tekstu posta (kamień, karaty, metal, certyfikat), oznaczony jako szkic do zatwierdzenia przez
  Michała/Kamilę. Nic nie idzie publicznie bez ich OK.

## D. Cotygodniowa synchronizacja FB/IG
- Pobieranie przyrostowe: tylko posty nowsze niż ostatni eksport; stare decyzje i pliki zostają.
- Źródło docelowe: **Meta Graph API** (strona FB + konto IG), gdy Marcin dostanie dostęp w Meta Business Suite
  (sprawa otwarta). Do tego czasu obecna metoda (przeglądarka Marcina) jako tryb zapasowy. Opisz oba, z ryzykami
  (blokady, wygasające linki CDN – media pobierać od razu).
- Nowe posty pojawiają się w przeglądzie jako sekcja „Nowe od DD.MM” i przechodzą przez G2 (hash) i B (vision).
- Duplikaty FB↔IG (ten sam post w obu miejscach) łączyć automatycznie tylko przy pewnym dopasowaniu.

## E. Małe GUI do całości
Najprościej: zakładka „Proces” w istniejącym serwerze przeglądu (127.0.0.1:3011), bez nowych frameworków:
`Pobierz nowe posty` → `Przelicz podobieństwa` → `Weryfikacja modelem` → `Otwórz przegląd` → `Eksport` →
`Import na sucho` → `Import na staging`. Każdy krok pokazuje stan, czas ostatniego uruchomienia i log; kroki
z kosztem (modele) i z zapisem (import) wymagają kliknięcia potwierdzenia. Jeśli uznasz, że osobna aplikacja ma
przewagę – uzasadnij w raporcie.

## Etap 1 – co oddać (bez kodu)
Raport `2026-10-26_zlecenie-H-raport.md`:
- schemat przepływu danych i plików (co gdzie leży, co w gicie, co nie);
- decyzje do podjęcia przez Marcina z rekomendacją (Graph API vs przeglądarka, gdzie trafia import, jak wołany
  jest Codex/Astra 6, kiedy włączać model);
- podział na etapy wdrożenia (A–E), każdy osobno testowalny i odwracalny, z szacunkiem pracy;
- czego nie wiesz i co trzeba sprawdzić.

## Czego nie robić
- Nie zmieniać decyzji w `selection.json`; nie ruszać `media/`, `frames/`, `data/legacy/`; nie commitować `data/`.
- Nie importować niczego do CMS-a w Etapie 1. Bez pushowania do `main`/`release`.
- Nie zapisywać tokenów Meta ani kluczy w repo – tylko `.env*` (nie czytać ich treści).
