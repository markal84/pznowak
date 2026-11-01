# Zlecenie S – nowe pierścionki z FB: imiona z kanonu + publikacja na stagingu

Data: 01.11.2026 · Zleca: Marcin (spisała Klaudia) · Model: Sonnet 5.5 medium.
Jedna sesja, bez subagentów. W chmurze: `_ZASADY-GIT.md` → „Sesja w chmurze”. Gałąź od `origin/main`.
**Plik zlecenia leży na gałęzi `docs/zlecenie-s`** – dołącz go do swojego PR (`git checkout origin/docs/zlecenie-s -- docs/zlecenia/`).

## Dlaczego
Wszystkie opublikowane pierścionki mają imiona z mitologii greckiej (Merope, Cyane, Chryse, Pyrrha, Thalassa…; często imię
podpowiada kolor kamienia). 11 kart zaimportowanych z FB (staging, id 37–47) to szkice z opisowymi nazwami z postów, więc na
podglądzie ich nie widać. Marcin chce, żeby Michał i Kamila zobaczyli je **dziś** na podglądzie – z właściwymi imionami.

## Nazwy (zatwierdzone przez Marcina)
| id (staging) | Nazwa teraz | Nowa nazwa | slug |
|---|---|---|---|
| 37 | Brylant w szlifie szmaragdowym 0,41 ct | Leucothea | `leucothea` |
| 38 | Niebieski diament 0,21 ct w stylu art déco | Amphitrite | `amphitrite` |
| 39 | Oliwin w szlifie emerald | Chloris | `chloris` |
| 40 | Malinowy turmalin w oprawie halo | Erythea | `erythea` |
| 41 | Różowy turmalin w oprawie halo | Rhodope | `rhodope` |
| 42 | Ametyst owalny z diamentami | Ianthe | `ianthe` |
| 43 | Ametyst w szlifie oktagon z diamentami | Iole | `iole` |
| 44 | Agat w owalu z diamentami | Rhea | `rhea` |
| 45 | Morganit z diamentami na szynie pavé | Eos | `eos` |
| 46 | ETERNITY: kamienie kolorowe i brylanty | Aion | `aion` |
| 47 | Pierścionek zaręczynowy klienta (wyspa) | Calypso | `calypso` |
| – | Moissanit 2 ct szampański (karta 34 z L) | Aethra | `aethra` |
| – | Moissanit 1 ct brzoskwiniowo-złoty (karta 33 z L) | Hesperia | `hesperia` |

Opisowa nazwa nie znika: jeśli karta ma pole na podtytuł/opis kamienia, dotychczasowa nazwa (bez słowa „klienta”) idzie tam;
jeśli nie ma takiego pola – wstaw ją jako pierwsze zdanie opisu, o ile opis jej nie zawiera. Nie zmieniaj reszty treści.
Moissanity: jeśli na stagingu nie ma jeszcze ich kart, nic nie twórz – wpisz w `scripts/facebook/` (tam, gdzie import bierze nazwy)
albo w danych importu, że przy imporcie dostają te imiona, i opisz to w PR.

## Co zrobić
1. Skrypt `cms/scripts/staging-nazwy-s.ts` + `npm run staging:nazwy` (te same `--env-file` co `staging:seed`, strażnik
   `NEON_BRANCH=staging` jak w `seed-realizacje.ts`). Bez `--apply` tylko wypisuje plan. Szuka kart po **id i obecnej nazwie**
   (obie muszą się zgadzać; inaczej pomija z komunikatem – ktoś mógł już zmienić w panelu). Zmienia nazwę + slug, publikuje.
   Gdy publikacja nie przechodzi walidacji (brak wymaganego pola) – zostawia szkic z nową nazwą i wypisuje, czego brakuje.
   Idempotentny: drugie uruchomienie niczego nie zmienia.
2. Slugi szkiców nigdy nie były publiczne – przekierowań nie dodawaj. Sprawdź tylko, że nowe slugi nie kolidują z istniejącymi.
3. Jeśli w kodzie/testach/seedach są na sztywno stare nazwy tych 11 kart (np. `realizacje-data.ts` szuka „Pierścionek zaręczynowy
   klienta (wyspa)”), dodaj nową nazwę jako dopasowanie (stara też zostaje, PR #34 może być scalony przed albo po tym).
4. `KOLEJKA.md`: wiersz S → „do przeglądu Klaudii” + PR; w „Od Michała / Kamili” usuń punkt „Nazwa dla szkicu #47” (rozstrzygnięte: Calypso).

## Sprawdzenie
- Test int na lokalnej bazie (jak w R): plan, apply, drugi apply = 0 zmian, karta z ręcznie zmienioną nazwą pominięta.
- Na górze opisu PR: „Do uruchomienia na Macu: `cd cms && npm run staging:nazwy -- --apply`” (+ czy wcześniej `npm ci`).
- Produkcja – stop.
