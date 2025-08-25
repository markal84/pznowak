<?php
// Testowy wariant send-contact: pozwala przetestować różne nagłówki/tryby wysyłki autorespondera.
// Użycie: POST (application/x-www-form-urlencoded) z polami: name, email, subject, message, phone, website (honeypot)
// Opcje przez GET (opcjonalne):
//   ack_mode = minimal | minimal_no_f | current | no_ack (domyślnie: minimal)
//   from     = adres nadawcy/envelope (domyślnie: testwarsztat@michalnowak.com.pl)
//   to       = adres serwisowy (domyślnie: testwarsztat@michalnowak.com.pl)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json; charset=UTF-8');

function get_qs($key, $default = '') { return isset($_GET[$key]) ? trim((string)$_GET[$key]) : $default; }

$ackMode = get_qs('ack_mode', 'minimal'); // minimal|minimal_no_f|current|no_ack
$from    = get_qs('from', 'testwarsztat@michalnowak.com.pl');
$to      = get_qs('to',   'testwarsztat@michalnowak.com.pl');

// Honeypot
$honeypot = $_POST['website'] ?? '';
if (!empty($honeypot)) { echo json_encode(['ok' => false, 'error' => 'Spam wykryty.']); exit; }

// Dane
$data = $_POST;
$name    = trim($data['name']    ?? '');
$email   = trim($data['email']   ?? '');
$phone   = trim($data['phone']   ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

// Sanityzacja i limity
$name    = str_replace(["\r","\n"], ' ', $name);
$subject = str_replace(["\r","\n"], ' ', $subject);
if (mb_strlen($name) > 200)    { $name = mb_substr($name, 0, 200) . '…'; }
if (mb_strlen($email) > 200)   { $email = mb_substr($email, 0, 200); }
if (mb_strlen($phone) > 100)   { $phone = mb_substr($phone, 0, 100); }
if (mb_strlen($subject) > 200) { $subject = mb_substr($subject, 0, 200) . '…'; }
if (mb_strlen($message) > 5000){ $message = mb_substr($message, 0, 5000) . "\n… (obcięto)"; }

if (!$name || !$email || !$subject || !$message || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'error' => 'Nieprawidłowe dane wejściowe.']);
  exit;
}

// E-mail serwisowy (do nas)
$mailSubject = "Nowa wiadomość z formularza: $subject";
if (function_exists('mb_encode_mimeheader')) { $mailSubject = mb_encode_mimeheader($mailSubject, 'UTF-8'); }

$mailBody = '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>Nowa wiadomość</title></head><body style="font-family:Arial,sans-serif">'
  . '<h2>Nowa wiadomość z formularza</h2>'
  . '<p><strong>Imię i nazwisko:</strong> ' . htmlspecialchars($name) . '</p>'
  . '<p><strong>Email:</strong> ' . htmlspecialchars($email) . '</p>'
  . '<p><strong>Telefon:</strong> ' . htmlspecialchars($phone) . '</p>'
  . '<p><strong>Temat:</strong> ' . htmlspecialchars($subject) . '</p>'
  . '<div style="margin-top:12px;padding:10px;background:#f3f4f6;border-radius:6px"><strong>Wiadomość:</strong><br>' . nl2br(htmlspecialchars($message)) . '</div>'
  . '</body></html>';

$headers  = "From: $from\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";
$headers .= "Content-Language: pl\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

$okService = @mail($to, $mailSubject, $mailBody, $headers, "-f $from");

// Autoresponder (do klienta)
$ackOk = null; $ackHeadersUsed = '';
if ($ackMode !== 'no_ack') {
  $ackSubject = 'Dziękujemy za kontakt – PZ Nowak';
  if (function_exists('mb_encode_mimeheader')) { $ackSubject = mb_encode_mimeheader($ackSubject, 'UTF-8'); }
  $ackBody = '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>Dziękujemy</title></head><body style="font-family:Arial,sans-serif">'
    . '<h2>Dziękujemy za kontakt</h2>'
    . '<p>Otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej jak to możliwe.</p>'
    . '<p><strong>Podsumowanie:</strong></p>'
    . '<div style="margin-top:12px;padding:10px;background:#f3f4f6;border-radius:6px">' . nl2br(htmlspecialchars($message)) . '</div>'
    . '</body></html>';

  if ($ackMode === 'minimal' || $ackMode === 'minimal_no_f') {
    // Minimalny zestaw nagłówków – jak w teście, działał OK na Gmail
    $ackHeaders  = "From: $from\r\n";
    $ackHeaders .= "Reply-To: $from\r\n"; // można zmienić na firmowy kontakt
    $ackHeaders .= "MIME-Version: 1.0\r\n";
    $ackHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    $ackHeaders .= "Content-Transfer-Encoding: 8bit\r\n";
    $ackHeaders .= "Content-Language: pl\r\n";
    $ackHeaders .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $ackHeadersUsed = 'minimal' . ($ackMode === 'minimal_no_f' ? '_no_f' : '');
    if ($ackMode === 'minimal_no_f') {
      $ackOk = @mail($email, $ackSubject, $ackBody, $ackHeaders);
    } else {
      $ackOk = @mail($email, $ackSubject, $ackBody, $ackHeaders, "-f $from");
    }
  } else { // current
    $ackHeaders  = "From: $from\r\n";
    $ackHeaders .= "Reply-To: $to\r\n";
    $ackHeaders .= "MIME-Version: 1.0\r\n";
    $ackHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    $ackHeaders .= "Content-Transfer-Encoding: 8bit\r\n";
    $ackHeaders .= "Content-Language: pl\r\n";
    $ackHeaders .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $ackHeaders .= "Auto-Submitted: auto-generated\r\n";
    $ackHeaders .= "X-Auto-Response-Suppress: All\r\n";
    $ackHeadersUsed = 'current';
    $ackOk = @mail($email, $ackSubject, $ackBody, $ackHeaders, "-f $from");
  }
}

echo json_encode([
  'ok' => $okService ? true : false,
  'ack_ok' => $ackOk,
  'ack_mode' => $ackMode,
  'headers_used' => $ackHeadersUsed,
  'env' => [
    'php' => PHP_VERSION,
    'sendmail_path' => ini_get('sendmail_path'),
    'server' => $_SERVER['SERVER_NAME'] ?? '',
    'time' => date('c'),
  ],
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

