# Design – fundament przeglądu strony (zasady ogólne)

Data: 25.10.2026 · Ustalił: Marcin, spisała Klaudia · Status: kierunek przyjęty, szczegóły strona po stronie
Punkt odniesienia: podgląd `main` (pznowak-cms-git-main…vercel.app) vs obecna pznowak.pl.
To nie jest zlecenie do wykonania w całości – to zasady, do których odwołują się kolejne zlecenia per strona/sekcja.

## Cel nadrzędny
Michał ma dostawać zapytania o pierścionki, a nie przepisywać posty. Każda sekcja przechodzi test:
**czy klient po jej obejrzeniu wie, co kliknąć, żeby wysłać zapytanie?** Pytanie kontrolne przy każdej decyzji:
co zrobiłby najlepszy projektant sklepu jubilerskiego – nie „który wariant ładniejszy”.

## 1. Mniej tekstu, obraz prowadzi
- Strona jest przegadana; tekst zlewa się w ściany, zwłaszcza na desktopie.
- Tam, gdzie zdjęcia/ikony/kształty grają główną rolę (np. „Jak powstaje pierścionek”), układ już działa – to wzorzec.
- Hero zostaje informacyjne, w obecnej skali (stara strona ma hero przerośnięte – nie wracamy do tego).

## 2. Nagłówek sekcji – koniec wzoru „tytuł z lewej, akapit z prawej”
- Obecnie ~11 ręcznie wklejonych wierszy `row` z `h2` po lewej i `p.text` po prawej (strona główna, pracownia,
  na zamówienie, naprawy, realizacje) + `BandTypes` na obrączkach. Akapit „wisi” w prawym górnym rogu,
  nie wiadomo, do czego należy, nie jest wyróżniony.
- Zastąpić jednym komponentem nagłówka sekcji: tytuł + opcjonalny krótki wstęp **pod** tytułem, jedna kolumna,
  wąska miara. Wstęp tylko wtedy, gdy coś wnosi; w przeciwnym razie wypada (treść może trafić na podstronę).

## 3. Cena i wezwanie do działania jako jeden blok
- Ceny/placeholdery `[X] zł` nie mogą być zwykłą linijką w akapicie. Cena + przycisk = jeden wyraźnie wydzielony
  element (np. obrączki: „Od [X] zł za parę” + „Umów przymiarkę”), nie przycisk wciśnięty między ściany tekstu.
- „Z czym możesz do nas przyjść”: cztery kolumny tytuł + 2 zdania + cena + link = za dużo równorzędnego tekstu.
  Kierunek: kafelki z ikoną/zdjęciem, tytuł, jedno zdanie, link; ceny na podstronach.

## 4. Ikony
- Obecne SVG (np. lista napraw) są za słabe i niespójne. Potrzebny jeden zestaw w stylu ilustracji z „Jak powstaje
  pierścionek” (cienka linia, grafit + złoty akcent) – ta sekcja jest wzorcem stylu.
- Jeden komponent/plik ikon zamiast SVG rozsianych inline po stronach.

## 5. Subtelny ruch (motion)
- Brakuje interaktywności i motion designu, ale **bez** zoom-in/zoom-out całych sekcji.
- Kierunek: drobne rzeczy – ikona, która lekko „ożywa” na hover/focus (np. błysk kamienia, obrót ringu, rysowanie
  linii), delikatne pojawienie się elementów przy przewijaniu, płynne podkreślenia linków, lekkie przesunięcie
  zdjęć w kartach. Ruch ma podkreślać rzemiosło (precyzja, połysk), nie bawić.
- Technicznie: najpierw CSS + IntersectionObserver, biblioteka tylko gdy uzasadniona. Obowiązkowo
  `prefers-reduced-motion`; nic nie może przesuwać układu (CLS) ani spowalniać telefonu.

## 6. Pracownia (desktop)
- Strona jest rozwlekła: duże puste przestrzenie wypełnione ogromnymi datami (`.year-big`), które odstają od
  reszty designu. Kierunek: zwarta oś czasu, daty w skali reszty typografii, zdjęcia i tekst bliżej siebie.

## Kolejność dalszej pracy
Strona po stronie, w razie potrzeby sekcja po sekcji: najpierw główna, potem obrączki, pracownia, naprawy itd.
Każdy etap = osobne zlecenie na gałęzi od `main`, PR do `main`, podgląd do akceptacji; `release` dopiero po decyzji.
