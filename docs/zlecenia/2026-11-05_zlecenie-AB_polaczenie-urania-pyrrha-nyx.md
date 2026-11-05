# Zlecenie AB – jeden fason zamiast trzech: Urania + Pyrrha + Nyx

Data: 05.11.2026 · Zleca: Marcin; pomysł Kamili 05.11 („ten sam pierścionek w różnych kolorach”) · Model: **Sonnet 5.5 high**. Gałąź od `main`, PR do `main`.
**Nazwa: Urania** (Kamila 05.11).

## Co jest
Trzy karty tego samego fasonu: `urania` (topaz błękitny, 4 media), `pyrrha` (rubin, 4 media), `nyx` (topaz London blue, 4 media) – każda z prawdziwymi zdjęciami i filmem.

## Do zrobienia
1. Karta docelowa (robocza `urania`): oryginał = topaz błękitny (zdjęcia Uranii). Warianty kamienia z **prawdziwych zdjęć**: „Rubin i diamenty” (media Pyrrhy), „Topaz London blue i diamenty” (media Nyx) – `isVisualization: false`, czyli bez plakietki „Wizualizacja”, w galerii jako „Zdjęcie”. Filmy wariantów: jeśli model danych pozwala na film per wariant – użyj; jeśli nie, zapisz w raporcie (nie rozbudowuj modelu bez pytania).
2. Opis karty: jeden, dla fasonu („ten sam fason wykonujemy z topazem, rubinem…”), w stylu zlecenia U; lead i SEO z nazwy fasonu.
3. Karty `pyrrha` i `nyx`: archiwizuj (`archived`), nie kasuj.
4. Przekierowania 308, **jeden skok**: `/pierscionki/pyrrha` → `/pierscionki/<nazwa>?kamien=rubin-i-diamenty`, `/pierscionki/nyx` → `…?kamien=topaz-london-blue-i-diamenty`; stare adresy z WordPressa (`/katalog/pierscionek-21`, `/ring/pierscionek-21`, `/katalog/pierscionek-18` …, tabela `docs/seo/przekierowania.md`) przepnij bezpośrednio na nowe adresy, bez łańcucha. Zaktualizuj tabelę.
5. Mapa strony bez `pyrrha` i `nyx`. „Podobne pierścionki” nie mogą wskazywać zarchiwizowanych kart.
6. Staging: skrypt w stylu `staging:warianty` / `staging:nazwy` (z `--apply`), opisany w raporcie.

## Ograniczenia
Bez generowania obrazów. Bez produkcji. W `KOLEJKA.md` wiersz AB → „do przeglądu Klaudii” + numer PR.
