# Zasady gita dla każdego zlecenia (obowiązują, jeśli zlecenie nie mówi inaczej)

1. **Start zawsze od świeżego `origin/main`:** `git fetch origin` →
   `git worktree add ../pznowak-cms-<krótka-nazwa> -b <typ>/<krótka-nazwa> origin/main`.
   Nigdy nie od bieżącej gałęzi w folderze ani od lokalnego `main` (bywa nieaktualny).
2. **Osobny worktree na zlecenie**, bo kilka zleceń idzie równolegle. W głównym folderze
   `/Volumes/crucial/projects/pznowak-cms` nie przełączać gałęzi, kiedy pracuje tam inny agent.
   Na koniec raport podaje ścieżkę worktree; Marcin usuwa go po scaleniu (`git worktree remove`).
3. **Nowa gałąź = nowe zlecenie.** Nie dopisywać commitów do gałęzi, której PR jest już scalony
   – wtedy nowa gałąź od `origin/main`.
4. Nazwy: `feat/…` (funkcja), `fix/…` (poprawka), `chore/…` (porządki, skrypty), `docs/…`.
5. **Koniec pracy:** push gałęzi + PR do `main` z linkiem do raportu i preview. Bez pushowania do `main` i `release`.
   Scala Marcin. Po scaleniu gałąź można skasować (zdalną i lokalną) – historia zostaje w `main`.
6. Przed PR: `git fetch && git rebase origin/main` (albo merge), jeśli `main` poszedł do przodu; konflikty opisać w raporcie.
7. `data/`, `.env*`, zrzuty i raporty (`docs/**/*.md`) poza gitem – jak dotąd.

## Sesja w chmurze (od 01.11.2026)
Gdy pracujesz w chmurze (Claude Code na GitHubie, bez dysku Marcina), zamiast punktów 1–2 i 7:
- **Bez worktree.** Masz własną kopię repo: `git fetch origin` → `git switch -c <typ>/<nazwa> origin/main`.
- **Raport = opis PR** (cały, po polsku, najpierw „co trzeba zdecydować”). Pliku raportu nie commituj.
  Zrzuty: jeśli umiesz je zrobić (Playwright), opisz w PR, co pokazują; Klaudia ogląda podgląd Vercela gałęzi.
- **Nie masz `.env*` ani dostępu do bazy/Bloba stagingu i produkcji.** Kod, migracje, skrypty i testy – tak.
  Wszystko, co trzeba odpalić na stagingu, zamknij w **jednej komendzie npm** i wpisz ją na górze opisu PR
  w sekcji „Do uruchomienia na Macu” – uruchomi ją Klaudia albo Marcin.
- W `KOLEJKA.md` (jest w repo) zmień status swojego zlecenia na „do przeglądu Klaudii” + numer PR – w tym samym PR.
- Stopy bez zmian: produkcja, wydatki, wiadomości do ludzi, decyzje Michała/Kamili.
