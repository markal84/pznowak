# Zlecenie Y.2 – wizualizacje tylko w wycinku kamienia (biały diament) + podpis filmu przy wariancie

Data: 05.11.2026 · Zleca: Marcin (spisała Klaudia) · Model: **Opus 5.5 high** + Codex headless (lokalnie na Macu – Codex i staging).
Gałąź od `main` (Y #46 i Z #48 już scalone), PR do `main`.

## Po co
1. **Biały diament** w Y prawie zawsze odpada: maska różnicy w `cms/scripts/wizualizacje-w-logic.ts` nie odróżnia białego kamienia od białych odblasków w fasetach, a weryfikacja (akceptuj/odrzuć) odrzuca próby. Brakuje: biały diament na większości zdjęć Cyane, rubin i biały diament Aion.
2. **Kamila 05.11:** po wyborze innego koloru film w Cyane dalej pokazuje oryginalny niebieski kamień i to myli. Filmu nie przemalowujemy (klatki „pływałyby” kolorem).

## Do zrobienia
1. **Generowanie w wycinku:** zanim poprosisz Codex o obraz, wyznacz obszar kamienia na **oryginale** (maska kamienia środkowego, lekko poszerzona), generuj/podmieniaj tylko ten wycinek, a resztę kadru wklejaj z oryginału piksel w piksel. Weryfikacja ma sprawdzać: (a) poza maską brak zmian (próg), (b) w masce zmienił się kolor zgodnie z kamieniem. Dla bieli kryterium „jasny, bezbarwny, z ogniem”, nie „różnica względem oryginału”. Opisz w raporcie, jak wyznaczasz maskę (automatycznie czy z ręcznej podpowiedzi).
2. **Dogrywka na tej technice:** Cyane – biały diament na wszystkich zdjęciach karty; Aion – rubin i biały diament (pamiętaj: oryginał Aion to klatka z filmu – jeśli wynik jest słaby, nie przyjmuj na siłę, zapisz w raporcie).
3. **Film przy wariancie:** gdy wybrany jest inny kamień niż oryginał, film zostaje, ale z widocznym podpisem na miniaturze i w odtwarzaczu: „Film: oryginał (<kamień oryginału>)”, np. „Film: oryginał (diament niebieski)”. Przy „Oryginał” bez podpisu. Test e2e.
4. **Dopisek pod wyborem kamienia (Kamila 05.11, na każdej karcie z wariantami):** krótka, profesjonalna informacja, np. „Wizualizacje pokazują kolor kamienia. Kamienie naturalne różnią się między sobą odcieniem i blaskiem – przed zamówieniem pokażemy Ci zdjęcie lub film kamienia, który dla Ciebie wybierzemy.” Jeden tekst w jednym miejscu (stała), mały druk pod kółkami.
5. Staging: `staging:warianty` (z `--podmien-obraz` przy poprawkach).

## Ograniczenia
Bez produkcji. Bez zmian kółek (to Z). Limit: najpierw 1 pierścionek × biały diament × wszystkie zdjęcia, ocena w raporcie, potem reszta. W `KOLEJKA.md` wiersz Y.2 → „do przeglądu Klaudii” + numer PR. Raport: liczba prób / przyjętych / odrzuconych per kamień.
