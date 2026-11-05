# Zlecenie AA – warianty kamieni, partia 1 (8 fasonów, 2 zdjęcia na kolor)

Data: 05.11.2026 · Zleca: Marcin; lista od Kamili 05.11 (zrzuty: `docs/od-kamili/2026-11-05/`, lokalnie) · Model: **Sonnet 5.5 high** + Codex headless, lokalnie na Macu.
**Start dopiero po scaleniu Y.2** (technika wycinka kamienia). Gałąź od `main` po Y.2, PR do `main`.

## Fasony (jeden wyraźny kamień środkowy, 3–5 prawdziwych zdjęć)
Maia (tanzanit) · Delos (szafir) · Pelagia (szafir) · Athena (szmaragd) · Aria (ametyst) · Ianthe (ametyst) · Erythea (turmalin różowy) · Merope (turmalin różowy).

## Kolory (te same co w Y)
Szafir granatowy · szmaragd (spokojniejszy, jak w Y) · rubin · biały diament. **Pomijaj kolor, który jest już oryginałem** (Athena bez szmaragdu; Delos i Pelagia bez szafiru granatowego, jeśli oryginał to granatowy szafir – sprawdź na zdjęciu).

## Zakres na fason
- **2 obrazy na kolor:** 1. zdjęcie karty + jedno inne ujęcie (najlepiej z boku / pod kątem; wybierz najostrzejsze prawdziwe zdjęcie, **nigdy klatkę z filmu**). Reszta galerii przy wariancie: tylko te 2 obrazy + film z podpisem „Film: oryginał (…)” (z Y.2).
- Technika i weryfikacja z Y.2 (zmiana tylko w wycinku kamienia).
- Dane do `cms/seed/warianty/warianty.json`, opisy/alty jak w Y, `isVisualization: true`.

## Limit i kolejność
Najpierw Maia × 4 kolory × 2 obrazy → krótki raport z miniaturami → dopiero potem reszta partii. Przy ponad 3 odrzuceniach z rzędu na jednym kolorze: przerwij ten kolor, zapisz w raporcie.

## Ograniczenia
Bez produkcji, staging przez `staging:warianty`. Bez zmian kodu (chyba że błąd – wtedy osobny commit z opisem). W `KOLEJKA.md` wiersz AA → „do przeglądu Klaudii” + numer PR. Raport: tabela fason × kolor (przyjęte / odrzucone / brak) + miniatury oryginał vs warianty.
