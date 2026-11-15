# Posty pracowni z Facebooka (i później Instagrama)

Skrypt `posty.mjs` co kilka godzin sprawdza przez Graph API nowe posty strony „Michał Nowak Pracownia Złotnicza”,
**od razu pobiera ich zdjęcia i filmy** (linki z fbcdn wygasają po kilku dniach), zapisuje treść, datę i link,
a o nowościach i problemach (np. wygasły token) pisze mailem. Działa jako cron na MyDevil.

- Bez zależności: Node 24 (ten sam co strona), `fetch` i moduły wbudowane. Mail przez SMTP korzysta z pakietu
  `nodemailer`, który już jest w `cms/node_modules` (używa go formularz na stronie); zamiast tego może być `sendmail`.
- Tylko odczyt: skrypt niczego nie publikuje i nie zmienia na stronie FB.
- Tokeny i hasła tylko w pliku konfiguracji na serwerze (`~/pznowak-posty/posty.env`, prawa 600). Nie trafiają do
  repo, logu ani maili (skrypt je wycina z komunikatów błędów).

## Dlaczego w tym repo

Na serwerze jest już klon tego repo (`~/pznowak-cms-prod`), więc `git pull` albo `deploy.sh` aktualizuje też skrypt,
a SMTP i Node są te same co dla strony. Kod jest osobno w `scripts/posty-meta/` i nie wpływa na budowanie strony.
Dane (posty, stan, log) leżą poza repo i poza katalogiem strony: `~/pznowak-posty/`.

## Co gdzie leży na serwerze

```
~/pznowak-cms-prod/scripts/posty-meta/posty.mjs   skrypt (z repo)
~/pznowak-posty/posty.env                         konfiguracja z tokenem (chmod 600)
~/pznowak-posty/posty.log                         log z crona
~/pznowak-posty/dane/posty/2026-11-14_<id posta>/ jeden katalog na post: 01.jpg, 02.mp4…, post.json, tresc.txt
~/pznowak-posty/dane/posty/2026-11-12_rolka_<id>/ rolka, której nie było w /posts
~/pznowak-posty/dane/indeks.json                  spis wszystkich zapisanych postów (najnowsze pierwsze)
~/pznowak-posty/dane/stan.json                    co już widziane, co czeka na ponowne pobranie (nie edytować ręcznie)
```

`post.json` ma treść, datę (UTC i lokalną), link, listę plików i pełną odpowiedź API (do późniejszego użycia, np. na
stronie). `tresc.txt` to sama treść z linkiem, do szybkiego podejrzenia.

## Instalacja na MyDevil (raz)

Po scaleniu PR, przez SSH na serwerze:

```sh
cd ~/pznowak-cms-prod && git pull --ff-only
mkdir -p ~/pznowak-posty && cp -n ~/pznowak-cms-prod/scripts/posty-meta/posty.env.example ~/pznowak-posty/posty.env && chmod 600 ~/pznowak-posty/posty.env
nano ~/pznowak-posty/posty.env
```

W pliku uzupełnij `META_APP_ID`, `META_APP_SECRET` (nowa aplikacja do strony: panel Meta → Ustawienia aplikacji →
Podstawowe) i `NOTIFY_TO` (adres na powiadomienia). Reszta ma rozsądne wartości domyślne. Potem token (niżej)
i sprawdzenie:

```sh
/usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --wymien-token
/usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --sprawdz
/usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --test-maila
/usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --teraz
```

`--teraz` robi pierwsze prawdziwe pobranie (posty z ostatnich `FIRST_RUN_DAYS` dni) i wysyła mail. Na koniec cron
(`crontab -e`, jeden wiersz):

```
15 * * * * /usr/bin/lockf -t 0 ~/pznowak-posty/posty.lock /usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --config ~/pznowak-posty/posty.env >> ~/pznowak-posty/posty.log 2>&1 # pznowak-posty
```

Cron odpala skrypt co godzinę, a skrypt sam pomija uruchomienia, jeśli od poprzedniego minęło mniej niż
`INTERVAL_HOURS`. Dzięki temu częstotliwość zmienia się w `posty.env`, bez ruszania crona. Pominięte uruchomienia
nic nie piszą do logu.

## Token

Skrypt potrzebuje **tokena strony bez daty wygaśnięcia**. Taki powstaje z długiego tokena użytkownika; komenda
`--wymien-token` robi całą wymianę i sama wpisuje wynik do `posty.env` (token nie pojawia się na ekranie).

1. Otwórz [Graph API Explorer](https://developers.facebook.com/tools/explorer/), wybierz nową aplikację (tę do strony).
2. „User or Page” → **Get User Access Token**. Uprawnienia: `pages_show_list`, `pages_read_engagement`,
   `pages_read_user_content`. W oknie logowania zaznacz stronę pracowni. Kliknij Generate.
3. Skopiuj token (przycisk kopiowania obok pola).
4. Na serwerze: `/usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --wymien-token`, wklej, Enter.
   Wynik pokazuje nazwę strony, „wygasa: nigdy” i datę wygaśnięcia dostępu do danych.
5. `--sprawdz` potwierdza, że wszystko działa.

Raz na dobę skrypt sprawdza token (`debug_token`; do tego potrzebne `META_APP_ID` i `META_APP_SECRET`) i pisze mail,
gdy token jest nieważny albo coś wygasa w ciągu `TOKEN_WARN_DAYS` dni. Gdy Meta odrzuci token (zmiana hasła,
cofnięty dostęp do strony, usunięta aplikacja), przychodzi mail od razu. Naprawa: powtórz kroki 1–5.

**Gdy wklejanie w terminalu SSH nie działa:** wartości można przesłać ze schowka Maca, uruchamiając komendę
w zwykłym Terminalu na Macu (nie w sesji SSH). Skopiuj token w przeglądarce i:

```sh
pbpaste | ssh pznowak@s92.mydevil.net '/usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --wymien-token'
```

Tak samo każdą inną wartość konfiguracji, np. sekret aplikacji:
`pbpaste | ssh pznowak@s92.mydevil.net '/usr/local/bin/node24 ~/pznowak-cms-prod/scripts/posty-meta/posty.mjs --ustaw META_APP_SECRET'`.
Sekretów nie widać na ekranie ani w historii poleceń.

`--wymien-token` przyjmuje token użytkownika, a jeśli Explorer da tylko token strony, też go spróbuje przedłużyć.

Jeśli `--wymien-token` napisze, że nie ma dostępu do strony, a strona jest w portfolio firmowym, dodaj w kroku 2
uprawnienie `business_management` i spróbuj ponownie.

## Ustawienia (`posty.env`)

Pełna lista z opisami: `posty.env.example`. Najważniejsze:

| Zmienna | Domyślnie | Co robi |
| --- | --- | --- |
| `INTERVAL_HOURS` | 6 | co ile godzin sprawdzać (ułamki dozwolone, 0 = przy każdym uruchomieniu crona) |
| `SOURCES` | `posts,video_reels` | źródła; `instagram` dopisz, gdy będzie dostęp |
| `DATA_DIR` | `~/pznowak-posty/dane` | gdzie zapisywać posty |
| `FIRST_RUN_DAYS` | 7 | ile dni wstecz przy pierwszym uruchomieniu (0 = cała historia) |
| `LOOKBACK_DAYS` | 14 | ile dni wstecz przeglądać za każdym razem (posty z datą wsteczną) |
| `DOWNLOAD_PHOTOS`, `DOWNLOAD_VIDEOS` | 1 | czy pobierać pliki |
| `PHOTO_FULL_RES` | 1 | zdjęcia w największej rozdzielczości |
| `MAX_FILE_MB` | 500 | limit wielkości pliku |
| `NOTIFY_TO` | puste | adresy powiadomień (puste = bez maili) |
| `NOTIFY_NEW_POSTS`, `NOTIFY_ERRORS` | 1 | mail o nowych postach / o problemach |
| `MAIL_METHOD` | `smtp` | `smtp`, `sendmail` albo `none` |
| `SMTP_ENV_FILE` | — | plik env strony, z którego brać `SMTP_*` (skrzynka pracowni) |
| `ERROR_MAIL_AFTER` | 3 | przejściowe problemy (sieć, limit zapytań) zgłaszaj po tylu nieudanych uruchomieniach |
| `ERROR_REPEAT_HOURS` | 24 | ten sam problem przypominaj najwyżej raz na tyle godzin |
| `RETENTION_DAYS` | 30 | posty starsze niż tyle dni znikają z serwera (0 = nigdy) |
| `RETENTION_NEEDS_BACKUP` | 1 | usuwaj tylko to, co jest już na Macu (sekcja „Kopia na Maca”) |
| `BACKUP_WARN_DAYS` | 21 | mail, gdy stare posty czekają na kopię o tyle dni dłużej niż `RETENTION_DAYS` |

Każdą zmienną można też jednorazowo nadpisać przy uruchomieniu, np. `DOWNLOAD_VIDEOS=0 node24 … --teraz`.

## Komendy

```
posty.mjs                   zwykłe uruchomienie (z crona)
posty.mjs --teraz           sprawdź od razu, bez względu na INTERVAL_HOURS
posty.mjs --na-sucho        pokaż, co jest nowego; nic nie pobiera, nie zapisuje, nie wysyła
posty.mjs --od 2026-10-01   jednorazowo dociągnij posty od tej daty
posty.mjs --sprawdz         konfiguracja, token, uprawnienia, ostatnie posty z każdego źródła
posty.mjs --test-maila      próbny mail
posty.mjs --wymien-token    wymiana tokena (sekcja „Token”)
posty.mjs --ustaw KLUCZ     wpisz do posty.env wartość z wejścia (np. pbpaste | ssh …)
--config PLIK               inny plik konfiguracji (domyślnie ~/pznowak-posty/posty.env)
```

Kody wyjścia: 0 = w porządku, 1 = był problem (szczegóły w logu i mailu), 2 = błąd konfiguracji.

## Jak działa

1. Pobiera `/{strona}/posts` (z załącznikami) i `/{strona}/video_reels` od daty: ostatnie `LOOKBACK_DAYS` dni
   (albo od ostatniego udanego sprawdzenia, jeśli było dawniej).
2. Pomija to, co już jest w `stan.json`. Rolkę, której film jest już w poście z `/posts`, uznaje za duplikat.
3. Dla nowego posta od razu pobiera wszystkie zdjęcia albumu i pliki mp4 do katalogu posta.
4. Gdy jakiś plik się nie pobierze, post czeka i przy kolejnych uruchomieniach skrypt pobiera go na nowo ze świeżymi
   linkami z API (najwyżej `MAX_RETRIES` razy, potem mail).
5. Jeden mail na uruchomienie: lista nowych postów (data, początek treści, link, pliki, katalog) i ewentualne problemy.
   Po problemie, gdy wszystko wróci do normy, przychodzi krótki mail „Skrypt znowu działa”.

## Kopia na Maca i sprzątanie serwera

Skrypt `mac/kopia-na-maca.sh` działa na Macu: co `CO_ILE_DNI` dni (domyślnie 14) kopiuje cały katalog danych z serwera
(`rsync`, tylko dokłada pliki, na Macu nic nie kasuje). macOS uruchamia go codziennie o `GODZINA` (domyślnie 12:00;
gdy Mac śpi, po obudzeniu), a skrypt sam pilnuje terminu. Bez sieci albo z wyłączonym Makiem próbuje następnego dnia.
Wynik pokazuje powiadomieniem macOS.

Po udanej kopii zapisuje na serwerze `DATA_DIR/.kopia-na-maca` (czas rozpoczęcia kopii). Serwer przy zwykłym
uruchomieniu usuwa katalogi postów starszych niż `RETENTION_DAYS` (data publikacji), ale tylko te zapisane przed tą
kopią. W `stan.json` post zostaje oznaczony `removedAt`, więc nie jest pobierany drugi raz. Gdy kopii długo nie ma,
serwer niczego nie usuwa i wysyła jeden mail (`BACKUP_WARN_DAYS`).

Instalacja na Macu (raz; zapyta jeden raz o hasło do serwera, żeby dodać osobny klucz SSH tylko do kopii):

```
cd /Volumes/crucial/projects/pznowak-cms && git switch main && git pull --ff-only && bash scripts/posty-meta/mac/kopia-na-maca.sh --instaluj
```

Inny katalog na kopię: dopisz go na końcu, np. `--instaluj "$HOME/Posty pracowni"` (lepiej w katalogu domowym niż
w Dokumentach, na Biurku albo na dysku zewnętrznym, bo tam macOS blokuje programy uruchamiane w tle).
Ustawienia po instalacji: `~/.pznowak-posty-kopia/ustawienia.env`; log: `~/.pznowak-posty-kopia/kopia.log`.

```
bash ~/.pznowak-posty-kopia/kopia.sh --teraz        kopia od razu
bash ~/.pznowak-posty-kopia/kopia.sh --status       ostatnia i następna kopia
bash ~/.pznowak-posty-kopia/kopia.sh --odinstaluj   wyłączenie (skopiowane pliki zostają)
```

## Instagram (później)

1. W starej aplikacji „Agregat postow” ustaw dostęp do firmowego IG (`instagram_basic`, `pages_show_list`,
   `pages_read_engagement`) i wygeneruj token użytkownika.
2. Jeśli token jest z innej aplikacji niż `META_APP_ID`, wpisz go jako `IG_TOKEN` (i jej sekret jako `IG_APP_SECRET`).
   Najprościej: tymczasowo podmień `META_APP_ID`/`META_APP_SECRET` na dane tej aplikacji, zrób `--wymien-token`,
   przenieś wynik z `META_PAGE_TOKEN` do `IG_TOKEN` i przywróć poprzednie wartości.
3. Dopisz `instagram` do `SOURCES` i uruchom `--sprawdz`. Skrypt sam znajdzie konto IG podpięte do strony
   (albo ustaw `IG_USER_ID`). Ta część nie była jeszcze sprawdzona na prawdziwym koncie; stories nie są dostępne.

## Gdy coś nie działa

- Najpierw `--sprawdz`: pokaże, czy token działa, jakie ma uprawnienia i co widzi w każdym źródle.
- „token nieważny” (kod 190): nowy token, sekcja „Token”.
- „brak uprawnień” (kod 10 albo 200–299): aplikacja albo token nie ma `pages_read_engagement` /
  `pages_read_user_content`, albo konto straciło dostęp do strony w portfolio firmowym.
- Rolki: według dokumentacji mogą nie pojawiać się w `/posts`, dlatego jest osobne źródło `video_reels`. Jeśli
  `video_reels` zwraca błąd uprawnień, usuń je z `SOURCES` (rolki z `/posts` dalej będą pobierane).
- Testy skryptu (bez sieci, na sztucznym API): `node --test scripts/posty-meta/test/posty.test.mjs`.
