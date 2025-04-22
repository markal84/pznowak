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
$to = 'testwarsztat@michalnowak.com.pl';   // <-- ZMIEŃ na adres z domeny pznowak przed produkcją

header('Content-Type: application/json');

// Prosty honeypot (pole ukryte, nie powinno być wypełnione przez użytkownika)
$honeypot = $_POST['website'] ?? '';
if (!empty($honeypot)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Spam wykryty.']);
    exit;
}

// Prosty rate limiting na IP (max 2 wysyłki na 1 minuta)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/contact_rate_' . md5($ip);
$now = time();
$window = 60; // 1 minuta
$maxRequests = 2; // maksymalna liczba żądań w oknie czasowym
$requests = [];
if (file_exists($rateFile)) {
    $requests = json_decode(file_get_contents($rateFile), true) ?: [];
    $requests = array_filter($requests, fn($t) => $t > $now - $window);
}
if (count($requests) >= $maxRequests) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Za dużo prób. Spróbuj ponownie później.']);
    exit;
}
$requests[] = $now;
file_put_contents($rateFile, json_encode($requests));

// Pobierz dane z żądania (obsługa JSON i application/x-www-form-urlencoded)
if ($_SERVER['CONTENT_TYPE'] === 'application/json') {
    $data = json_decode(file_get_contents('php://input'), true);
} else {
    $data = $_POST;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

if (!$name || !$email || !$subject || !$message || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nieprawidłowe dane.']);
    exit;
}

$mailSubject = "Nowa wiadomość z formularza: $subject";
$mailBody = "Imię i nazwisko: $name\nEmail: $email\nTemat: $subject\n\nWiadomość:\n$message";
$headers = "From: $from\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\nContent-type: text/plain; charset=UTF-8\r\n";

// Wysyłka z parametrem -f (adres nadawcy musi być skrzynką na home.pl)
if (mail($to, $mailSubject, $mailBody, $headers, "-f $from")) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Błąd wysyłki wiadomości.']);
}
?>
