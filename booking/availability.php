<?php

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/../includes/calendar-config.php';

$CALENDAR_TIMEZONE = 'America/New_York';

// -------------------------------------------------------
// Validate input
// -------------------------------------------------------
$date = trim((string)($_GET['date'] ?? ''));
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['busy' => [], 'error' => 'Invalid date format. Use YYYY-MM-DD.']);
    exit;
}

// Return empty if credentials are not yet configured
if (
    PASTO_CALENDAR_ID === 'REPLACE_WITH_YOUR_CALENDAR_ID' ||
    PASTO_CALENDAR_API_KEY === 'REPLACE_WITH_YOUR_GOOGLE_API_KEY'
) {
    echo json_encode(['busy' => []]);
    exit;
}

// -------------------------------------------------------
// Build the Free/Busy request covering the full day
// in the business timezone
// -------------------------------------------------------
try {
    $tz = new DateTimeZone($CALENDAR_TIMEZONE);

    $dayStart = new DateTime($date . ' 00:00:00', $tz);
    $dayEnd   = new DateTime($date . ' 23:59:59', $tz);

    $timeMin = $dayStart->format(DateTime::ATOM); // e.g. 2026-04-05T00:00:00-04:00
    $timeMax = $dayEnd->format(DateTime::ATOM);
} catch (Exception $e) {
    echo json_encode(['busy' => []]);
    exit;
}

$requestBody = json_encode([
    'timeMin'  => $timeMin,
    'timeMax'  => $timeMax,
    'timeZone' => $CALENDAR_TIMEZONE,
    'items'    => [['id' => PASTO_CALENDAR_ID]],
]);

$apiUrl = 'https://www.googleapis.com/calendar/v3/freeBusy?key=' . urlencode(PASTO_CALENDAR_API_KEY);

$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
        'content' => $requestBody,
        'timeout' => 8,
    ],
    'ssl' => [
        'verify_peer'      => true,
        'verify_peer_name' => true,
    ],
]);

$response = @file_get_contents($apiUrl, false, $context);

// Fail open: if the API is unreachable, return no busy blocks so the
// booking page still works (the submit-time conflict check stays as backup)
if ($response === false) {
    echo json_encode(['busy' => []]);
    exit;
}

$data = json_decode($response, true);
if (!is_array($data)) {
    echo json_encode(['busy' => []]);
    exit;
}

// Extract busy blocks and convert to New York local time strings
// so the client can compare directly to HH:MM slot strings
$rawBusy = $data['calendars'][PASTO_CALENDAR_ID]['busy'] ?? [];
$busy = [];

foreach ($rawBusy as $block) {
    if (empty($block['start']) || empty($block['end'])) continue;

    try {
        $startDt = new DateTime($block['start']);
        $endDt   = new DateTime($block['end']);
        $startDt->setTimezone($tz);
        $endDt->setTimezone($tz);

        $busy[] = [
            'start' => $startDt->format('H:i'), // "14:00"
            'end'   => $endDt->format('H:i'),   // "14:45"
        ];
    } catch (Exception $e) {
        // skip malformed block
    }
}

echo json_encode(['busy' => $busy]);
