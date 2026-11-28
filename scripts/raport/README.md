# Codzienny raport z Hetznera

`raport-dzienny.py` to zwykły skrypt (bez modelu), który raz dziennie wysyła jeden mail z wynikami sprawdzeń:

1. `https://pznowak.pl/` i `/admin` zwracają 200,
2. wiek ostatniej pełnej kopii (limit 26 h) i kopii bazy (limit 13 h: cron robi ją o 8:15, 14:15 i 20:15), wolne miejsce na dysku (próg 5 GB),
3. skrypt postów FB na MyDevil: ostatnie udane uruchomienie, błędy z `posty.log` z ostatniej doby, nowe posty z 24 h
   (odczyt przez rsync kluczem `pznowak_backup_pull`, który wpuszcza tylko rsync do odczytu; jeśli rsync zawiedzie, skrypt bierze dane z lustra ostatniej
   kopii i dopisuje ostrzeżenie, bez logu),
4. kontenery Dockera (wszystkie ma być `Up`; opcjonalnie lista wymaganych nazw w `PZNOWAK_KONTENERY`).

Sprawdzenie liczby szkiców w Payload dojdzie, gdy będzie klucz konta „Automat”.
Skrypt tylko czyta: nic nie zapisuje na MyDevil, w bazie ani na stronie. Hasło SMTP jest wyłącznie w pliku na Hetznerze.

## Instalacja (na Hetznerze, raz)

Plik z ustawieniami poczty (dane skrzynki pracowni, tej samej co formularz na stronie):

```sh
mkdir -p ~/.config/pznowak-raport && umask 077 && cat > ~/.config/pznowak-raport/smtp.env <<'X'
SMTP_HOST=mail92.mydevil.net
SMTP_PORT=587
SMTP_USER=kontakt@pznowak.pl
SMTP_PASS=TU_HASLO_SKRZYNKI
SMTP_FROM="Raport Hetzner <kontakt@pznowak.pl>"
RAPORT_TO=twoj@adres.pl
X
chmod 600 ~/.config/pznowak-raport/smtp.env
```

Hetzner blokuje wychodzące porty 25 i 465, dlatego port 587 (STARTTLS). (`SMTP_HOST` i `SMTP_USER` jak w `cms/.env.production.local` na MyDevil.) Test bez wysyłki, potem z wysyłką, potem cron:

```sh
python3 ~/pznowak-raport/raport-dzienny.py --na-sucho
python3 ~/pznowak-raport/raport-dzienny.py
( crontab -l 2>/dev/null | grep -v '# pznowak-raport'; echo '0 6 * * * /usr/bin/python3 $HOME/pznowak-raport/raport-dzienny.py >> $HOME/pznowak-raport/raport.log 2>&1 # pznowak-raport' ) | crontab -
```

Sam skrypt na Hetznera kopiujesz z Maca (`scp`, patrz `scripts/backup/README.md`); repo na serwerze nie jest potrzebne. Po każdej zmianie tego pliku w repo trzeba go skopiować ponownie, bo sam się nie aktualizuje.

Cron liczy czas serwera (zwykle UTC): `0 6` to 7:00 zimą i 8:00 latem w Polsce.

# Tygodniowy raport Meta (Facebook i Instagram)

`raport-meta.py` wysyła w poniedziałek rano jeden mail o poprzednim tygodniu (pn–nd), tylko dla strony PZ Nowak
(id 518148711375873) i jej Instagrama. Konto reklamowe `act_129275718` prowadziło też inne strony; ich reklamy są pomijane.

- **Reklamy:** wydatek, wynik i koszt wyniku według rodzaju (nie sumujemy różnych wyników), kliknięcia w link i ich koszt,
  rozmowy; ostrzeżenie przy aktywnej kampanii z celem „Aktywność” lub „Rozpoznawalność” i przy 0 rozmów z kampanii na rozmowy.
- **Facebook:** wyświetlenia, odwiedziny i obserwujący (te same liczby co Business Suite), komentarze, udostępnienia i kliknięcia
  pod postami tygodnia, oraz ile postów linkuje do pznowak.pl, ile z UTM i ile do karty pierścionka (`/pierscionki/<slug>`).
- **Instagram:** wyświetlenia, zasięg, interakcje, kliknięcia w link w bio, posty z odesłaniem do strony. API pokazuje mniej
  wyświetleń niż Business Suite, bo nie dolicza reklam.
- **Zapytania:** rozmowy z reklam i nowe rozmowy na Messengerze. Zeszytu zapytań i Umami raport nie czyta.
- **Trend 8 tygodni** (tabela) i **WNIOSEK**: 3–5 zdań od Claude Sonnet 5.5 (effort high). Model dostaje tylko policzone liczby
  i krótki kontekst strategii (`KONTEKST` w skrypcie: zmień go, gdy zmieni się plan).

Definicje liczb są te same co w `pznowak-marketing/analiza-meta/metryki.py` (sprawdzone 28.11.2026 na tych samych wierszach API:
wydatki, kliknięcia, rozmowy i wyniki zgodne co do grosza; wyświetlenia, odwiedziny i obserwujący FB zgodne z eksportem Business Suite).
Skrypt jest w czystym Pythonie (stdlib), bo na Hetznerze nie ma pandas.

## Instalacja (z Maca, raz)

Wymaga: `~/.config/pznowak-raport/smtp.env` z raportu dziennego (ta sama skrzynka). Odbiorca jest osobny:
`RAPORT_META_TO` (domyślnie `kontakt@pznowak.pl`), więc zmiana `RAPORT_TO` raportu dziennego go nie rusza.

```sh
# skrypt (z katalogu repo, po każdej zmianie pliku)
scp scripts/raport/raport-meta.py hetzner-ts:pznowak-raport/
# token Meta tylko do odczytu, bez wypisywania na ekran
ssh hetzner-ts 'umask 077; cat > ~/.config/pznowak-raport/meta.token' < ~/.config/pznowak/meta-analityka.token
# klucz API Anthropic do wniosku (skopiuj klucz do schowka, potem):
pbpaste | ssh hetzner-ts 'umask 077; cat > ~/.config/pznowak-raport/anthropic.key'
```

Test bez wysyłki, potem z wysyłką, potem cron (poniedziałek 6:15 UTC, czyli 7:15 zimą i 8:15 latem w Polsce):

```sh
ssh hetzner-ts 'python3 ~/pznowak-raport/raport-meta.py --na-sucho'
ssh hetzner-ts 'python3 ~/pznowak-raport/raport-meta.py'
ssh hetzner-ts "( crontab -l 2>/dev/null | grep -v '# pznowak-raport-meta'; echo '15 6 * * 1 /usr/bin/python3 \$HOME/pznowak-raport/raport-meta.py >> \$HOME/pznowak-raport/raport-meta.log 2>&1 # pznowak-raport-meta' ) | crontab -"
```

Bez pliku `anthropic.key` skrypt próbuje `claude -p` (działa na Macu), a gdy i tego nie ma, wysyła raport z dopiskiem,
że wniosku zabrakło. Inny tydzień: `--tydzien 2026-11-16`; same liczby dla modelu: `--json`; bez modelu: `--bez-wniosku`.
