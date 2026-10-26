# Zlecenie I: raport (strona główna)

Data: 2026-10-26. Gałąź `feat/strona-glowna` (od `origin/main`), PR do `main`. Nic nie trafiło do `main` ani `release`.

- **PR / preview:** link w opisie PR (uzupełniony po wdrożeniu preview).
- **Zrzuty:** `2026-10-26_zlecenie-I-zrzuty/przed/` i `…/po/` (główna 1440 i 390, hero 1440 i 390, kafelki w spoczynku, po najechaniu i z fokusem). Zrzuty nie są w gicie (jak przy poprzednich zleceniach), leżą obok raportu.
- Zrzuty „po” są z podglądu (znaczniki „do uzupełnienia” widoczne, żółte). Wersję produkcyjną (bez znaczników) sprawdziłem osobno na buildzie z `VERCEL_ENV=production`.

## Co zmienione

**Kolejność strony głównej:** Hero → Wybrane pierścionki (4) → Z czym możesz do nas przyjść → Jak powstaje pierścionek → Opinie z Google → Pracownia od 1890 → Zanim przyjdziesz + panel pracowni.

### Hero
- Główny przycisk: **„Zapytaj o pierścionek”** → `/kontakt`. „Umów rozmowę o projekcie” zostało tylko w „Jak powstaje…”.
- **Całe zdjęcie jest linkiem** do karty pierścionka z hero (jeden `<a>`, bez zagnieżdżonych linków; etykieta z nazwą jest podpisem wewnątrz niego). Nazwa dla czytnika ekranu: „Pierścionek Phoebe – zobacz szczegóły”. Na komputerze: lekkie przybliżenie zdjęcia i podkreślenie nazwy pod wskaźnikiem, wyraźny fokus (złota obwódka 3 px).
- **Linijka zaufania** pod przyciskami (mała, szara, bez ikon), z konfiguracji `HERO_TRUST` w `src/lib/site.ts`. Na produkcji jest dziś jedna pozycja: „Zamówienia wysyłamy do klientów” (potwierdzone postami). „Rozmowa o projekcie także przez wideo” i „gotowy zwykle w [TERMIN]” mają `confirmed: false`: na podglądzie widać je jako znaczniki, na produkcji ich nie ma. Po potwierdzeniu wystarczy przestawić flagę.

### Wybrane pierścionki (4)
- **Nowe pola w Payloadzie (kolekcja Pierścionki, pasek boczny):** „Na stronie głównej” (`featuredOnHome`) i „Kolejność na stronie głównej” (`homeOrder`, widoczne po zaznaczeniu pierwszego). Michał/Marcin zaznaczają pierścionki w panelu; zapis odświeża stronę główną (istniejące odświeżanie po zmianie pierścionka).
- Logika (`src/lib/home.ts`, `pickHomeRings`): zaznaczone wg `homeOrder` (przy remisie wg kolejności katalogu), **bez pierścionka z hero**, maksymalnie 4. Gdy zaznaczono mniej niż 4 (albo nic), brakujące miejsca uzupełnia dawna lista `HOME_RINGS` (Phoebe, Harmonia, Athena, Nyx, Pyrrha…), żeby w rzędzie nie było dziury. Bez zaznaczeń: Harmonia, Athena, Nyx, Pyrrha (Phoebe jest w hero).
- Siatka: 4 w rzędzie na komputerze, 2 × 2 poniżej 960 px (telefon). „Wszystkie pierścionki (N)” zostaje pod siatką.
- **Migracja** `20261026_111856_strona_glowna_wybrane` (dwie kolumny + indeks w `cms_products` i `_cms_products_v`, wartości domyślne `false`/`0`, więc istniejące wiersze się nie zmieniają). Procedura jak przy poprzednich zleceniach: wygenerowana `payload migrate:create`, na **stagingu zastosowana, cofnięta (`migrate:down`) i zastosowana ponownie**. Z migracji i zrzutu usunąłem wiersz o domyślnym prefiksie mediów, który generator dopisał, bo działał na zmiennych stagingu. **Na produkcji nieuruchomiona**: przed wdrożeniem w `cms/` ze zmiennymi produkcji `npx payload migrate:status`, potem `npx payload migrate`. Bez tego strona na produkcji nie odczyta katalogu.
- Uwaga: migracja jest już na stagingu, więc inne gałęzie preview, które nie mają jej w kodzie, dalej działają (kolumny tylko doszły).

### Kafelki „Z czym możesz do nas przyjść”
- Usunięta szara kreska (`inset box-shadow`). W spoczynku czysty kafelek (papier na tle strony).
- **Wybrałem jedno rozwiązanie: cienka złota linia (2 px) rośnie od lewej do prawej** (`::before`, `transform: scaleX`, 0,45 s) po najechaniu i po fokusie. Dlaczego: złoty akcent miał być na hover (z Waszej uwagi), a rosnąca linia dodaje ruchu bez przesuwania układu (tylko `transform`, brak CLS) i nie zmienia tła pod tekstem. Ikony ożywają jak dotąd (zlecenie F), więc nie dokładałem drugiego efektu.
- Telefon: kafelek jest kompletny bez hover (zrzut `kafelki-spoczynek-390.png`); całość klikalna (`.tl::after`, bez zmian).
- `prefers-reduced-motion`: globalna reguła wyłącza przejścia, linia pojawia się od razu, sam kolor (sprawdzone w teście przeglądarkowym).
- Inne podstrony: `.tile` (także `.dark .tile`) występuje wyłącznie na stronie głównej, więc nic więcej nie ma do ujednolicania. Wariant `.dark .tile` miał tę samą szarą kreskę; usunąłem ją i dałem mu złotą linię w tym samym wzorze (dziś nieużywany). Pozostałe kreski u góry (`.item-rule`, `.quote`, `.review`) to linie nad kolumnami tekstu, nie kafelki, więc zostają.

### Opinie z Google
- `src/lib/reviews.ts`: lista opinii (autor, treść, ocena, data, link), podsumowanie (średnia, liczba, link „zobacz wszystkie w Google”) i miejsce na zdanie o źródle opinii (`sourceNote`). Komponent: `GoogleReviews.tsx`. **Nic nie jest pobierane z Google ani przez API; wizytówki nie ruszałem.**
- **Średnia i liczba opinii są obowiązkowe**: sekcja na produkcji pokazuje się tylko, gdy są i opinie, i podsumowanie (test: same cytaty bez podsumowania nie wychodzą na produkcję).
- Pusta konfiguracja (dziś): preview pokazuje placeholder „Tu będą 3–4 opinie z Google – wybiera Marcin…”, produkcja nie renderuje sekcji.
- Brak `sourceNote` = znacznik „do potwierdzenia” na podglądzie, nic na produkcji. Nie dodałem JSON-LD z oceną (opinie o własnej firmie nie kwalifikują się w Google do wyróżnień).
- Ta sama sekcja jest użyta w „Realizacjach” (zastąpiła tam trzy placeholdery cytatów).

### Pracownia od 1890
- Dwie sekcje („Cztery pokolenia…” i „Biżuteria z historią…”) zastąpione jedną: zdjęcie Mieczysława w pracowni (lata 80.), trzy zdania, linki „Poznaj historię pracowni” → `/pracownia` i „Naprawy i przeróbki” → `/naprawy`. Lista czterech pokoleń usunięta z głównej (zostaje w `/pracownia`). Tekst: „Od 1890 roku fach przechodzi w rodzinie Nowaków z ojca na syna: od kowala z Szańca, przez Stanisława i Mieczysława, po Michała. Pierścionki, które Mieczysław projektował w latach 80., do dziś wracają do nas na renowację. Z tą samą uwagą zajmiemy się pierścionkiem po babci.” Fakty z `FAMILY` i strony Pracownia; nic nowego nie dopisałem. Zniknął link „Zobacz realizacje” (nie było go na liście w zleceniu).

### Znaczniki „do uzupełnienia” (pkt 7)
- **Mechanizm:** `src/lib/placeholders.ts` (`showPlaceholders()`, `byEnv(podgląd, produkcja)`, `findPlaceholders(html)`) i komponent `DoUzupelnienia` (`<DoUzupelnienia fallback={…}>`). Poza produkcją wyróżniony znacznik (żółte tło, przerywana obwódka), na produkcji `fallback` (domyślnie nic). „Produkcja” to ta sama reguła co indeksowanie (`SITE_ENV` albo `VERCEL_ENV` = `production`, `src/lib/indexing.ts`).
- Komponenty kliencki (formularze) nie znają środowiska, więc dostają tekst w propsie z serwera.
- **Test:** `tests/int/placeholders.int.spec.ts` renderuje główną, katalog, karty pierścionków, obrączki, na zamówienie, naprawy, realizacje, pracownię, kontakt (także z tematem „nowy”) i stopkę: przy `production` (obie zmienne) w HTML nie może być żadnego `[…]` ani `data-todo`; przy podglądzie i lokalnie znaczniki muszą być. Do tego logika wybranych pierścionków i opinii (11 testów).
- **Skrypt kontrolny:** `npm run check:placeholders -- <adres>` pobiera strony z działającego serwera i kończy się błędem, jeśli znajdzie znacznik. Sprawdzone na buildzie z `VERCEL_ENV=production` (`✓` dla głównej, katalogu, 6 kart, obrączek, na zamówienie, napraw, realizacji, pracowni i kontaktu); ten sam skrypt na podglądzie zgłasza znaczniki, jak ma być.

Lista miejsc i zachowanie na produkcji (podgląd: bez zmian, ze znacznikiem):

| Strona | Co było | Na produkcji |
| --- | --- | --- |
| Główna, FAQ „Ile kosztuje…” | „od [X] zł… [X–Y] zł” | zdanie z cenami pominięte, reszta odpowiedzi zostaje |
| Główna i Na zamówienie, wstęp „Jak powstaje” | „mija zwykle [TERMIN…]” | zdanie pominięte |
| Główna, panel pracowni | „…inne [asortyment do potwierdzenia]” | „Na miejscu jest też sklep z gotową biżuterią.” |
| Pracownia, „Odwiedź pracownię” | to samo o sklepie | „Przy pracowni działa sklep z gotową biżuterią.” |
| Pracownia | film + „Od Michała” (placeholdery) | cała sekcja pominięta |
| Pracownia | „[Mapa Google…]” | pominięte |
| Obrączki, blok ceny | „od [X] zł za parę” + notka | sam przycisk „Umów przymiarkę” |
| Obrączki, FAQ przymiarka | „[TERMIN]” | zdanie pominięte |
| Obrączki, „Obrączki z pracowni” | 3 placeholdery zdjęć | cała sekcja pominięta |
| Obrączki, rodzaje | brak zdjęcia / opis „Klasyczne” | brak ramki zdjęcia / brak akapitu |
| Na zamówienie, blok ceny | „zwykle [X–Y] zł” | same przyciski |
| Na zamówienie, FAQ | 3 pytania z placeholderami | pytanie o koszt rozmowy pominięte; w dwóch pozostałych tylko część po kropce |
| Na zamówienie, karta zlecenia | „Budżet: [kwota od klienta]” | „Do omówienia w rozmowie” |
| Pierścionki (katalog) | przywieszka „od [X] zł” | pominięta |
| Karta pierścionka | „[do uzupełnienia]”, „[próba…]”, „[TERMIN]”, „od [X] zł” | brak wiersza przy pustym kamieniu/metalu, bez próby, „Ustalamy przy zamówieniu”, „Wycena przed rozpoczęciem pracy” (to zdanie jest już w FAQ) |
| Karta (wariant szczegółowy) | „od [cena] zł” | pominięte |
| Naprawy | „[czas]”, „[cena] zł”, „[ok. X minut…]” | „po obejrzeniu” / „po wycenie” (jak przy renowacji), „Dojście” pominięte; nagłówek „Co robimy” zamiast „…i ile to trwa” |
| Realizacje | wyróżniona realizacja, „Przed i po”, opisy kart, opinie | na produkcji bez wyróżnionej (jej zdjęcie idzie do siatki), bez „Przed i po”, bez opisów kart, opinie przez `GoogleReviews`; wstęp bez zdania „Przy każdej piszemy…” |
| Kontakt, pole Budżet | „[przedział 1–3]” | pole ukryte (serwer dalej przyjmuje domyślne „Jeszcze nie wiem”) |
| Kontakt i kreator, zgoda | „…Polityka prywatności [wkrótce]” | bez tej końcówki; **ta sama treść trafia do zapisu zgłoszenia** (`src/lib/submissions/consent.ts`) |
| Stopka | „Polityka prywatności [wkrótce]”, „Regulamin [wkrótce]” | pominięte |
| Kreator (wyłączony) | „[X–Y] zł” | pominięte |

## Weryfikacja
- `tsc --noEmit` i ESLint (0 błędów; 33 ostrzeżenia, jak wcześniej: nieużyte argumenty w migracjach).
- `next build --webpack` z `VERCEL_ENV=production` (staging): OK; `check:placeholders` na tym buildzie: wszystkie strony czyste.
- Testy int: 328 przeszło, 29 pominiętych; jeden plik (`api.int.spec.ts`) wymaga lokalnego Postgresa (127.0.0.1:5432) i nie działa u mnie, tak samo bez moich zmian.
- E2E (`frontend.e2e.spec.ts`, chromium + telefon, serwer lokalny z bazą stagingową, `E2E_SUBMISSIONS=off`): 60 przeszło, 10 pominiętych (kreator/konfigurator wyłączone). Trzy nowe testy: klik w zdjęcie hero prowadzi do karty (jeden link, bez zagnieżdżonych), „Zapytaj o pierścionek” → `/kontakt` i cztery karty bez pierścionka z hero, kafelek bez złotej linii w spoczynku i z linią po najechaniu.
- Klik w zdjęcie hero przy emulacji 390 px (iPhone 13, dotyk): prowadzi do karty pierścionka.

## Pytania do Marcina
1. **Polityka prywatności i regulamin.** Na produkcji zniknęły ze stopki i ze zgody w formularzu napisy „[wkrótce]”. To jednak oznacza, że formularze zbierają dane bez linku do polityki. Czy dostarczycie treść przed wdrożeniem na produkcję? (Jedno zdanie w `consent.ts` i dwa wiersze w stopce wystarczy wtedy podmienić.)
2. **Linijka zaufania.** Potwierdzone jest tylko „Zamówienia wysyłamy do klientów”. Czy to dobre sformułowanie i czy jest sens je rozszerzyć (np. „w całej Polsce”)? Wideo i czas realizacji czekają na potwierdzenie.
3. **Budżet w formularzu** jest na produkcji ukryty do czasu podania przedziałów. Jakie trzy przedziały podać?
4. **Opinie z Google:** po odzyskaniu wizytówki wystarczy wpisać do `reviews.ts` średnią, liczbę, link i 3–4 opinie oraz zdanie o źródle (wymóg informacyjny). Czy chcecie to samo na „Realizacjach” (jest teraz użyte tam samo), czy tylko na głównej?
5. **Hero a „Pracownia od 1890”.** Lead w hero nadal mówi o 1890 i Michale (zlecenie nie kazało go zmieniać), a nowa sekcja niżej mówi o tym samym innymi słowami. Skrócić lead w hero?
6. **Wyróżniona realizacja** na produkcji jest ukryta (ma tylko placeholdery). Gdy będzie opis, wystarczy wpisać go w `realizacje/page.tsx` i usunąć opakowanie `DoUzupelnienia`.
7. **Migracja na produkcji:** do uruchomienia przez Marcina przed wdrożeniem (komendy wyżej).
