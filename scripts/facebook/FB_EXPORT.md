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

## Gdy coś nie działa

- „Otwórz oś czasu fanpage'a…” – skrypt wklejono na złej stronie; wejdź na adres z punktu 1.
- 0 postów albo same puste – Facebook zmienił układ danych; zatrzymaj się i zgłoś.
- Strona zamarza podczas przewijania – zamknij kartę, odczekaj kilka minut, zacznij od nowa (przyrostowo od daty).
- Facebook pokazuje ostrzeżenie o nietypowej aktywności – przerwij na dłużej i nie powtarzaj tego dnia.
- Wylogowało Cię – zaloguj się i zacznij od początku kroku.
