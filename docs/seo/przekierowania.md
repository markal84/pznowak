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
- Slugi 34 pierścionków są identyczne w starym katalogu i w Payload (sprawdzone na bazie stagingowej
  i w `data/legacy/collection.json`; w tym `pierscionek-8`, `-10`, `-12`, `-21`), więc `/katalog/<slug>` →
  `/pierscionki/<slug>` zawsze trafia w istniejącą stronę.
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
| `/katalog/merope-2` | `/pierscionki/merope-2` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/merope-2` | `/pierscionki/merope-2` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/electra-2` | `/pierscionki/electra-2` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/electra-2` | `/pierscionki/electra-2` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/prometheus-2` | `/pierscionki/prometheus-2` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/prometheus-2` | `/pierscionki/prometheus-2` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/euterpe-2` | `/pierscionki/euterpe-2` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/euterpe-2` | `/pierscionki/euterpe-2` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/leto-2` | `/pierscionki/leto-2` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/leto-2` | `/pierscionki/leto-2` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
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
| `/katalog/pierscionek-22` | `/pierscionki/pierscionek-22` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-22` | `/pierscionki/pierscionek-22` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-21` | `/pierscionki/pierscionek-21` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-21` | `/pierscionki/pierscionek-21` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-20` | `/pierscionki/pierscionek-20` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-20` | `/pierscionki/pierscionek-20` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-19` | `/pierscionki/pierscionek-19` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-19` | `/pierscionki/pierscionek-19` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-18` | `/pierscionki/pierscionek-18` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-18` | `/pierscionki/pierscionek-18` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-17` | `/pierscionki/pierscionek-17` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-17` | `/pierscionki/pierscionek-17` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-16` | `/pierscionki/pierscionek-16` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-16` | `/pierscionki/pierscionek-16` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-15` | `/pierscionki/pierscionek-15` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-15` | `/pierscionki/pierscionek-15` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-14` | `/pierscionki/pierscionek-14` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-14` | `/pierscionki/pierscionek-14` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-13` | `/pierscionki/pierscionek-13` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-13` | `/pierscionki/pierscionek-13` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-12` | `/pierscionki/pierscionek-12` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-12` | `/pierscionki/pierscionek-12` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-11` | `/pierscionki/pierscionek-11` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-11` | `/pierscionki/pierscionek-11` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-10` | `/pierscionki/pierscionek-10` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-10` | `/pierscionki/pierscionek-10` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/aria` | `/pierscionki/aria` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/aria` | `/pierscionki/aria` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-9` | `/pierscionki/pierscionek-9` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-9` | `/pierscionki/pierscionek-9` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-8` | `/pierscionki/pierscionek-8` | mapa witryny | tak | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-8` | `/pierscionki/pierscionek-8` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
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
| `/katalog/pierscionek-2` | `/pierscionki/pierscionek-2` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-2` | `/pierscionki/pierscionek-2` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
| `/katalog/pierscionek-1` | `/pierscionki/pierscionek-1` | mapa witryny | nie | Ten sam pierścionek, ten sam slug. |
| `/ring/pierscionek-1` | `/pierscionki/pierscionek-1` | WordPress | nie | Wpis WordPress „ring”; ten sam pierścionek. |
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
