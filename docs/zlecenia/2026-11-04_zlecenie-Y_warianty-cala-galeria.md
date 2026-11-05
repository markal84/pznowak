# Zlecenie Y – wariant kamienia zmienia całą galerię (próbka: Cyane, Aion, Daphne)

Data: 04.11.2026 · Zleca: Marcin (spisała Klaudia po rozmowie z Michałem) · Model: **Opus 5.5 high** (zmiana modelu danych + UI), generowanie obrazów: **Codex headless** jak w zleceniu W.

## Po co

Michał (04.11): po kliknięciu koloru zmienia się dziś tylko główne zdjęcie, reszta galerii zostaje w oryginale — wygląda niespójnie. Chce: klik w kolor → **wszystkie zdjęcia** pierścionka w tym kamieniu, każde z dopiskiem „wizualizacja”; oryginał zostaje oryginałem, film zawsze prawdziwy. Docelowo cały katalog w 4 kolorach, ale **najpierw próbka na 3 pierścionkach**, potem partiami (limity).

## Zakres

1. **Model danych** (`cms/seed/warianty/warianty.json` + logika `warianty-v-logic.ts`): wariant ma listę obrazów (`files: [...]`) zamiast jednego `file`, po jednym na każde zdjęcie oryginalnej galerii, w tej samej kolejności. Zachowaj zgodność wstecz: stary `file` traktuj jak listę jednoelementową.
2. **Karta pierścionka**: wybór koloru podmienia całą galerię zdjęć (miniatury też). Film zostaje bez zmian. Każde przerobione zdjęcie ma widoczny znacznik „wizualizacja” (jak dziś) i `alt` z „(wizualizacja)”. Powrót do „Oryginał” przywraca prawdziwe zdjęcia.
3. **Obrazy – próbka**: Cyane, Aion, Daphne × 4 kolory: **szafir** (granatowy, jak obecny Aion – Michał: OK), **szmaragd** (**mniej nasycony** niż obecny – Michał: za bardzo nasycony; spokojna, naturalna zieleń), **rubin**, **biały diament (naturalny)**. Każdy kolor na wszystkich zdjęciach galerii. Kształt, oprawa, kruszec i tło bez zmian względem oryginału; zmienia się tylko kolor kamieni. Odrzucaj wyniki z artefaktami (przy białym diamencie już raz trzeba było poprawiać).
4. Istniejące warianty tych trzech pierścionków (topaz, niebieskie diamenty itd.) zostaw, ale też rozszerz na całą galerię albo oznacz w raporcie jako „tylko główne zdjęcie” — decyzja Marcina.
5. **Staging**: wgranie przez `staging:warianty` (z `--podmien-obraz` w razie poprawek). Bez produkcji.

## Ograniczenia

- Gałąź + PR do `main`, bez produkcji, bez zmian w innych pierścionkach.
- Limity: zanim wygenerujesz całość, zrób **jeden pierścionek × jeden kolor × wszystkie zdjęcia**, pokaż w raporcie, potem resztę.
- Nie obiecuj na stronie wysyłki miarek ani modeli 3D (stare ustalenia).

## Raport (opis PR)

Najpierw „Co trzeba zdecydować”, potem: liczba wygenerowanych obrazów i ile odrzucono, zestawienie miniatur oryginał vs 4 kolory dla każdego pierścionka, czy staging jest wgrany i link do podglądu gałęzi. Michał i Kamila dostaną link dopiero po merge do `main`.
