# Zlecenie W – wizualizacje kamieni (Codex headless): próbka dla Kamili

Data: 02.11.2026 · Zleca: Marcin (spisała Klaudia) · Wykonawca: ChatGPT Codex w trybie headless (decyzja Marcina).
Najpierw **próbka**, ocenia Kamila; całość katalogu dopiero po jej akceptacji kolorów (osobne uruchomienie).

## Zasada nadrzędna
Zmieniamy **tylko kolor i charakter kamienia głównego** (i ewentualnie kamieni bocznych, jeśli wariant tego wymaga).
Oprawa, szlif, liczba i rozmiar kamieni, metal, kadr, tło, światło, odbicia, ostrość – **bez zmian**. Lepiej odrzucić obraz,
niż oddać ładny, ale z innym pierścionkiem. Każdy obraz trafi na stronę z etykietą „Wizualizacja”.

## Wzorce kolorów (autentyczność – prośba Kamili)
Kolor bierz z **prawdziwych zdjęć pracowni** z naturalnymi kamieniami, nie z wyobraźni modelu: karty katalogu z ametystem
(np. Ianthe, Iole), szafirem, szmaragdem, rubinem, topazem – listę wzorców (slug + plik) zapisz w raporcie. Brak wzorca
dla któregoś kamienia = napisz to, nie zgaduj. Naturalne kamienie są lekko nieidealne: szmaragd głęboko zielony, nie
neonowy, nie „szkło butelkowe”; London blue ciemny, stalowo-granatowy; topaz jasnoniebieski (sky/swiss) wyraźnie jaśniejszy.

## Próbka
- **Cyane** (`/pierscionki/cyane`, oryginał: diament niebieski + diamenty, halo): rubin, biały diament, szafir,
  topaz jasnoniebieski, topaz London blue (Kamila potwierdziła oba topazy roboczo – w raporcie zaznacz).
- Jeden fason z owalem lub oktagonem z katalogu (wybierz z kamieniem kolorowym) w pełnej szóstce Kamili: szmaragd, szafir,
  ametyst, rubin, topaz jasnoniebieski, topaz London blue – żeby Kamila zobaczyła inny szlif.
- Wejście: zdjęcie główne karty (najlepsza jakość z mediów stagingu albo eksportu FB, `data/facebook`).

## Wynik
- `cms/seed/warianty/obrazy/<slug>-<kamien>.webp` (te same proporcje co oryginał, ≤ 300 KB) + wpisy do
  `cms/seed/warianty/warianty.json` w formacie ze zlecenia V (`isVisualization: true`).
- Arkusz porównawczy `cms/seed/warianty/podglad-<data>.html`: oryginał obok każdego wariantu, podpis kamienia –
  Klaudia wyśle go Kamili (zrzut lub link do podglądu).
- Raport: ile prób na obraz, co odrzucone i dlaczego (zmieniona oprawa, liczba kamieni, artefakty), koszt/limity, jeśli widać.

## Stop
Bez publikacji na stagingu/produkcji (to robi skrypt z V po akceptacji Kamili). Bez wysyłania czegokolwiek Kamili.
