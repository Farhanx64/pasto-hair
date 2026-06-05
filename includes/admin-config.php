<?php

declare(strict_types=1);

function pasto_admin_config(): array
{
    return [
        'session_name' => 'pasto_admin_session',
        'admins' => [
            [
                'username' => 'pasto',
                'display_name' => 'Pasto Admin',
                // Initial password is: 6412665
                // Replace this hash with your own password_hash value after first login.
                'password_hash' => '$2y$10$JReg5gvP7mvR32YO4hj4wu1I1O0l.nuPMfvEOS4dcqdwJDdau4L4K',
            ],
        ],
    ];
}

function pasto_admin_users(): array
{
    $config = pasto_admin_config();
    $users = [];

    foreach ($config['admins'] as $admin) {
        $hash = is_string($admin['password_hash'] ?? null) ? trim($admin['password_hash']) : '';

        if (!is_string($hash) || $hash === '') {
            continue;
        }

        $users[] = [
            'username' => (string)$admin['username'],
            'display_name' => (string)($admin['display_name'] ?? $admin['username']),
            'password_hash' => $hash,
        ];
    }

    return $users;
}
