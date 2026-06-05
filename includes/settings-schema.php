<?php

declare(strict_types=1);

function pasto_day_order(): array
{
    return [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
    ];
}

function pasto_default_settings(): array
{
    return [
        'meta' => [
            'version' => 1,
            'last_updated' => gmdate('c'),
        ],
        'services' => [
            [
                'id' => 'classic-taper',
                'name' => 'Classic Taper',
                'price' => 35,
                'duration_minutes' => 45,
                'active' => true,
                'sort_order' => 10,
            ],
            [
                'id' => 'skin-fade',
                'name' => 'Skin Fade',
                'price' => 35,
                'duration_minutes' => 50,
                'active' => true,
                'sort_order' => 20,
            ],
            [
                'id' => 'clean-up',
                'name' => 'Clean Up',
                'price' => 20,
                'duration_minutes' => 20,
                'active' => true,
                'sort_order' => 30,
            ],
            [
                'id' => 'beard-sculpt-face-shave',
                'name' => 'Beard Sculpt or Face Shave',
                'price' => 10,
                'duration_minutes' => 30,
                'active' => true,
                'sort_order' => 40,
            ],
            [
                'id' => 'top-trim',
                'name' => 'Top Trim',
                'price' => 5,
                'duration_minutes' => 20,
                'active' => true,
                'sort_order' => 50,
            ],
            [
                'id' => 'wax-thread',
                'name' => 'Wax/Thread',
                'price' => 10,
                'duration_minutes' => 20,
                'active' => true,
                'sort_order' => 60,
            ],
            [
                'id' => 'perm',
                'name' => 'Perm',
                'price' => 100,
                'duration_minutes' => 120,
                'active' => true,
                'sort_order' => 70,
            ],
        ],
        'booking' => [
            'weekly_hours' => [
                'sunday' => [
                    'enabled' => true,
                    'shifts' => [
                        ['start' => '12:00', 'end' => '20:00'],
                        ['start' => '20:00', 'end' => '23:59'],
                    ],
                ],
                'monday' => [
                    'enabled' => true,
                    'shifts' => [
                        ['start' => '14:30', 'end' => '20:00'],
                        ['start' => '20:00', 'end' => '23:59'],
                    ],
                ],
                'tuesday' => [
                    'enabled' => true,
                    'shifts' => [
                        ['start' => '12:00', 'end' => '20:00'],
                        ['start' => '20:00', 'end' => '23:59'],
                    ],
                ],
                'wednesday' => [
                    'enabled' => true,
                    'shifts' => [
                        ['start' => '14:30', 'end' => '20:00'],
                        ['start' => '20:00', 'end' => '23:59'],
                    ],
                ],
                'thursday' => [
                    'enabled' => true,
                    'shifts' => [
                        ['start' => '12:00', 'end' => '20:00'],
                        ['start' => '20:00', 'end' => '23:59'],
                    ],
                ],
                'friday' => [
                    'enabled' => true,
                    'shifts' => [
                        ['start' => '14:00', 'end' => '20:00'],
                        ['start' => '20:00', 'end' => '23:59'],
                    ],
                ],
                'saturday' => [
                    'enabled' => true,
                    'shifts' => [
                        ['start' => '12:00', 'end' => '20:00'],
                        ['start' => '20:00', 'end' => '23:59'],
                    ],
                ],
            ],
            'blocked_dates' => [],
            'addons' => [
                [
                    'id' => 'beard-sculpt-addon',
                    'name' => 'Beard Sculpt or Face Shave',
                    'price' => 10,
                    'duration_minutes' => 30,
                    'active' => true,
                ],
                [
                    'id' => 'top-trim-addon',
                    'name' => 'Top Trim',
                    'price' => 5,
                    'duration_minutes' => 20,
                    'active' => true,
                ],
                [
                    'id' => 'wax-thread-addon',
                    'name' => 'Wax/Thread',
                    'price' => 10,
                    'duration_minutes' => 20,
                    'active' => true,
                ],
                [
                    'id' => 'hot-towel-addon',
                    'name' => 'Hot Towel',
                    'price' => 10,
                    'duration_minutes' => 10,
                    'active' => true,
                ],
            ],
        ],
    ];
}

function pasto_normalize_time($value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $value = trim($value);
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $value)) {
        return null;
    }

    return $value;
}

function pasto_normalize_shift($shift): ?array
{
    if (!is_array($shift)) {
        return null;
    }

    $start = pasto_normalize_time($shift['start'] ?? null);
    $end = pasto_normalize_time($shift['end'] ?? null);

    if ($start === null || $end === null || strcmp($start, $end) >= 0) {
        return null;
    }

    return ['start' => $start, 'end' => $end];
}

function pasto_slugify_name(string $name): string
{
    $slug = strtolower(trim($name));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    $slug = trim($slug, '-');

    return $slug !== '' ? $slug : 'item';
}

function pasto_normalize_services($services): array
{
    if (!is_array($services)) {
        return pasto_default_settings()['services'];
    }

    $normalized = [];
    $usedIds = [];
    $sortOrder = 10;

    foreach ($services as $service) {
        if (!is_array($service)) {
            continue;
        }

        $name = trim((string)($service['name'] ?? ''));
        if ($name === '') {
            continue;
        }

        $id = trim((string)($service['id'] ?? ''));
        $id = $id !== '' ? $id : pasto_slugify_name($name);
        if (isset($usedIds[$id])) {
            $id .= '-' . count($usedIds);
        }
        $usedIds[$id] = true;

        $price = is_numeric($service['price'] ?? null) ? (float)$service['price'] : 0.0;
        if ($price < 0) {
            $price = 0;
        }

        $duration = (int)($service['duration_minutes'] ?? 0);
        if ($duration <= 0) {
            $duration = 15;
        }

        $active = (bool)($service['active'] ?? false);
        $serviceSort = (int)($service['sort_order'] ?? $sortOrder);

        $normalized[] = [
            'id' => $id,
            'name' => $name,
            'price' => $price,
            'duration_minutes' => $duration,
            'active' => $active,
            'sort_order' => $serviceSort,
        ];

        $sortOrder += 10;
    }

    usort($normalized, static function (array $a, array $b): int {
        return $a['sort_order'] <=> $b['sort_order'];
    });

    return $normalized !== [] ? $normalized : pasto_default_settings()['services'];
}

function pasto_normalize_addons($addons): array
{
    if (!is_array($addons)) {
        return pasto_default_settings()['booking']['addons'];
    }

    $normalized = [];
    $usedIds = [];

    foreach ($addons as $addon) {
        if (!is_array($addon)) {
            continue;
        }

        $name = trim((string)($addon['name'] ?? ''));
        if ($name === '') {
            continue;
        }

        $id = trim((string)($addon['id'] ?? ''));
        $id = $id !== '' ? $id : pasto_slugify_name($name) . '-addon';
        if (isset($usedIds[$id])) {
            $id .= '-' . count($usedIds);
        }
        $usedIds[$id] = true;

        $price = is_numeric($addon['price'] ?? null) ? (float)$addon['price'] : 0.0;
        if ($price < 0) {
            $price = 0;
        }

        $duration = (int)($addon['duration_minutes'] ?? 0);
        if ($duration < 0) {
            $duration = 0;
        }

        $normalized[] = [
            'id' => $id,
            'name' => $name,
            'price' => $price,
            'duration_minutes' => $duration,
            'active' => (bool)($addon['active'] ?? false),
        ];
    }

    return $normalized !== [] ? $normalized : pasto_default_settings()['booking']['addons'];
}

function pasto_validate_settings(array $settings): array
{
    $defaults = pasto_default_settings();
    $safe = $defaults;

    if (isset($settings['meta']) && is_array($settings['meta'])) {
        $safe['meta']['version'] = (int)($settings['meta']['version'] ?? 1);
    }
    $safe['meta']['last_updated'] = gmdate('c');

    $safe['services'] = pasto_normalize_services($settings['services'] ?? null);

    $weeklyHours = $settings['booking']['weekly_hours'] ?? [];
    foreach (pasto_day_order() as $day) {
        $dayInput = is_array($weeklyHours) && isset($weeklyHours[$day]) && is_array($weeklyHours[$day])
            ? $weeklyHours[$day]
            : [];

        $safe['booking']['weekly_hours'][$day]['enabled'] = (bool)($dayInput['enabled'] ?? true);

        $shifts = [];
        $incomingShifts = $dayInput['shifts'] ?? [];
        if (is_array($incomingShifts)) {
            foreach ($incomingShifts as $shift) {
                $normalizedShift = pasto_normalize_shift($shift);
                if ($normalizedShift !== null) {
                    $shifts[] = $normalizedShift;
                }
            }
        }

        $safe['booking']['weekly_hours'][$day]['shifts'] = $shifts;
    }

    $safeBlockedDates = [];
    $blockedDates = $settings['booking']['blocked_dates'] ?? [];
    if (is_array($blockedDates)) {
        foreach ($blockedDates as $blockedDate) {
            if (is_string($blockedDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $blockedDate)) {
                $safeBlockedDates[] = $blockedDate;
            }
        }
    }
    $safe['booking']['blocked_dates'] = array_values(array_unique($safeBlockedDates));

    $safe['booking']['addons'] = pasto_normalize_addons($settings['booking']['addons'] ?? null);

    return $safe;
}
