<?php
// Pozwól na żądania CORS z localhost (tylko do testów!)
// Po wdrożeniu na produkcję ustaw tu swoją domenę zamiast *
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// send-contact.php
// Adres e-mail nadawcy i odbiorcy (zmień na adres domeny pznowak przed wdrożeniem produkcyjnym)
$from = 'testwarsztat@michalnowak.com.pl'; // <-- ZMIEŃ na adres z domeny pznowak przed produkcją
$to   = 'testwarsztat@michalnowak.com.pl'; // <-- ZMIEŃ na adres z domeny pznowak przed produkcją

header('Content-Type: application/json');

// Prosty honeypot (pole ukryte, nie powinno być wypełnione przez użytkownika)
$honeypot = $_POST['website'] ?? '';
if (!empty($honeypot)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Spam wykryty.']);
    exit;
}

// Prosty rate limiting na IP (max 2 wysyłki na 1 minuta)
$ip        = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile  = sys_get_temp_dir() . '/contact_rate_' . md5($ip);
$now       = time();
$window    = 60; // 1 minuta
$maxRequests = 2; // maksymalna liczba żądań w oknie czasowym

$requests = [];
if (file_exists($rateFile)) {
    $stored = file_get_contents($rateFile);
    $requests = json_decode($stored, true) ?: [];
    // zostaw tylko te w ostatniej minucie
    $requests = array_filter($requests, fn($t) => $t > $now - $window);
}

if (count($requests) >= $maxRequests) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Za dużo prób. Spróbuj ponownie później.']);
    exit;
}

// zapisz aktualny timestamp
$requests[] = $now;
file_put_contents($rateFile, json_encode($requests));

// Pobierz dane z żądania (obsługa JSON i application/x-www-form-urlencoded)
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $data = json_decode(file_get_contents('php://input'), true);
} else {
    $data = $_POST;
}

$name    = trim($data['name']    ?? '');
$email   = trim($data['email']   ?? '');
$phone   = trim($data['phone']   ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

// Ochrona przed wstrzyknięciem nagłówków w polach tekstowych
$name    = str_replace(["\r", "\n"], ' ', $name);
$subject = str_replace(["\r", "\n"], ' ', $subject);

// Limity długości – zapobieganie nadużyciom i ogromnym payloadom
if (mb_strlen($name) > 200)   { $name = mb_substr($name, 0, 200) . '…'; }
if (mb_strlen($email) > 200)  { $email = mb_substr($email, 0, 200); }
if (mb_strlen($phone) > 100)  { $phone = mb_substr($phone, 0, 100); }
if (mb_strlen($subject) > 200){ $subject = mb_substr($subject, 0, 200) . '…'; }
if (mb_strlen($message) > 5000){ $message = mb_substr($message, 0, 5000) . "\n… (obcięto)"; }

if (
    !$name ||
    !$email ||
    !$subject ||
    !$message ||
    !filter_var($email, FILTER_VALIDATE_EMAIL)
) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nieprawidłowe dane.']);
    exit;
}

$mailSubject = "Nowa wiadomość z formularza: $subject";
// Bezpieczne kodowanie tematu (diakrytyki)
if (function_exists('mb_encode_mimeheader')) {
    $mailSubject = mb_encode_mimeheader($mailSubject, 'UTF-8');
}

$mailBody = '<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Nowa wiadomość z formularza kontaktowego</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; color: #222; }
    .container { background: #fff; border-radius: 8px; max-width: 480px; margin: 24px auto; padding: 24px; box-shadow: 0 2px 8px #0001; }
    h2 { color: #1a202c; font-size: 1.3rem; margin-bottom: 1.2em; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; vertical-align: top; }
    .label { color: #555; font-weight: bold; width: 120px; }
    .value { color: #222; }
    .message { margin-top: 1.5em; padding: 1em; background: #f3f4f6; border-radius: 6px; color: #222; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Nowa wiadomość z formularza kontaktowego</h2>
    <table>
      <tr>
        <td class="label">Imię i nazwisko:</td>
        <td class="value">' . htmlspecialchars($name) . '</td>
      </tr>
      <tr>
        <td class="label">Email:</td>
        <td class="value">' . htmlspecialchars($email) . '</td>
      </tr>
      <tr>
        <td class="label">Telefon:</td>
        <td class="value">' . htmlspecialchars($phone) . '</td>
      </tr>
      <tr>
        <td class="label">Temat:</td>
        <td class="value">' . htmlspecialchars($subject) . '</td>
      </tr>
    </table>
    <div class="message">
      <strong>Wiadomość:</strong><br>
      ' . nl2br(htmlspecialchars($message)) . '
    </div>
  </div>
</body>
</html>';

// Nagłówki maila – niezbędne do wysyłki HTML
$headers  = "From: $from\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";
$headers .= "Content-Language: pl\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

// Wysyłka z parametrem -f (adres nadawcy musi być skrzynką na home.pl)
if (mail($to, $mailSubject, $mailBody, $headers, "-f $from")) {
    // Autoodpowiedź dla nadawcy (klienta)
    $ackSubject = 'Dziękujemy za kontakt – PZ Nowak';
    if (function_exists('mb_encode_mimeheader')) {
        $ackSubject = mb_encode_mimeheader($ackSubject, 'UTF-8');
    }
    $ackBody = '<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><title>Dziękujemy za wiadomość</title></head>
<body style="font-family: Arial, sans-serif; background:#f9f9f9; color:#222;">
  <div style="background:#fff; border-radius:8px; max-width:480px; margin:24px auto; padding:24px; box-shadow:0 2px 8px #0001;">
    <h2 style="color:#1a202c; font-size:1.2rem; margin:0 0 12px;">Dziękujemy za kontakt</h2>
    <p>Otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej jak to możliwe.</p>
    <p style="margin-top:16px; color:#444;"><strong>Podsumowanie:</strong></p>
    <p style="white-space:pre-wrap; background:#f3f4f6; padding:12px; border-radius:6px;">' . nl2br(htmlspecialchars($message)) . '</p>
    <p style="margin-top:16px; color:#666; font-size:12px;">Ta wiadomość została wygenerowana automatycznie. Nie odpowiadaj bezpośrednio na ten e-mail.</p>
  </div>
</body>
</html>';
    $ackHeaders  = "From: $from\r\n";
    $ackHeaders .= "Reply-To: $to\r\n";
    $ackHeaders .= "MIME-Version: 1.0\r\n";
    $ackHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    $ackHeaders .= "Content-Transfer-Encoding: 8bit\r\n";
    $ackHeaders .= "Content-Language: pl\r\n";
    $ackHeaders .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // wysyłka pomocnicza; brak wpływu na odpowiedź API
        @mail($email, $ackSubject, $ackBody, $ackHeaders, "-f $from");
    }
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Błąd wysyłki wiadomości.']);
}
