# Kontakt: wysyłka maili — stan i diagnostyka (checkpoint)

- Problem: e‑mail potwierdzający DO klienta (autoresponder) nie dochodzi. E‑mail DO warsztatu (serwisowy) dochodzi.
- Środowisko: PHP 8.0 (home.pl), formularz wysyła POST do `.../autoinstalator/wordpress/send-contact.php`.

## Co działa / obserwacje
- Tester wysyłki (osobny plik) działa: `test-mail.php` wysyła do Gmaila zarówno z `-f` (with_f: OK), jak i bez `-f` (no_f: OK) dla nadawcy `testwarsztat@michalnowak.com.pl`. To sugeruje, że sam serwer i envelope-from są akceptowane.
- Formularz kontaktowy zwraca `200 OK` na POST do `send-contact.php`, ale UI nie pokazuje „Wysłaliśmy potwierdzenie…”, co implikuje że backend nie zwrócił `ack_ok: true` (być może w ogóle nie zwrócił `ack_ok`).

## Co potencjalnie nie działa
- Różnica w nagłówkach autorespondera w `send-contact.php` względem testera (np. `Auto-Submitted`, `X-Auto-Response-Suppress`, inny `Reply-To`) może obniżać dostarczalność do Gmaila.
- Możliwa różnica ścieżki: użytkownik zgłasza, że nie może trafić pod `send-contact-test.php` (404), mimo że plik jest wgrany „w tej samej lokalizacji” co `send-contact.php`.
  - Do weryfikacji: czy URL jest dokładnie taki sam katalog (np. `.../autoinstalator/wordpress/send-contact-test.php`).
  - Alternatywy: uprawnienia pliku, reguły serwera (np. blokady), literówki w nazwie.

## Pliki/zmiany w repo (do wgrania na serwer w razie potrzeby)
- `src/app/api/contact/send-contact.php`
  - Dodaje sanityzację, limity długości, bezpieczny temat (`mb_encode_mimeheader`).
  - Dodaje opcjonalne nagłówki w autoresponderze i logowanie `ack_ok` (w JSON).
- `src/app/api/contact/test-mail.php`
  - Prosty tester mail() — GET: `to`, `from`, `reply_to`, `subject`, `body`, `mode=both|with_f|no_f`. Zwraca JSON.
- `src/app/api/contact/send-contact-test.php`
  - Testowy odpowiednik `send-contact`: przyjmuje normalne POST jak formularz, a przez `ack_mode` (GET) pozwala przełączać tryby autorespondera:
    - `ack_mode=minimal`: nagłówki minimalne (jak w testerze), z `-f`.
    - `ack_mode=minimal_no_f`: j.w., bez `-f`.
    - `ack_mode=current`: nagłówki „bogatsze” (z Auto-Submitted/X-Auto-Response-Suppress), z `-f`.
    - `ack_mode=no_ack`: brak autorespondera.
  - Zwraca: `{ ok, ack_ok, ack_mode, headers_used, env }`.

## Hipotezy (dlaczego autoresponder nie dochodzi)
- Nagłówki w `send-contact.php` (wariant „current”) obniżają reputację/utrudniają dostarczalność do Gmaila.
- Brak faktycznego wywołania właściwego pliku (np. różny katalog/URL → brak `ack_ok` w odpowiedzi → UI nie pokazuje potwierdzenia).
- Mniej prawdopodobne: restrykcje hostingu dla drugiej wysyłki w jednym request (ale `ack_ok` powinien wtedy być `false`).

## Następne kroki (po wznowieniu)
1) Zweryfikować, czy POST do `send-contact.php` faktycznie zwraca `ack_ok` w JSON. Jeśli nie — pewnie stara wersja pliku/inna lokalizacja.
2) Udostępnić/jednoznacznie wskazać URL do `send-contact-test.php` (ta sama ścieżka co `send-contact.php`) i uruchomić testy:
   - `ack_mode=minimal`, następnie `minimal_no_f`, potem `current`.
   - Sprawdzić `ack_ok` i realne dostarczenie (Spam/Inbox).
3) W zależności od wyniku:
   - Jeśli `minimal`/`minimal_no_f` daje `ack_ok: true` i mail dochodzi → zastosować ten wariant nagłówków w produkcyjnym `send-contact.php` (ew. bez `-f` tylko dla autorespondera).
   - Jeśli `ack_ok: true`, a mail nadal niewidoczny → reputacja domeny: skonfigurować SPF (i najlepiej DKIM) dla `michalnowak.com.pl` lub wysyłać z firmowej skrzynki domeny serwisu.
4) Opcjonalnie: dodać w UI adnotację „(sprawdź folder Spam)” przy `ack_ok===true`.

## Fragment nagłówków „minimal” (proponowany dla autorespondera)
```
$ackHeaders  = "From: $from\r\n";
$ackHeaders .= "Reply-To: $from\r\n"; // lub kontakt@...
$ackHeaders .= "MIME-Version: 1.0\r\n";
$ackHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
$ackHeaders .= "Content-Transfer-Encoding: 8bit\r\n";
$ackHeaders .= "Content-Language: pl\r\n";
$ackHeaders .= "X-Mailer: PHP/" . phpversion() . "\r\n";
// Wysyłka: z -f lub bez, w zależności od testu
@mail($email, $ackSubject, $ackBody, $ackHeaders, "-f $from");
```

---
Ten plik jest punktem odniesienia po wznowieniu pracy: zaczniemy od potwierdzenia URL do testowego pliku i sprawdzenia, który `ack_mode` działa na Gmailu.
