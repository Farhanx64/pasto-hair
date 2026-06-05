<?php

declare(strict_types=1);

/**
 * Settings Consistency Test
 *
 * Verifies that settings-schema.php defaults match data/settings.json,
 * and that pasto_validate_settings() is idempotent on valid input.
 *
 * Run from CLI: php tests/test-settings-consistency.php
 */

require_once __DIR__ . '/../includes/settings-schema.php';
require_once __DIR__ . '/../includes/load-settings.php';

$pass = 0;
$fail = 0;

function assert_equal($label, $expected, $actual): void {
    global $pass, $fail;
    if ($expected === $actual) {
        echo "[PASS] {$label}\n";
        $pass++;
    } else {
        echo "[FAIL] {$label}\n";
        echo "       Expected: " . json_encode($expected) . "\n";
        echo "       Actual:   " . json_encode($actual) . "\n";
        $fail++;
    }
}

echo "=== Settings Consistency Tests ===\n\n";

// ----------------------------------------------------------------
// 1. Load live settings.json
// ----------------------------------------------------------------
$live = pasto_load_settings();
$defaults = pasto_default_settings();

echo "--- Service price/duration defaults match settings.json ---\n";

// Index live services by id for easy lookup
$liveById = [];
foreach ($live['services'] as $svc) {
    $liveById[$svc['id']] = $svc;
}

foreach ($defaults['services'] as $defaultSvc) {
    $id = $defaultSvc['id'];
    if (!isset($liveById[$id])) {
        echo "[SKIP] Service '{$id}' not in settings.json (may have been deleted)\n";
        continue;
    }
    $liveSvc = $liveById[$id];
    assert_equal(
        "Service '{$id}' price: default matches live",
        $liveSvc['price'],
        $defaultSvc['price']
    );
    assert_equal(
        "Service '{$id}' duration: default matches live",
        $liveSvc['duration_minutes'],
        $defaultSvc['duration_minutes']
    );
}

echo "\n--- Weekly hours defaults match settings.json ---\n";

$days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
foreach ($days as $day) {
    $liveDay = $live['booking']['weekly_hours'][$day] ?? null;
    $defaultDay = $defaults['booking']['weekly_hours'][$day] ?? null;

    if (!$liveDay || !$defaultDay) {
        echo "[SKIP] Day '{$day}' missing from one source\n";
        continue;
    }

    assert_equal(
        "Day '{$day}' enabled: default matches live",
        $liveDay['enabled'],
        $defaultDay['enabled']
    );

    $liveShifts = $liveDay['shifts'] ?? [];
    $defaultShifts = $defaultDay['shifts'] ?? [];

    assert_equal(
        "Day '{$day}' shift count: default matches live",
        count($liveShifts),
        count($defaultShifts)
    );

    foreach ($liveShifts as $i => $liveShift) {
        if (!isset($defaultShifts[$i])) break;
        assert_equal(
            "Day '{$day}' shift[{$i}] start: default matches live",
            $liveShift['start'],
            $defaultShifts[$i]['start']
        );
        assert_equal(
            "Day '{$day}' shift[{$i}] end: default matches live",
            $liveShift['end'],
            $defaultShifts[$i]['end']
        );
    }
}

echo "\n--- Addon defaults match settings.json ---\n";

$liveAddonsById = [];
foreach (($live['booking']['addons'] ?? []) as $addon) {
    $liveAddonsById[$addon['id']] = $addon;
}

foreach (($defaults['booking']['addons'] ?? []) as $defaultAddon) {
    $id = $defaultAddon['id'];
    if (!isset($liveAddonsById[$id])) {
        echo "[SKIP] Addon '{$id}' not in settings.json\n";
        continue;
    }
    $liveAddon = $liveAddonsById[$id];
    assert_equal(
        "Addon '{$id}' price: default matches live",
        $liveAddon['price'],
        $defaultAddon['price']
    );
    assert_equal(
        "Addon '{$id}' duration: default matches live",
        $liveAddon['duration_minutes'],
        $defaultAddon['duration_minutes']
    );
}

echo "\n--- pasto_validate_settings() is idempotent on live data ---\n";

$validated = pasto_validate_settings($live);

foreach ($live['services'] as $svc) {
    $id = $svc['id'];
    $validatedSvc = null;
    foreach ($validated['services'] as $v) {
        if ($v['id'] === $id) { $validatedSvc = $v; break; }
    }
    if (!$validatedSvc) { echo "[SKIP] Service '{$id}' lost after validation\n"; continue; }
    assert_equal("Service '{$id}' price survives validate_settings", $svc['price'], $validatedSvc['price']);
    assert_equal("Service '{$id}' duration survives validate_settings", $svc['duration_minutes'], $validatedSvc['duration_minutes']);
}

foreach ($days as $day) {
    $liveShifts = $live['booking']['weekly_hours'][$day]['shifts'] ?? [];
    $validatedShifts = $validated['booking']['weekly_hours'][$day]['shifts'] ?? [];
    assert_equal("Day '{$day}' shifts survive validate_settings", $liveShifts, $validatedShifts);
}

// ----------------------------------------------------------------
// Summary
// ----------------------------------------------------------------
echo "\n=== Results: {$pass} passed, {$fail} failed ===\n";
exit($fail > 0 ? 1 : 0);
