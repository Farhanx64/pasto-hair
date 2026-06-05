<?php

declare(strict_types=1);

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

header('Content-Type: application/json');

require_once __DIR__ . '/../includes/load-settings.php';

$GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxGShAYOFFDQ1i3xctRlO6TuQosqN-mjkM2W02XzbD4_r-KdcoJsNMoKscZMYvVhymx6g/exec';

// Read and decode request body
$body = file_get_contents('php://input');
if (!$body) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing request body.']);
    exit;
}

$data = json_decode($body, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Request body must be valid JSON.']);
    exit;
}

// Server-side field validation
$name = trim((string)($data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$phone = trim((string)($data['phone'] ?? ''));
$service = trim((string)($data['service'] ?? ''));
$localDate = trim((string)($data['localDate'] ?? ''));
$localStartTime = trim((string)($data['localStartTime'] ?? ''));
$localEndTime = trim((string)($data['localEndTime'] ?? ''));

if (!$name || !$email || !$phone || !$service || !$localDate || !$localStartTime) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please complete all required fields.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email address is invalid.']);
    exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $localDate)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid date format.']);
    exit;
}

if (!preg_match('/^\d{2}:\d{2}$/', $localStartTime)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid time format.']);
    exit;
}

// Validate that the selected service exists in settings
$settings = pasto_load_settings();
$activeServices = [];
if (isset($settings['services']) && is_array($settings['services'])) {
    foreach ($settings['services'] as $svc) {
        if (!empty($svc['active'])) {
            $activeServices[$svc['name']] = $svc;
        }
    }
}

if (!isset($activeServices[$service])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Selected service is not available.']);
    exit;
}

// Validate that the selected date is not blocked
$blockedDates = $settings['booking']['blocked_dates'] ?? [];
if (in_array($localDate, $blockedDates, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'That date is not available.']);
    exit;
}

// Forward the validated request to Google Apps Script
$forwardPayload = json_encode($data);

$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
        'content' => $forwardPayload,
        'timeout' => 30,
        'follow_location' => 1,
        'max_redirects' => 5,
    ],
    'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
    ],
]);

$response = @file_get_contents($GAS_ENDPOINT, false, $context);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'Could not reach booking service. Please try again.']);
    exit;
}

$result = json_decode($response, true);
if (!is_array($result)) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'Booking service returned an unexpected response.']);
    exit;
}

http_response_code(200);
echo json_encode($result);
