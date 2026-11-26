# „Ten model”: zasady pisania

Teksty w `ten-model.json` trafiają na kartę jako akapit „O pierścionku {nazwa}” (pole `uniqueNote`) przez
`npm run staging:ten-model`. Zapora w `scripts/ten-model-logic.ts` pilnuje długości (80–120 słów), liczb z karty,
fraz z szablonu i podobieństwa do innych tekstów. Nie widzi zdjęć, więc poniższe trzeba sprawdzić samemu.

## Najpierw zdjęcia, potem tekst

Karty bliźniacze (ten sam fason, inny kamień albo rozmiar) łatwo pomylić także w galerii. 20.11.2026 tekst Ianthe
opisywał „ujęcie na dłoni”, które przedstawiało Iole.

Zanim napiszesz tekst dla karty:

1. Obejrzyj **każde** zdjęcie i film karty, nie tylko pierwsze. Sprawdź kształt kamienia (owal, oktagon, radiant),
   liczbę łapek, układ diamentów po bokach i kolor kamienia z pola „Kamień”.
2. Porównaj z kartą bliźniaczą. Zdjęcie z innego wpisu (inny `legacySourceUrl`, np. `fb:<inny post>` albo
   `seed://dlon/…`) traktuj jako podejrzane, dopóki nie potwierdzisz, że to ten sam pierścionek.
3. Jeśli coś nie pasuje, zgłoś to Marcinowi i **nie opisuj** tego zdjęcia. Tekst nie może opierać się na zdjęciu,
   które przypisano do złej karty.
4. Zdania o konkretnych ujęciach („na dłoni”, „na filmie”, „na zdjęciach widać…”) pisz tylko o mediach, które
   obejrzałeś. Bezpieczniej opisywać sam fason i kamień niż konkretne zdjęcie.

## Po zapisie

Otwórz każdą zmienioną kartę na pznowak.pl i przeczytaj akapit obok galerii.

## 26.11.2026: wszystkie opublikowane karty

Teksty dopisane dla pozostałych 44 kart (razem 50). Przed pisaniem obejrzane wszystkie zdjęcia każdej karty
(galeria i prawdziwe zdjęcia wariantów, bez wizualizacji), porównane z kartami bliźniaczymi. Filmów nie dało się
otworzyć, więc teksty ich nie opisują. Zrzut opisów kart użyty w teście: `stan-2026-11-26.json`.

Do sprawdzenia przez Marcina (teksty ich nie opisują):
- Hesperia, 2. zdjęcie (`od-kamili/IMG_0056.jpg`): kamień wygląda na dłuższy i brązowy, inny niż na pozostałych.
- Leucothea: wspólny opis mówi o dwunastu diamentach „wokół” kamienia, na zdjęciach diamenty są na szynie.
- Amphitrite: pole „Kolor złota” = białe, na zdjęciach szyna jest żółta (wierzch biały).
- Thalia: pole „Kamień” = szafir, wspólny opis = topaz London Blue.
- Rhodope: pole „Szlif” = owalny, na zdjęciach kamień jest okrągły.
