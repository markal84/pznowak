# Porównanie frontendów — 2026-10-09

Wzorzec: stara aplikacja z root tego worktree, lokalny build statyczny na
`http://127.0.0.1:3100`. CMS: lokalny build aplikacji `cms/` na
`http://127.0.0.1:3101`, Neon staging z pełnym opublikowanym katalogiem.
Porównano 1440×1000 i 390×844 px; zrzuty obejmują pełne strony, po załadowaniu
zdjęć i wyłączeniu animacji. Nie jest to deklaracja identyczności plików PNG:
CMS optymalizuje zdjęcia przez Next Image. „Identyczne” opisuje sprawdzony
układ i treść; odstępstwa ogólne wyszczególniono osobno poniżej.

Zrzuty pozostają lokalnie w ignorowanym `screenshots/` (36 stron + stany
interakcji i publikacji); nie są w Git. Wzorcowy 404 zapisano z eksportowanego
`/404.html`; CMS sprawdzono na nieistniejącym `/parity-missing` (HTTP 404).

| Trasa / element | Wynik porównania | Kategoria | 1440 px (stara / CMS) | 390 px (stara / CMS) |
| --- | --- | --- | --- | --- |
| `/` | Układ, teksty, kursywa i łamanie nagłówka zgodne; te same trzy pierwsze produkty. | identyczne | [stara](screenshots/legacy-1440-home.png) / [CMS](screenshots/cms-1440-home.png) | [stara](screenshots/legacy-390-home.png) / [CMS](screenshots/cms-390-home.png) |
| `/katalog` | 34 produkty, ta sama kolejność, kadry i geometria siatki. Poprawna odmiana liczby. | identyczne | [stara](screenshots/legacy-1440-_katalog_.png) / [CMS](screenshots/cms-1440-_katalog.png) | [stara](screenshots/legacy-390-_katalog_.png) / [CMS](screenshots/cms-390-_katalog.png) |
| `/katalog/electra-2` | Produkt z filmem: zdjęcia, miniatury, opis i sekcja wideo zgodne. | identyczne | [stara](screenshots/legacy-1440-_katalog_electra-2_.png) / [CMS](screenshots/cms-1440-_katalog_electra-2.png) | [stara](screenshots/legacy-390-_katalog_electra-2_.png) / [CMS](screenshots/cms-390-_katalog_electra-2.png) |
| `/katalog/merope-2` | Produkt bez filmu: zdjęcia i treści zgodne. | identyczne | [stara](screenshots/legacy-1440-_katalog_merope-2_.png) / [CMS](screenshots/cms-1440-_katalog_merope-2.png) | [stara](screenshots/legacy-390-_katalog_merope-2_.png) / [CMS](screenshots/cms-390-_katalog_merope-2.png) |
| `/katalog/iris` | Najdłuższy opis (771 znaków): treść i układ zgodne. | identyczne | [stara](screenshots/legacy-1440-_katalog_iris_.png) / [CMS](screenshots/cms-1440-_katalog_iris.png) | [stara](screenshots/legacy-390-_katalog_iris_.png) / [CMS](screenshots/cms-390-_katalog_iris.png) |
| `/galeria` | 11 pozycji, te same kadry i kolejność, zgodny układ. | identyczne | [stara](screenshots/legacy-1440-_galeria_.png) / [CMS](screenshots/cms-1440-_galeria.png) | [stara](screenshots/legacy-390-_galeria_.png) / [CMS](screenshots/cms-390-_galeria.png) |
| `/o-nas` | Teksty, kursywa, łamanie nagłówka, obrazy i oś historii zgodne. | identyczne | [stara](screenshots/legacy-1440-_o-nas_.png) / [CMS](screenshots/cms-1440-_o-nas.png) | [stara](screenshots/legacy-390-_o-nas_.png) / [CMS](screenshots/cms-390-_o-nas.png) |
| `/kontakt` | Układ, dane kontaktowe i formularz mailto zgodne. Brak testowych wysyłek. | identyczne | [stara](screenshots/legacy-1440-_kontakt_.png) / [CMS](screenshots/cms-1440-_kontakt.png) | [stara](screenshots/legacy-390-_kontakt_.png) / [CMS](screenshots/cms-390-_kontakt.png) |
| `404` | CMS dopisuje „404 ·” do etykiety i ma osobny tytuł SEO; układ i CTA zgodne. Globalna obsługa wielu root layouts zwraca HTTP 404. | świadome odstępstwo | [stara](screenshots/legacy-1440-_404_html.png) / [CMS](screenshots/cms-1440-_parity-missing.png) | [stara](screenshots/legacy-390-_404_html.png) / [CMS](screenshots/cms-390-_parity-missing.png) |

| Element wspólny / interakcja | Wynik | Kategoria | Dowód |
| --- | --- | --- | --- |
| Zdjęcia i ładowanie | Next Image, rozmiary responsive oraz animowany placeholder pierścionka i komunikat błędu zamiast surowego img. Kadry po wczytaniu zgodne. Zachowano zmiany zastane w worktree. | świadome odstępstwo | Zrzuty stron powyżej; każde zdjęcie wczytane. |
| Karta katalogu | Cała karta jest linkiem; zachowano zastane pozycjonowanie strzałki. | świadome odstępstwo | Zrzuty katalogu. |
| Formatowanie nagłówka w CMS | `*fragment*` tworzy em, tekst HTML jest escapowany przez React. Staging odtwarza stare wyróżnienia i łamanie wierszy. | świadome odstępstwo | Zrzuty `/` i `/o-nas`; test escapowania HTML. |
| Menu mobilne | Otwieranie, Escape i nawigacja do katalogu działają w obu wersjach. | identyczne | Playwright: oba przebiegi zaliczone. |
| Lupa | Mysz aktywuje/przesuwa lupę; strzałka zmienia jej pozycję, Escape wyłącza. | identyczne | [stara](screenshots/legacy-loupe.png) / [CMS](screenshots/cms-loupe.png) |
| Produkt | Wybór drugiej miniatury, otwarcie lightboxa, strzałka i Escape działają w obu wersjach. Naprawiono reset stanu zdjęcia przy zmianie ujęcia. | identyczne | [stara](screenshots/legacy-product-lightbox.png) / [CMS](screenshots/cms-product-lightbox.png) |
| Galeria | Otwarcie i zamknięcie lightboxa działa w obu wersjach. | identyczne | [stara](screenshots/legacy-gallery-lightbox.png) / [CMS](screenshots/cms-gallery-lightbox.png) |
| Formularz | Pusta wiadomość i wiadomość krótsza niż 10 znaków są nieprawidłowe. Nie wywołano submit ani mailto. | identyczne | Playwright: checkValidity w obu wersjach. |
| Publikacja na staging | Opis Merope zmieniony i opublikowany w panelu jest od razu widoczny na stronie bez rebuild/deploy; następnie przywrócono pusty oryginał i ponownie sprawdzono stronę. | identyczne | [zmiana](screenshots/cms-publication-changed.png) / [przywrócenie](screenshots/cms-publication-restored.png) |

Wszystkie osiem właściwych tras mają dokładnie tę samą wysokość pełnej strony
w obu szerokościach. CMS: poprawne HTTP 200 na właściwych trasach, HTTP 404
na brakującym adresie, zero uszkodzonych zdjęć i poziomego overflow.

Błędy poprawione: odmiana „21 projekt” w zastanej funkcji (teraz „21 projektów”),
brak obsługi kursywy dowolnego nagłówka CMS, nieodświeżający się stan obrazu
po zmianie miniatury. Nie znaleziono pozostałych błędów kategorii „błąd”
w zbadanych trasach i stanach. Świadome odstępstwa pozostają do akceptacji
Marcina/Klaudii przed etapem wycofania starej aplikacji.
