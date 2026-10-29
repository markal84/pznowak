# Przekierowania ze starej strony pznowak.pl (Zlecenie D)

Stan na 22.10.2026. Źródło prawdy: `cms/src/lib/legacy-redirects.ts` (używa go `cms/next.config.ts`).
Tabele poniżej generuje `npm run seo:redirects-doc` (w katalogu `cms`); test
`cms/tests/int/legacy-redirects.int.spec.ts` pilnuje, żeby tabela i kod się nie rozjechały.

## Skąd wzięte adresy

1. **Mapa witryny obecnej strony** `https://pznowak.pl/sitemap.xml` (statyczny eksport, ostatnia zmiana
   6.02.2026): 39 adresów, wszystkie ze skośnikiem na końcu. Wszystkie wchodzą do tabeli.
2. **Google Search Console** (usługa domenowa `sc-domain:pznowak.pl`, odczyt Klaudii 22.10.2026): 11 adresów
   zindeksowanych, kolumna „W Google” poniżej. Eksport „Strony / Skuteczność” z 16 miesięcy nie był dostępny
   przy zleceniu, patrz „Do uzupełnienia z GSC”.
3. **Zaplecze WordPress** na tej samej domenie (`https://pznowak.pl/wp-sitemap.xml`, pod-mapy wskazują błędnie
   na `serwer1542079.home.pl/autoinstalator/pznowak/…`): wpisy typu `ring` (34), `gallery` (11), `page` (3),
   `post` (1), kategoria (1). Mapę użytkowników pominięto. Na pznowak.pl te adresy odpowiadają 200, ale ich
   adres kanoniczny wskazuje na home.pl, więc Google nie ma ich pod tą domeną. Przekierowania na nich są
   zabezpieczeniem, nie ratunkiem ruchu.
4. **Gałąź `production`** (wrzesień): nie zawiera katalogu z plikami HTML ani osobnej mapy; nic ponad powyższe.

## Zasady

- Jedno przekierowanie trwałe (HTTP 308) prosto na adres docelowy. Nie ma łańcuchów A → B → C.
- Wersja ze skośnikiem na końcu (`/katalog/aria/`) idzie **tym samym jednym skokiem** na adres bez skośnika.
  Wbudowane przekierowanie skośnika w Next działa przed przekierowaniami z konfiguracji i robiłoby dwa skoki,
  dlatego w `next.config.ts` jest `skipTrailingSlashRedirect: true`, a skośnik zdejmuje ogólna reguła
  na końcu listy (`/:path+/` → `/:path+`).
- Żaden stary adres nie idzie masowo na stronę główną.
- Slugi 34 pierścionków były identyczne w starym katalogu i w Payload (sprawdzone na bazie stagingowej
  i w `data/legacy/collection.json`). Zlecenie K zmienia 22 z nich na adres z nazwy karty (`merope-2` → `merope`,
  `pierscionek-8` → `pelagia`; lista `RENAMED_RING_SLUGS` w kodzie). `/katalog/<stary slug>` i `/ring/<stary slug>`
  idą **od razu** na nowy adres (jeden skok), a stary adres z nowego serwisu (`/pierscionki/merope-2`, źródło
  „nowy serwis”) też. **Kod i dane (slugi w CMS) wdrażamy razem**: przekierowanie na adres, którego jeszcze
  nie ma w bazie, daje 404.
- Przekierowania są w kodzie aplikacji, a nie w panelu Vercela, więc działają tak samo na własnym serwerze.

## Tabela przekierowań

<!-- tabela:start -->
| Stary adres | Nowy adres | Źródło adresu | W Google | Powód |
| --- | --- | --- | --- | --- |
| `/` | `/` | mapa witryny | tak | Ten sam adres; wersja ze skośnikiem na końcu (`/`) to ta sama strona. |
| `/kontakt` | `/kontakt` | mapa witryny | nie | Ten sam adres; wersja ze skośnikiem na końcu (`/kontakt/`) idzie jednym skokiem na adres bez skośnika. |
| `/katalog` | `/pierscionki` | mapa witryny | nie | Lista katalogu to dziś „Pierścionki”. |
| `/galeria` | `/realizacje` | mapa witryny | tak | Galeria zdjęć to dziś „Realizacje”. |
| `/o-nas` | `/pracownia` | mapa witryny | tak | Strona o rodzinie i pracowni. |
| `/index.html` | `/` | mapa witryny | nie | Stary eksport statyczny serwował też ten adres; ta sama strona główna. |
| `/katalog/merope-2` | `/pierscionki/merope` | mapa witryny | tak | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/merope-2` | `/pierscionki/merope` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/electra-2` | `/pierscionki/electra` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/electra-2` | `/pierscionki/electra` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/prometheus-2` | `/pierscionki/prometheus` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/prometheus-2` | `/pierscionki/prometheus` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/euterpe-2` | `/pierscionki/euterpe` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/euterpe-2` | `/pierscionki/euterpe` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/leto-2` | `/pierscionki/leto` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/leto-2` | `/pierscionki/leto` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/celaeno` | `/pierscionki/celaeno` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/celaeno` | `/pierscionki/celaeno` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/taygete` | `/pierscionki/taygete` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/taygete` | `/pierscionki/taygete` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/maia` | `/pierscionki/maia` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/maia` | `/pierscionki/maia` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/cassiopeia` | `/pierscionki/cassiopeia` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/cassiopeia` | `/pierscionki/cassiopeia` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/thalia` | `/pierscionki/thalia` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/thalia` | `/pierscionki/thalia` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/terpsichore` | `/pierscionki/terpsichore` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/terpsichore` | `/pierscionki/terpsichore` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-22` | `/pierscionki/daphne` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-22` | `/pierscionki/daphne` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-21` | `/pierscionki/pyrrha` | mapa witryny | tak | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-21` | `/pierscionki/pyrrha` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-20` | `/pierscionki/thalassa` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-20` | `/pierscionki/thalassa` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-19` | `/pierscionki/urania` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-19` | `/pierscionki/urania` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-18` | `/pierscionki/nyx` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-18` | `/pierscionki/nyx` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-17` | `/pierscionki/eirene` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-17` | `/pierscionki/eirene` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-16` | `/pierscionki/harmonia` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-16` | `/pierscionki/harmonia` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-15` | `/pierscionki/cyane` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-15` | `/pierscionki/cyane` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-14` | `/pierscionki/hestia` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-14` | `/pierscionki/hestia` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-13` | `/pierscionki/dione` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-13` | `/pierscionki/dione` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-12` | `/pierscionki/athena` | mapa witryny | tak | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-12` | `/pierscionki/athena` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-11` | `/pierscionki/chryse` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-11` | `/pierscionki/chryse` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-10` | `/pierscionki/phoebe` | mapa witryny | tak | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-10` | `/pierscionki/phoebe` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/aria` | `/pierscionki/aria` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/aria` | `/pierscionki/aria` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-9` | `/pierscionki/helios` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-9` | `/pierscionki/helios` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-8` | `/pierscionki/pelagia` | mapa witryny | tak | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-8` | `/pierscionki/pelagia` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/iris` | `/pierscionki/iris` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/iris` | `/pierscionki/iris` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/ione` | `/pierscionki/ione` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/ione` | `/pierscionki/ione` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/gaia` | `/pierscionki/gaia` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/gaia` | `/pierscionki/gaia` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/adamas` | `/pierscionki/adamas` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/adamas` | `/pierscionki/adamas` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/asteria` | `/pierscionki/asteria` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/asteria` | `/pierscionki/asteria` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-2` | `/pierscionki/delos` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-2` | `/pierscionki/delos` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/katalog/pierscionek-1` | `/pierscionki/egea` | mapa witryny | nie | Ten sam pierścionek; adres z nazwy karty zamiast numeru. |
| `/ring/pierscionek-1` | `/pierscionki/egea` | WordPress | nie | Wpis WordPress „ring”; adres z nazwy karty zamiast numeru. |
| `/pierscionki/merope-2` | `/pierscionki/merope` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/electra-2` | `/pierscionki/electra` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/prometheus-2` | `/pierscionki/prometheus` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/euterpe-2` | `/pierscionki/euterpe` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/leto-2` | `/pierscionki/leto` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-22` | `/pierscionki/daphne` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-21` | `/pierscionki/pyrrha` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-20` | `/pierscionki/thalassa` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-19` | `/pierscionki/urania` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-18` | `/pierscionki/nyx` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-17` | `/pierscionki/eirene` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-16` | `/pierscionki/harmonia` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-15` | `/pierscionki/cyane` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-14` | `/pierscionki/hestia` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-13` | `/pierscionki/dione` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-12` | `/pierscionki/athena` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-11` | `/pierscionki/chryse` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-10` | `/pierscionki/phoebe` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-9` | `/pierscionki/helios` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-8` | `/pierscionki/pelagia` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-2` | `/pierscionki/delos` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/pierscionki/pierscionek-1` | `/pierscionki/egea` | nowy serwis | nie | Adres z nazwy karty zamiast numeru ze starej strony. |
| `/gallery/przykladowe-zdjecie` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/zdjecie-2` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/galeria-3` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/zdjecie-4` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/zdjecie-5` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/pierscionek-6` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/pierscionek-77` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/pierscionek-88` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/pierscionek-99` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/piersionek-100` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
| `/gallery/pierscionek-101` | `/realizacje` | WordPress | nie | Wpis galerii WordPress; najbliższa lista to „Realizacje”. |
<!-- tabela:end -->

## Stare adresy bez odpowiednika (404)

Nie przekierowujemy ich na stronę główną ani na inną nieistotną stronę.

<!-- brak:start -->
| Stary adres | Co z nim |
| --- | --- |
| `/przykladowa-strona` | 404. Strona przykładowa WordPressa. |
| `/witaj-swiecie` | 404. Wpis przykładowy WordPressa. |
| `/category/bez-kategorii` | 404. Kategoria WordPressa bez treści. |
| `/feed` | 404. Kanał RSS WordPressa. |
| `/wp-json` | 404. API WordPressa. |
| `/wp-sitemap.xml` | 404. Mapa WordPressa z błędnym adresem witryny (home.pl); zastępuje ją /sitemap.xml. |
<!-- brak:end -->

## Do uzupełnienia z GSC

Po eksporcie z Search Console (raport „Strony”, ostatnie 16 miesięcy) porównać listę z tabelą powyżej.
Każdy adres z kliknięciami lub wyświetleniami, którego nie ma w tabeli, dopisać do `legacy-redirects.ts`,
uruchomić `npm run seo:redirects-doc` i test.
