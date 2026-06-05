<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';

pasto_start_admin_session();

if (pasto_is_logged_in()) {
    header('Location: /admin/dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = isset($_POST['username']) ? (string)$_POST['username'] : '';
    $password = isset($_POST['password']) ? (string)$_POST['password'] : '';

    if (pasto_attempt_login($username, $password)) {
        header('Location: /admin/dashboard.php');
        exit;
    }

    $error = 'Invalid username or password.';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pasto Admin Login</title>
    <link rel="preload" as="style" href="/g/fonts.css?family=Oswald:400,700%7CMontserrat:400&display=swap">
    <link rel="stylesheet" media="print" onload="this.media='all'" href="/g/fonts.css?family=Oswald:400,700%7CMontserrat:400&display=swap">
    <link rel="stylesheet" href="/admin/admin.css">
</head>
<body>
<div class="admin-wrap">
    <div class="admin-card" style="max-width: 480px; margin: 40px auto 0;">
        <h1 class="admin-title">Pasto Admin</h1>
        <p class="admin-subtitle">Sign in to manage services and booking settings.</p>

        <?php if ($error !== ''): ?>
            <div class="flash flash-error"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
        <?php endif; ?>

        <form method="post" action="/admin/login.php" autocomplete="off">
            <label for="username">Username</label>
            <input id="username" name="username" type="text" required>

            <label for="password">Password</label>
            <input id="password" name="password" type="password" required>

            <button type="submit">Log In</button>
        </form>
    </div>
</div>
</body>
</html>
