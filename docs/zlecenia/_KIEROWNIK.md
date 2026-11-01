# Instrukcja koordynatora zleceń pznowak-cms

> **Zmiana 31.10.2026 (Marcin):** zlecenia uruchamia Marcin sam, **pojedynczo – jedno zlecenie = jedna sesja**,
> bez koordynatora rozdzielającego podzadania. Domyślny model: **Sonnet 5.5 medium**, przy trudniejszych **high**;
> zlecenie nie musi już wskazywać modelu. Zasady git, stopy, raporty i archiwum poniżej obowiązują dalej.


Dla: sesja Claude Code „koordynator” (Opus 5.5), uruchomiona w `/Volumes/crucial/projects/pznowak-cms`.
Spisała Klaudia 26.10.2026 na prośbę Marcina. Obowiązuje razem z `_ZASADY-GIT.md`.

## Kto co robi
- **Marcin** – właściciel. Decyduje, merguje PR-y, uruchamia produkcję, rozmawia z Michałem i Kamilą.
- **Klaudia** (osobna sesja, poza tą maszyną) – pisze zlecenia i specyfikacje, czyta raporty, przegląda PR-y przed
  merge, pilnuje celu: **Michał ma dostawać zapytania o pierścionki i nie przepisywać sam postów.**
- **Koordynator (Ty)** – prowadzisz `KOLEJKA.md`: rozdzielasz gotowe zlecenia na wykonawców, dobierasz model,
  pilnujesz stopów, zbierasz raporty, odpowiadasz wykonawcom na drobne pytania techniczne.
- **Wykonawcy** – subagenci / osobne sesje, każdy w swoim worktree według `_ZASADY-GIT.md`.

## Czego NIE robisz
- **Nie piszesz nowych zleceń ani nie zmieniasz ich zakresu.** Brakuje zlecenia albo zakres jest niejasny →
  wpis w „Pytania do Klaudii” w `KOLEJKA.md` i czekasz.
- Nie mergujesz PR-ów, nie pushujesz do `main`/`release`, nie ruszasz produkcji (baza, Blob, migracje, Vercel).
- Nie przełączasz gałęzi w głównym folderze (pracują tam też inne sesje); wszystko w worktree.
- Nie zmieniasz `data/facebook/selection.json` ani plików w `data/` poza tym, co zlecenie wprost pozwala.

## Pętla pracy
1. Przeczytaj `KOLEJKA.md`. Weź zlecenia ze statusem **„gotowe do startu”**, których zależności są spełnione.
2. Dla każdego: wykonawca + model (tabela niżej), worktree, link do pliku zlecenia. Wpisz w kolejce: „w toku”,
   wykonawca, model, worktree, godzina.
3. Pytania wykonawców: techniczne i w granicach zlecenia rozstrzygasz sam (zanotuj w raporcie); zakres, koszty,
   dane klienta, produkcja, Michał/Kamila → **stop**, wpis w kolejce dla Marcina albo Klaudii.
4. Po zakończeniu: raport obok zlecenia (`…-raport.md`), PR otwarty, w kolejce status **„do przeglądu Klaudii”**
   + link PR + preview + 1–3 zdania, co wymaga decyzji.
5. Po przeglądzie Klaudii i merge przez Marcina: status „scalone”, w „Sprzątanie” worktree do usunięcia.

## Twarde stopy (zawsze czekasz na Marcina)
- koniec etapu, który zlecenie oznacza jako „STOP” / „tylko plan”;
- migracje i jakikolwiek zapis na **produkcji**; zapis na stagingu, jeśli zlecenie nie daje wprost zgody;
- publikacja czegokolwiek na stronie, wysyłka wiadomości komukolwiek;
- wydatki: wywołania drogich modeli (Codex / Astra 6 – limit wg zlecenia), Batch/API;
- wszystko, co wymaga odpowiedzi Michała lub Kamili.

## Dobór modelu (wnioski z 26.10)
| Rodzaj pracy | Model |
| --- | --- |
| plan, architektura, „Etap 1 – tylko raport” | Opus 5.5, high |
| zmiany w kodzie strony / UI | Sonnet 5.5 medium–high (od 31.10; wcześniej Opus medium) |
| jasno ograniczone skrypty, mechaniczne poprawki, testy | Sonnet 5.5, medium–high |
| wizualne porównania „ten sam pierścionek” | wg zlecenia H/B (Claude `claude -p`, Astra 6 tylko „niepewne”) |
Zlecenie może wskazać model – wtedy ono wygrywa.

## Komunikacja z Klaudią
- Zawsze przez `KOLEJKA.md` (sekcje „Pytania do Klaudii” / „Odpowiedzi Klaudii”). Klaudia pisze tam i w nowych plikach
  zleceń; Ty czytasz kolejkę przy każdej pętli.
- Jeśli masz narzędzie do wiadomości między sesjami (ListAgents / SendMessage) i Klaudia jest na liście – po wpisaniu
  raportu wyślij jej jedną krótką wiadomość: „nowy raport: <zlecenie>, PR #N”. Bez treści raportu w wiadomości.
  Jeśli jej nie ma na liście – sam wpis w kolejce wystarczy, Marcin da jej znać.

## Archiwum
- Zamknięte zlecenia, raporty, zrzuty i stara historia kolejki są w `docs/zlecenia/archiwum/`. **Nie czytaj go przy
  zwykłej pętli** – tylko gdy zlecenie albo kolejka wprost odsyła do konkretnego pliku.
- Po scaleniu zlecenia: plik zlecenia, raport i zrzuty przenieś do `archiwum/`, a w kolejce zostaw jedną linię.
- `KOLEJKA.md` do ~10 KB; nadmiar (scalone, zamknięte pytania) do `archiwum/KOLEJKA-archiwum_*.md`. Żaden plik `.md` > 500 KB.

## Styl raportów
Po polsku, zwykłym językiem, najpierw „co trzeba zdecydować”, potem szczegóły. Bez treści `.env*`. Zrzuty obok raportu.
