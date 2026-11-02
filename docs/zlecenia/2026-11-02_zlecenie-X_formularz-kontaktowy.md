# Zlecenie X – formularz kontaktowy: gotowość do prawdziwej wysyłki + poprawki dla klienta

Data: 02.11.2026 · Zleca: Marcin (spisała Klaudia po przeglądzie /kontakt jako klient) · Model: **Opus 5.5 extra**.
Jedna sesja, bez subagentów. W chmurze: `_ZASADY-GIT.md` → „Sesja w chmurze”. Gałąź `feat/formularz-kontaktowy` od `origin/main`.

## Dlaczego
Formularz to główny cel strony: Michał ma dostawać zapytania o pierścionki bez przepisywania postów. Dziś wygląda dobrze
i ma już solidny backend (`cms/src/lib/submissions/*`: honeypot, token czasu, Cloudflare Turnstile, limity IP/dzienne,
kwarantanna, zapis szkicu w Payload, zdjęcia z biletami), ale **żaden mail do pracowni nie wychodzi** (brak adaptera
poczty → `notify.ts` ustawia `skipped`), a część kodu zakłada Vercela, choć produkcja będzie na **MyDevil (MD2)**.
Od 2027 celem są klienci z całej Polski, a strona mówi tylko „przyjdź do pracowni w Busku”.

**Nie przepisuj backendu od zera ani nie podmieniaj go na PHP czy gotową paczkę formularzy.** Najpierw oceń, co jest.
Zmieniaj tylko to, co realnie brakuje albo nie zadziała poza Vercelem.

## Etap 1 – audyt i plan (w opisie PR, sekcja „Co trzeba zdecydować” na górze)
Przejrzyj całą ścieżkę: `ContactForm.tsx` → `useSubmission.ts` → `/api/zgloszenia` (+ `zalaczniki`) → `handler.ts`
→ zapis → `notify.ts`. Odpowiedz krótko, punktami:
1. **Bezpieczeństwo:** czy czegoś brakuje (CSRF/Origin, rozmiar body, typy i rozmiar plików, nagłówki, wyciek danych
   klienta do logów, XSS w mailu/panelu, zakres dostępu do kolekcji zgłoszeń w Payload). Wskaż tylko realne luki.
2. **Przenośność na MyDevil:** co zależy od Vercela – `x-real-ip`/`x-forwarded-for` (za Cloudflare i nginx MyDevil
   właściwy będzie np. `CF-Connecting-IP`, ale tylko gdy ruch na pewno idzie przez Cloudflare), `VERCEL_ENV`
   w `allowTestingKeys`, Vercel Blob na zdjęcia, `after()`. Dla każdego: co zrobić, żeby działało w obu miejscach
   (zmienna środowiskowa, nie `if vercel`).
3. **Poczta:** zaproponuj transport. Domyślny kierunek: adapter SMTP Payloada (`@payloadcms/email-nodemailer`)
   konfigurowany wyłącznie zmiennymi (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), żeby po
   przeprowadzce poczty na MyDevil (planowana 06.11) wysyłał ze skrzynki pracowni. Alternatywę (np. Resend) opisz
   jednym zdaniem z kosztem i ryzykiem. Bez zakładania kont, bez kluczy w repo.
4. **Potwierdzenie dla klienta:** czy wysyłać klientowi mail „dostaliśmy, odezwiemy się” (tylko gdy podał e-mail).
   Plusy/minusy (spam, dostarczalność) – decyzja Marcina, nie wdrażaj bez niej.

## Etap 2 – do zrobienia w tym PR
1. **Adapter poczty SMTP** wg punktu 3, włączany tylko gdy są zmienne (bez nich zachowanie jak dziś: `skipped`).
   Mail do pracowni: temat z rodzajem sprawy i imieniem, treść jak w `summary.ts`, `Reply-To` = e-mail klienta, jeśli podał.
   Zmienne dopisz do `.env.example` z opisem.
2. **Poprawki przenośności** z punktu 2, które da się zrobić bez dostępu do serwera (konfigurowalny nagłówek IP,
   flaga środowiska testowego zamiast `VERCEL_ENV`). Blob na zdjęcia zostaje – tylko opisz w PR, co z nim przy MyDevil.
3. **Budżet** (`options.ts`, dziś „[przedział 1/2/3]”): opcje „Jeszcze nie wiem”, „do 4 000 zł”, „4 000–10 000 zł”,
   „powyżej 10 000 zł” oraz „Podam kwotę” → pole liczbowe (tylko cyfry, w zł, walidacja po stronie serwera).
4. **Klient spoza Buska** – nowe pole „Jak wolisz porozmawiać?” (wymagane, domyślnie pierwsze):
   „W pracowni w Busku-Zdroju” · „Telefonicznie albo przez wideo – mieszkam dalej”.
   - Wstęp strony: „Napisz kilka zdań, a oddzwonimy i ustalimy, jak się spotkać: w pracowni albo zdalnie.”
   - „Co dalej” zależnie od wyboru: przy zdalnej rozmowie krok 2 = „Pokazujemy kamienie i projekty na zdjęciach
     i filmach”. **Nie obiecuj wysyłki gotowej biżuterii** – to pytanie do Michała, wpisz je w PR.
   - Przy „Nie znam rozmiaru” i wyborze zdalnym podpowiedź: „Rozmiar zmierzy bez problemu każdy jubiler w Twojej okolicy.”
     Pracownia **nie wysyła miarek/obrączek do przymiarki** (ustalone z Michałem 01.11) – nigdzie tego nie proponuj.
   - Wybór trafia do zgłoszenia i maila.
5. **Preferowany kontakt** – „Jak się z Tobą skontaktować?”: Telefon · SMS · E-mail. Przy „E-mail” pole e-mail staje
   się wymagane (klient i serwer). Telefon zostaje wymagany w każdym przypadku.
6. **Czas odpowiedzi** – pod przyciskiem zamiast „Oddzwonimy w godzinach pracy pracowni.”:
   „Odpowiadamy zwykle tego samego lub następnego dnia roboczego.” (jako stała w jednym miejscu; Michał potwierdzi).
7. **Etykieta pola opisu** przy „Pierścionek lub obrączki na zamówienie”: „Co Ci się podoba?” → „Opisz, czego szukasz”.
8. **Godziny w opisach stron:** `kontakt/page.tsx` i `page.tsx` mają w `description` stare „Pon.–pt. 8–16, sob. 10–16”.
   Prawdziwe (Michał 01.11): pon.–pt. 9:00–16:30, sob. 9:00–13:00. Buduj opis z `SITE.hours`, nie z ręcznego tekstu.

## Czego nie robić
- Bez zmian w kafelkach spraw – **„Naprawa lub przeróbka” zostaje** (ustalone, usługa lokalna).
- Polityka prywatności „[wkrótce]” zostaje na preview – osobne zlecenie. Kreatora nie włączaj.
- Bez produkcji, bez zakładania kont u dostawców poczty, bez wysyłania maili do ludzi (testy na transporcie testowym).

## Sprawdzenie
- Testy jednostkowe/integracyjne: budżet (kwota tylko cyfry), wymagany e-mail przy „E-mail”, nowe pola w zgłoszeniu
  i treści maila, adapter wyłączony bez zmiennych, nagłówek IP z konfiguracji.
- e2e na preview: każdy typ sprawy, oba warianty „Jak wolisz porozmawiać?”, komunikaty błędów pól.
- Zrzuty 1440×900 i 375×812 formularza po zmianach. Lint, tsc, testy.
- Opis PR: najpierw „Co trzeba zdecydować” (etap 1 + pytania do Michała: wysyłka gotowej biżuterii, czas odpowiedzi),
  potem co zrobione, na górze „Do uruchomienia na Macu” (migracja stagingu, jeśli zmienia się kolekcja zgłoszeń).
  W `KOLEJKA.md` X → „do przeglądu Klaudii” + numer PR.
