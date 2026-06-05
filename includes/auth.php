<?php

declare(strict_types=1);

require_once __DIR__ . '/admin-config.php';

function pasto_start_admin_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $config = pasto_admin_config();
    if (!empty($config['session_name'])) {
        session_name((string)$config['session_name']);
    }

    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'cookie_samesite' => 'Lax',
        'use_strict_mode' => true,
    ]);
}

function pasto_is_logged_in(): bool
{
    pasto_start_admin_session();
    return isset($_SESSION['pasto_admin']) && is_array($_SESSION['pasto_admin']);
}

function pasto_current_admin_name(): string
{
    if (!pasto_is_logged_in()) {
        return '';
    }

    return (string)($_SESSION['pasto_admin']['display_name'] ?? 'Admin');
}

function pasto_attempt_login(string $username, string $password): bool
{
    pasto_start_admin_session();

    $username = trim($username);
    if ($username === '' || $password === '') {
        return false;
    }

    foreach (pasto_admin_users() as $admin) {
        if (!hash_equals($admin['username'], $username)) {
            continue;
        }

        if (password_verify($password, $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['pasto_admin'] = [
                'username' => $admin['username'],
                'display_name' => $admin['display_name'],
                'logged_in_at' => gmdate('c'),
            ];
            return true;
        }

        return false;
    }

    return false;
}

function pasto_require_login(): void
{
    if (pasto_is_logged_in()) {
        return;
    }

    header('Location: /admin/login.php');
    exit;
}

function pasto_logout(): void
{
    pasto_start_admin_session();

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }

    session_destroy();
}
