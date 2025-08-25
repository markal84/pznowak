<?php
// Prosty tester wysyłki mail() pod hosting (PHP 8.0 compatible)
// Użycie (GET):
// test-mail.php?to=adres@example.com&from=no-reply@twojadomena.pl&subject=Test&body=Hello&reply_to=kontakt@twojadomena.pl&mode=both

header('Content-Type: text/plain; charset=UTF-8');

function param($name, $default = '') { return isset($_GET[$name]) ? trim((string)$_GET[$name]) : $default; }

$to       = param('to');
$from     = param('from');
$replyTo  = param('reply_to', $from);
$subject  = param('subject', 'Test wiadomości (PHP mail)');
$bodyText = param('body', 'To jest testowa wiadomość wygenerowana przez test-mail.php');
$mode     = strtolower(param('mode', 'both')); // both | with_f | no_f

if (!$to || !$from) {
    http_response_code(400);
    echo "Brak wymaganych parametrów. Podaj ?to= i ?from=\n";
    exit;
}

// Prosty HTML body
$body = '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>Test mail()</title></head>' .
        '<body style="font-family:Arial,sans-serif">' .
        '<h2>Test mail() z serwera</h2>' .
        '<p>' . htmlspecialchars($bodyText) . '</p>' .
        '<hr><p style="color:#666;font-size:12px">Ten e-mail został wysłany testowo przez test-mail.php</p>' .
        '</body></html>';

// Nagłówki
$headers  = "From: $from\r\n";
$headers .= "Reply-To: $replyTo\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";
$headers .= "Content-Language: pl\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

$results = [
    'env' => [
        'php' => PHP_VERSION,
        'sendmail_path' => ini_get('sendmail_path'),
        'server' => $_SERVER['SERVER_NAME'] ?? '',
        'time' => date('c'),
    ],
    'input' => compact('to', 'from', 'replyTo', 'subject', 'mode'),
    'with_f' => null,
    'no_f' => null,
];

// Wysyłka z -f
if ($mode === 'both' || $mode === 'with_f') {
    $okF = @mail($to, $subject, $body, $headers, "-f $from");
    $results['with_f'] = $okF ? 'OK' : 'FAIL';
}

// Wysyłka bez -f
if ($mode === 'both' || $mode === 'no_f') {
    $okNoF = @mail($to, $subject, $body, $headers);
    $results['no_f'] = $okNoF ? 'OK' : 'FAIL';
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

