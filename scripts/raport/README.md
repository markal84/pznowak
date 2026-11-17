# Codzienny raport z Hetznera

`raport-dzienny.py` to zwykły skrypt (bez modelu), który raz dziennie wysyła jeden mail z wynikami sprawdzeń:

1. `https://pznowak.pl/` i `/admin` zwracają 200,
2. wiek ostatniej pełnej kopii (limit 26 h) i kopii bazy co 6 h (limit 7 h), wolne miejsce na dysku (próg 5 GB),
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

Sam skrypt na Hetznera kopiujesz z Maca (`scp`, patrz instrukcja w PR); repo na serwerze nie jest potrzebne.

Cron liczy czas serwera (zwykle UTC): `0 6` to 7:00 zimą i 8:00 latem w Polsce.
