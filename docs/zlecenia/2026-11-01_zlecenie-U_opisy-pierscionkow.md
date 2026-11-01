# Zlecenie U – jednolite opisy pierścionków (lead + opis + parametry)

Data: 01.11.2026 · Zleca: Marcin (spisała Klaudia) · **Model: Opus 5.5 high** (decyzja Marcina – to praca redakcyjna).
Jedna sesja, bez subagentów. W chmurze: `_ZASADY-GIT.md` → „Sesja w chmurze”. Gałąź od `origin/main`, potem
`git checkout origin/docs/zlecenie-u -- cms/seed/opisy docs/zlecenia`.

## Dlaczego
Karty pierścionków są nierówne: część ma dobry lead i rzeczowy opis (wzór: **Chryse**, **Athena**, **Daphne**, **Pyrrha**),
część ma lead-wypełniacz („Elegancki pierścionek Leto”, „Ręcznie wykonany pierścionek, dopracowany w każdym detalu…”),
pusty opis (Merope, Leto, Maia, Electra) albo przeklejony post z FB („Co sądzicie?”, „napisz w komentarzu”, „Zapowiedź…”,
„Przedstawiamy Państwu”, ciekawostki o topazie Księżniczka Brazylii). Strona produktu ma sprzedawać pierścionek, nie powtarzać FB.

## Dane wejściowe
`cms/seed/opisy/stan-2026-11-01.json` – eksport 40 opublikowanych kart ze stagingu (id, name, slug, lead, description, metal,
stone, carats, clarity) z 01.11 ok. 13:00. **Jedyne źródło faktów.** Nic nie dopisuj z głowy (karaty, czystość, pochodzenie
kamienia, waga, czas wykonania). Jeśli danych brak – opis jest krótszy, a nie zgadnięty.

## Standard karty
**Lead** (pole `lead`, pod nazwą): jedno zdanie, 8–16 słów. Obraz + kamień + charakter. Bez nazwy pierścionka, bez ogólników,
które pasowałyby do każdej karty. Wzór tonu: „Słoneczny cytryn i świetlista oprawa — ciepło w szlachetnej formie.”

**Opis** (pole `description`): 2–3 krótkie akapity, razem **40–90 słów**:
1. Co to jest: kamień (kolor, szlif), oprawa/styl (halo, art déco, trilogy, solitaire, pavé…), kolor złota, a jeśli są w danych –
   masa kamieni, czystość, barwa, próba, waga.
2. Jak powstał: ręczna oprawa / wykonanie w pracowni – tylko w formie zgodnej z danymi albo ogólną prawdą o pracowni
   („Kamienie oprawiane ręcznie w naszej pracowni”).
3. Jedno zdanie o możliwości zamówienia (inny rozmiar / inny kamień centralny) – tam, gdzie dane o tym mówią albo fason jest
   wyraźnie seryjny. Bez CTA typu „napisz”, przycisk jest na stronie.
Opcjonalnie **jedno** rzetelne zdanie o kamieniu (twardość, barwa, pochodzenie z danych). **Bez wierzeń, „energii”,
„przynosi szczęście”**, rekordowych kryształów, Tiffany’ego i Elizabeth Taylor.

**Głos:** pracownia w liczbie mnogiej („robimy”, „oprawiamy”), bez „ja/mnie/przeze mnie”, bez emoji, bez pytań do czytelnika,
bez „Zapraszamy / Zapowiedź / Już wkrótce / Przedstawiamy Państwu / Kolejny / Pamiętacie”. Polska typografia: „0,41 ct”,
„próba 585”, „art déco”, półpauza z odstępami.

**Pola parametrów:** jeśli masa/czystość/barwa są w opisie, przenieś je też do `carats` / `clarity` (format jak w Leucothea:
„0,41 ct”, „VS2, barwa F”; przy kilku kamieniach: „0,39 ct + diamenty 0,18 ct”). `metal` ujednolić do istniejących wartości
(„Żółte”, „Białe”, „Żółte z białym”); puste uzupełnij tylko, gdy opis jasno mówi o kolorze złota. **Pola `stone` nie zmieniaj** –
podejrzane wartości wypisz w raporcie.

## Przypadki szczególne (rozstrzygnięte)
- **Aion** – nazwa zostaje „Aion” (bez dopisku). Lead i opis mówią, że to fason **eternity** w czterech wariantach kolorystycznych
  (szmaragd, różowy turmalin, niebieskie diamenty, białe brylanty – z danych). Akapit o *obrączce* z różowymi szafirami w różowym
  złocie dotyczy innej rzeczy – usuń go z opisu i wpisz w raporcie (oraz że `stone` = „Szafir różowy” jest pewnie z niego).
- **Calypso** – opis modelu (niebieski diament z białymi, białe złoto, ręcznie od podstaw, projekt na zamówienie), **bez** historii
  pary i wyspy (ta jest na /realizacje). Usuń pierwsze zdanie „Pierścionek zaręczynowy (wyspa).”.
- **Leucothea, Amphitrite, Chloris…** (11 kart z S) – usuń dopisane pierwsze zdanie z dawną nazwą, jeśli powtarza lead.
- **Thalassa** – opis mówi o brylantach i niebieskich diamentach, a `stone` = „Rubin, Diament”, próba „586” (prawdopodobnie 585).
  Opis napisz z tego, co pewne; obie niezgodności tylko do raportu (pytanie do Michała), nie zgaduj.

## Co dostarczyć
1. `cms/seed/opisy/opisy-u.json`: dla każdego id – `name` (bez zmian, do kontroli), `lead`, `description`, `metal`, `carats`,
   `clarity` (tylko zmienione pola + `id`, `name`).
2. `cms/seed/opisy/opisy-u.md` – czytelny podgląd dla Marcina i Michała: nazwa → nowy lead → nowy opis; na końcu lista
   „Do potwierdzenia przez Michała” (sprzeczności, braki danych).
3. Skrypt `cms/scripts/staging-opisy-u.ts` + `npm run staging:opisy` (env i strażnik `NEON_BRANCH=staging` jak `staging:nazwy`):
   bez `--apply` – plan (ile kart, które pola); z `--apply` – zapis, publikacja bez zmiany statusu. Dopasowanie po **id i nazwie**;
   **pomiń kartę, jeśli `updatedAt` > 2026-11-01T12:00:00Z** (ktoś ją ręcznie zmienił po eksporcie) – komunikat. Idempotentny.
   Na końcu jedno odświeżenie katalogu (jeśli skrypt nie może wołać `revalidateTag`, wypisz: „zapisz dowolną kartę w panelu”).
4. Testy int logiki (plan, pominięcie po dacie, idempotencja) + test „lintera treści” na `opisy-u.json`: brak emoji, brak fraz
   zakazanych (lista z sekcji Głos), lead 8–16 słów, opis 40–90 słów, brak „ja/mnie/przeze mnie”.
5. `KOLEJKA.md`: U → „do przeglądu Klaudii”. Na górze PR: „Do uruchomienia na Macu: `cd cms && npm run staging:opisy -- --apply`”.
Produkcja – stop.
