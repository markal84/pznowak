# Eksport postów z fanpage'a FB (skrypt w przeglądarce)

Skrypt `fb_export.js` zbiera posty strony „Michał Nowak Pracownia Złotnicza” z Twojej zalogowanej przeglądarki
i zapisuje pliki, z których potem korzystają `download_media.py`, `download_hd.py` i `build_review.py`.

**Ważne przed startem**

- Linki do zdjęć i filmów na Facebooku **wygasają w ciągu godzin lub kilku dni**. Zdjęcia i filmy pobieraj od razu po
  eksporcie, w tym samym podejściu.
- Skrypt został odtworzony z zapisu sesji z 25.10.2026 i od tamtej pory **nie był uruchamiany na żywym Facebooku**.
  Facebook może zmienić układ danych. Jeśli skrypt nic nie znajdzie albo wypisze błąd, przerwij i daj znać.
- Przewija wolno (co ok. 4 s) i robi mało zapytań, żeby Facebook nie uznał tego za podejrzany ruch. Nie skracaj tego czasu.
- Skrypt nie zawiera haseł, tokenów ani ciasteczek. Pracuje na sesji, w której jesteś zalogowany.

## A. Pierwszy raz (cała historia) albo odświeżenie wszystkiego

1. Otwórz Chrome, zaloguj się na Facebooka i wejdź na  
   `https://www.facebook.com/profile.php?id=61568506251939`.
2. Jeśli wyskoczy okno logowania lub zgody na ciasteczka, zamknij je (wybierz opcję „odrzuć opcjonalne”).
3. Otwórz konsolę: `Cmd + Option + J`. Przy pierwszym wklejaniu Chrome może kazać wpisać `allow pasting` i Enter.
4. Otwórz plik `scripts/facebook/fb_export.js`, zaznacz całość, skopiuj i wklej w konsolę, Enter.
5. Czekaj. W konsoli co jakiś czas pojawia się numer przewinięcia. Całość oś czasu to kilkanaście minut. Nie zamykaj karty
   i nie przełączaj się na inną kartę (tło może spowolnić stronę).
6. Na końcu skrypt wypisze podsumowanie i pokaże w lewym górnym rogu strony **czerwony link „POBIERZ pznowak-fb-posts.json”**.
   Kliknij go. Plik ląduje w Pobranych (albo na Pulpicie, zależnie od ustawień Chrome).
7. Przenieś plik do repo jako `data/facebook/posts.json` (przy pierwszym razie; przy odświeżeniu zrób wcześniej kopię starego).

### Krok 2: filmy w pełnej jakości i niepełne albumy (tylko jeśli skrypt o to poprosi)

Po kroku 1 skrypt wypisuje „Do kroku 2: N stron”. To filmy, dla których Facebook nie podał pełnej jakości na osi czasu,
oraz albumy, w których zdjęć jest więcej niż widać na osi czasu. Skrypt zapamiętuje kolejkę w tej karcie.

1. W **tej samej karcie** przejdź pod adres, który skrypt wypisał (albo wpisz w konsoli `fbExport.next()`).
2. Po załadowaniu strony wklej skrypt w konsolę jeszcze raz (w konsoli: strzałka w górę, Enter).
   Skrypt zapisze dane tej strony, odczeka kilka sekund i sam przejdzie na następną.
3. Po każdym przejściu powtarzaj krok 2 (strzałka w górę, Enter), aż skrypt napisze „Kolejka skończona”.
   Przy całej historii to ok. 50 filmów i kilkadziesiąt zdjęć, więc jest to żmudne. Przy eksporcie od daty (część B) stron jest zwykle kilka.
4. Na końcu pojawi się czerwony link **„POBIERZ pznowak-fb-hd.json”**. Kliknij go i przenieś plik do `data/facebook/hd-sources.json`.
   (Gdy trzeba go pobrać ponownie, na dowolnej stronie z kolejką wpisz `fbExport.finish()`.)

## B. Co tydzień: tylko nowe posty (tryb przyrostowy)

1. W pliku `fb_export.js` zmień na górze `const SINCE = '';` na datę ostatniego eksportu, np. `const SINCE = '2026-10-25';`
   (nie zapisuj tej zmiany w repo, to ustawienie na jedno uruchomienie; albo skopiuj plik i zmień w kopii).
2. Zrób kroki 1–6 z części A. Skrypt przewija tylko do postów starszych niż ta data i zatrzymuje się.
3. Jeśli było „Krok 2”, zrób go jak wyżej.
4. Pliki z Pobranych **nie zastępują** `posts.json`, tylko się do niego dopisują:

   ```
   python3 -I scripts/facebook/merge_export.py data/facebook ~/Downloads/pznowak-fb-posts.json ~/Downloads/pznowak-fb-hd.json
   ```

   (drugi plik `-hd.json` podaj tylko, jeśli go pobrałeś). Polecenie dopisuje tylko nowe posty, stare zostawia bez zmian
   i robi kopie `posts.json.bak` oraz `hd-sources.json.bak`.

## B2. Nowe posty z automatu (Graph API, bez przeglądarki)

Od 15.11.2026 posty pobiera sam serwer (`scripts/posty-meta`, cron na MyDevil). Do przeglądu trafiają same:

```
cd /Volumes/crucial/projects/pznowak-cms && python3 scripts/facebook/review_server.py
```

Przy starcie serwer przeglądu ściąga kopię z MyDevil (`~/.pznowak-posty-kopia/kopia.sh --teraz`), dopisuje nowe posty
do `posts.json` i `media/` i przebudowuje `review.html` (`refresh_posts.py`). W trakcie pracy to samo robi przycisk
**„Pobierz nowe posty”** w nagłówku przeglądu (najpierw zapisuje decyzje, po nowych postach odświeża stronę).
`--bez-pobierania` pomija pobieranie przy starcie (np. bez sieci). Bez zainstalowanej kopii na Macu (README
`scripts/posty-meta`, „Kopia na Maca”) dopisuje tylko to, co już jest w `~/PZ Nowak posty`.

**Tablica (`review.html`, od 18.11.2026).** Cztery kolumny: *Do decyzji*, *Gotowe do katalogu*, *Już w katalogu*, *Poza
katalogiem*. Przycisk „Przejrzyj po kolei” otwiera jeden post na ekranie: zdjęcia i film posta, podpowiedź modelu ze zdjęciem
sugerowanej karty z katalogu obok (Tak / „Nie, to coś innego”), a niżej proste wybory: *Nowy pierścionek*, *Pierścionek z
katalogu* (wybór po zdjęciach, z wyszukiwarką, najpierw karty najbardziej podobne według modelu), *Ten sam co inny post*,
*Materiał*, *Pomiń*. Przy karcie z katalogu wybierasz wariant kamienia (wariant z samą wizualizacją = prawdziwe zdjęcie
zamiast wizualizacji) i które zdjęcia mają trafić dalej. Pod decyzją jest zdanie, co zrobi eksport, liczone przez serwer
tą samą funkcją, co eksport (`GET /api/plan` → `export_selection.compute`). Działa też na telefonie; strzałki ←/→
przełączają zdjęcia, Enter przechodzi do następnego posta do decyzji, Esc zamyka.

Dawny widok ze wszystkimi polami został jako **`szczegoly.html`** (link „Widok szczegółowy” w nagłówku); oba widoki
zapisują do tego samego `selection.json`. Nowe pola w karcie: `newRing` (to nowy pierścionek mimo podpowiedzi modelu),
`product` (slug karty z katalogu) i `action: zamiast-wizualizacji`; opis w docstringu `export_selection.py`, testy:
`python3 -m unittest scripts/facebook/test_export_selection.py`.

Tablica jest narzędziem na Macu (`127.0.0.1`): serwer nie ma logowania, a „Pobierz nowe posty” uruchamia skrypty i czyta
żywą bazę. Nie wystawiaj go do internetu w tej postaci; podgląd dla innych osób to osobny tryb tylko do odczytu za
logowaniem (np. Cloudflare Access).

Po dopisaniu nowych postów to samo polecenie robi **podpowiedzi modelu**: czyta katalog z Payload (`cms`: `npm run
katalog:snapshot`, tylko odczyt, żywa baza strony, ze szkicami) i każe Terrze (`classify_posts.py`, przez Codex) ocenić
każdą kartę „Nowe od…”: nowy pierścionek, zdjęcia do istniejącej karty, prawdziwe zdjęcie zamiast wizualizacji wariantu,
nowy kamień do istniejącego fasonu albo materiał. Podpowiedź widać w karcie (ramka „Podpowiedź modelu”); decyzję
zapisujesz sam. Karty już ocenione biorą wynik z pamięci (`classify/terra/`), więc ponowne pobieranie nic nie kosztuje.
`--bez-podpowiedzi` pomija ten krok. Test na dotychczasowych decyzjach: `python3 scripts/facebook/classify_posts.py
--test --run` → `data/facebook/classify/test-raport.md`.

## B3. Sito przed modelem (`sito.py`)

Darmowy etap przed `classify_posts.py`: zdjęcia nowych postów („fresh”) porównuje z odciskami zdjęć katalogu (progi z
`similarity.py`) i zapisuje, który pierścionek i które zdjęcie już jest (`rozpoznany`), co jest tylko częściowo
(`czesciowo`) albo nowe (`nowy`). Do modelu trafiają tylko `nowy` i `czesciowo`: jedno wywołanie na post, wynik w
`classify/sito/wyniki.json` razem z odciskiem zestawu zdjęć (ten sam zestaw nie kosztuje drugi raz), twardy dzienny limit
(domyślnie 15, `--limit-dzienny`). Model woła wymienny adapter (`sito_adapters.py`), domyślnie wyłączony. Nic nie zapisuje
do Payload ani do selection.json, wynik leży w `data/facebook/classify/sito/` (`sito.json`, `raport.md`).

```
python3 scripts/facebook/sito.py --odciski-katalogu   # po zmianie katalogu (wymaga katalog.json)
python3 scripts/facebook/sito.py                      # samo sito, za darmo
python3 scripts/facebook/sito.py --adapter claude-haiku --run
python3 -m unittest scripts/facebook/test_sito.py
```

Ręcznie, bez serwera przeglądu: `python3 scripts/facebook/refresh_posts.py data/facebook` (albo jak dawniej
`import_posty_meta.py` + `build_review.py`).

Nowe posty lądują w sekcji „Nowe od DD.MM”. Na tablicy przełącznik „Nowe od DD.MM / Wszystkie” (domyślnie nowe) chowa
stare, już rozstrzygnięte posty; decyzje w nich zostają bez zmian.
Posty już obecne w `posts.json` są pomijane, więc pobieranie można powtarzać dowolnie.

Terminal serwera przeglądu pokazuje tylko zapisy decyzji, eksport, pobieranie i błędy. Strona co 8 s pyta serwer o stan
(wykrywa wyłączony serwer i zmiany z innej karty), ale te odczyty nie są już logowane, a w karcie w tle pytanie stoi.

## C. Pobranie mediów i przegląd (od razu po eksporcie)

Z głównego katalogu repo:

```
python3 -I scripts/facebook/download_media.py data/facebook
python3 -I scripts/facebook/download_hd.py data/facebook
python3 -I scripts/facebook/build_review.py data/facebook
```

- `download_media.py` pobiera zdjęcia i filmy z `posts.json` do `data/facebook/media/` (istniejące pliki pomija).
- `download_hd.py` podmienia filmy na najlepszą jakość z `hd-sources.json` (potrzebny `ffmpeg`) i dociąga zdjęcia z albumów.
- `build_review.py` buduje stronę przeglądu. Nowy post, którego nie ma w `groups.json`, dostaje własną kartę w „Nowe”.

Folder `data/facebook/` jest poza gitem.

## D. „Zastosuj eksport”: szkice, zdjęcia i opisy jednym kliknięciem

Na tablicy: **Przygotuj eksport** → okno „Plik eksportu gotowy” → **Zastosuj eksport**. Kliknięcie to świadome
potwierdzenie zapisu (zastępuje wpisywanie słowa PRODUKCJA). Dalej wszystko dzieje się samo, w tle, bez terminala
(`scripts/facebook/zastosuj_eksport.py`, z `cms/`):

0. **eksport z aktualnych decyzji** – `export_selection.py` (decyzja zapisana po „Przygotuj eksport” też wchodzi;
   przycisk wraca, gdy decyzje zmieniły się po ostatnim przebiegu)
1. nowe pierścionki jako **szkice** – `npm run import:fb -- --apply`
2. zdjęcia do galerii kart – `npm run import:fb -- --apply --gallery` (pomijane, gdy eksport ich nie ma)
3. zdjęcia do istniejących kart jako **wersje robocze** – `npm run fb:do-istniejacych -- --apply`. „Dodaj do karty +
   wariant”, którego karta jeszcze nie ma: z prawdziwymi zdjęciami wariant **powstaje** (kolor kółka z nazwy kamienia,
   `guessSwatch` w `cms/src/lib/stone-variants.ts`, do sprawdzenia w panelu); sam film czeka na zdjęcia
4. imię, krótki opis, opis, kamień, metal i masa – `npm run opisz:szkice -- --model --apply`
5. odświeżenie `katalog.json` dla tablicy – `npm run katalog:snapshot`
6. przebudowa tablicy – `build_review.py`: kolumny liczone ze świeżego katalogu (5 i 6: błąd nie psuje przebiegu).
   Post, którego zdjęcia już są w karcie, przechodzi do „Już w katalogu” (⏸ = film czeka na zdjęcia wariantu), a po
   zamknięciu okna wyniku tablica wczytuje się na nowo.

**Zbędne szkice**: gdy post zrobił kiedyś szkic nowej karty, a potem dostał decyzję „dodaj do karty…” (albo materiał,
pominięcie), eksport wypisuje ten szkic w `catalog-selection.json → orphanDrafts`. Opisy go pomijają, a tablica pokazuje
go w oknie wyniku i przy poście jako „do usunięcia w panelu”. Sam skrypt niczego nie usuwa.

**Zdjęcia spoza FB do posta** (np. od Kamili do wariantu): `data/facebook/manual/<data>_<źródło>/manual.json` z `post_id`
posta (format w `manual_media.py`); decyzja „dodaj do karty” obejmuje je sama, wystarczy „Zastosuj eksport”.

Na końcu okno „Szkice gotowe do obejrzenia”: każda karta z linkiem do panelu, co wpisano i co sprawdzić. **Publikujesz
zawsze Ty, w panelu.** Okno można zamknąć w trakcie; przycisk u góry pokazuje „Eksport w toku…”, a wynik wyskoczy sam.
Po błędzie łańcuch staje i pokazuje końcówkę wyjścia; „Spróbuj jeszcze raz” jest bezpieczne (import pomija karty, które
już są, galerie nie dublują zdjęć, opisy wpisują tylko puste pola). Pełne wyjście: `data/facebook/zastosuj-<czas>.log`,
stan: `data/facebook/zastosuj-stan.json`. Bez tablicy to samo robi `python3 scripts/facebook/zastosuj_eksport.py`
(`--na-sucho`: każdy krok bez zapisu).

**Klucz konta Automat** (zapis opisów przez REST, klucz = tylko szkice): gdy go brakuje, okno ma pole „Wklej klucz”.
Klucz bierzesz z panelu (Użytkownicy → Automat → Klucz API); tablica sprawdza go na stronie i zapisuje w
`~/.config/pznowak-cms/automat.key` (`chmod 600`), poza repo. Działa też zmienna `PZNOWAK_AUTOMAT_KEY`.

### Opisy pisze model (`opisz:szkice --model`)

- Szkic bez tekstu (puste pola albo tekst wstawiony przez import) idzie do lokalnego Claude Code w trybie bez okna:
  `claude -p --model claude-opus-5-5 --effort medium`, logowanie z Maca (bez klucza Anthropic w repo). Model dostaje do
  6 zdjęć karty (przy samym filmie dwie klatki przez ffmpeg), posty, odczyt parametrów z posta i 4 przykłady z
  `seed/opisy/opisy-ac.json`. **Nie ma żadnych narzędzi** (`--tools ""`, bez MCP, bez plików, bez sieci) i odpowiada
  w schemacie JSON (`--json-schema`).
- **Zapora** (`cms/scripts/opisz-model-logic.ts`): lead i opis przechodzą linter AC (8–16 i 40–90 słów, akapity, zdanie
  o pracowni i o zamówieniu, bez pierwszej osoby, pytań, wykrzykników, „kolejny” itd.). Liczba w tekście (masa „ct”,
  próba „585”, „14k”) musi być w poście albo tytule. Kamień tylko z posta: ze zdjęć wyłącznie jako uwaga, bo topaz
  i szafir wyglądają na zdjęciu podobnie (Thalia); gdy post nie nazywa kamienia, opis nie może nazwać minerału, tylko
  kolor. Masa tylko z posta. Metal z posta albo ze zdjęć (wtedy „do sprawdzenia”), wyłącznie z listy katalogu. Tekst
  niezgodny wraca do modelu raz z listą błędów; po drugiej porażce nie jest wpisywany. Niepewne pole zostaje puste
  i trafia na listę „do sprawdzenia”.
- **Imię** nie jest zmyślane przez model: kanon (`nazwy-kanon.json`) albo pierwsze wolne z puli mitologii
  (`nazwy-pula.json`), bez kolizji z kartami i wycofanymi adresami.
- **Limity**: jedno wywołanie najwyżej 1,5 USD (`--max-budget-usd`), cały przebieg 6 USD, 10 kart, 6 min na wywołanie.
  Zmienne: `PZNOWAK_OPISY_LIMIT_WYWOLANIA_USD`, `PZNOWAK_OPISY_LIMIT_USD`, `PZNOWAK_OPISY_MAX_KART`,
  `PZNOWAK_OPISY_LIMIT_MINUT`, model i wysiłek: `PZNOWAK_OPISY_MODEL`, `PZNOWAK_OPISY_EFFORT`, plik `claude`:
  `PZNOWAK_CLAUDE_BIN`. Przy logowaniu abonamentem kwota jest szacunkiem z cennika, ale limit i tak działa.
- **Pamięć**: odpowiedź leży w `data/facebook/opisy-model/<id>.json`; te same posty i zdjęcia nie kosztują drugi raz.
  Pozycja w `cms/seed/opisy/opisy-szkice.json` (pisana przez człowieka) zawsze wygrywa z modelem.
- Wpisuje tylko do pustych pól szkiców, tuż przed zapisem czyta kartę jeszcze raz (Twoja poprawka z panelu zostaje),
  nic nie publikuje. Podsumowanie dla tablicy: `data/facebook/opisz-szkice-ostatni.json`.

Ręcznie, z `cms/`: `npm run opisz:szkice` (podgląd), `-- --model` (podgląd z tekstami modelu), `-- --model --apply`
(zapis), `-- --zadanie` (plik z postami i zdjęciami do pisania ręcznie, jak dawniej).

## Gdy coś nie działa

- „Otwórz oś czasu fanpage'a…” – skrypt wklejono na złej stronie; wejdź na adres z punktu 1.
- 0 postów albo same puste – Facebook zmienił układ danych; zatrzymaj się i zgłoś.
- Strona zamarza podczas przewijania – zamknij kartę, odczekaj kilka minut, zacznij od nowa (przyrostowo od daty).
- Facebook pokazuje ostrzeżenie o nietypowej aktywności – przerwij na dłużej i nie powtarzaj tego dnia.
- Wylogowało Cię – zaloguj się i zacznij od początku kroku.

## Zdjęcia spoza Facebooka i treści AI

**Media spoza FB** (np. zdjęcia od Kamili na Messengerze): wrzuć je do `data/facebook/manual/<data>_<źródło>/` i dodaj tam
`manual.json` (format w nagłówku `scripts/facebook/manual_media.py`). Karta bez `post_id` to osobna karta w „Nowych
pierścionkach”; z `post_id` zdjęcia dołączają do karty tego posta. Potem `python3 scripts/facebook/build_review.py data/facebook`.
Zdjęcia dostają plakietkę „spoza FB”, oryginały zostają tam, gdzie były (do `media/` idą kopie `manual-<id>_<nazwa>.jpg`).
Gdy później przyjdzie post FB z filmem tego samego pierścionka: w przeglądzie „połącz z kartą…” (albo wpisz jego `post_id`
w `manual.json`, a karta spoza FB rozpłynie się w karcie posta). Podpowiedź połączenia można dodać w `merge-proposals.json`.

**Treści AI**: Facebook oznacza je w interfejsie, ale `fb_export.js` nie zapisuje takiej etykiety (w zapisanych danych jej nie
ma), więc znaczniki trzyma ręcznie `data/facebook/ai-flags.json`. Oznaczone pliki mają w przeglądzie czerwoną plakietkę „AI”, a
`export_selection.py` nie wpuszcza ich do katalogu ani galerii, dopóki w pliku nie ma `"allow": true` (decyzja Marcina).
