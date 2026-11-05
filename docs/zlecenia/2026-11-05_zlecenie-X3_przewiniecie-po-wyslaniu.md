# Zlecenie X.3 – po wysłaniu formularza przewiń do „Wiadomość wysłana”

Data: 05.11.2026 · Zleca: Marcin (test Klaudii na telefonie) · Model: **Haiku 5.5 high** (jedna drobna poprawka). Nowa gałąź `fix/formularz-przewiniecie`, PR do `main`.

## Problem (sprawdzone 05.11 na podglądzie main, 375×812)
Po kliknięciu „Wyślij wiadomość” formularz zamienia się na kartę `.sent-card` (`cms/src/components/site/ContactForm.tsx`, gałąź `if (sent)`), ale strona się nie przewija.
Na telefonie karta jest ~1850 px nad ekranem, a klient widzi stopkę – wygląda, jakby nic się nie stało. Na desktopie mniej widoczne, ale też poza kadrem.

## Do zrobienia
1. Po przejściu w stan `sent` przewiń do karty: `scrollIntoView({ block: 'start', behavior })`, gdzie `behavior` = `'auto'` przy `prefers-reduced-motion: reduce`, inaczej `'smooth'`.
2. Karta nie może chować się pod przyklejonym nagłówkiem: `scroll-margin-top` na `.sent-card` równy wysokości nagłówka (+ trochę oddechu).
3. Ustaw fokus na karcie (`tabIndex={-1}`, `focus({ preventScroll: true })` po przewinięciu), żeby czytnik ekranu ogłosił „Wiadomość wysłana”. `role="status"` zostaje.
4. To samo dla „Napisz kolejną wiadomość” w drugą stronę: po powrocie do formularza przewiń do jego początku.
5. Test e2e (mobile 375×812): po wysłaniu `.sent-card` jest w widoku (`toBeInViewport`).

6. **Panel – opis pola „Weryfikacja”** (`cms/src/collections/Submissions.ts`, ok. l. 278): stały opis mówi o kwarantannie przy każdym zgłoszeniu, także zweryfikowanym, i myli. Zamień na opis wszystkich stanów, np.: „Zweryfikowane – przeszło Cloudflare Turnstile. Kwarantanna – Turnstile był niedostępny: sprawdź, czy to nie spam; wizualizacja tylko po ręcznym zatwierdzeniu.” Jeśli Payload pozwala, pokazuj ostrzeżenie tylko przy wartości „kwarantanna”.

## Ograniczenia
Bez zmian w treściach, walidacji i wysyłce. Bez produkcji. W `KOLEJKA.md` status „do przeglądu Klaudii” + numer PR.
