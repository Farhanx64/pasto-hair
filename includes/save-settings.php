<?php

declare(strict_types=1);

require_once __DIR__ . '/load-settings.php';

function pasto_save_settings(array $settings, ?string &$error = null): bool
{
    $settingsPath = pasto_settings_file_path();
    $backupPath = pasto_settings_backup_path();
    $dir = dirname($settingsPath);

    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        $error = 'Unable to create settings directory.';
        return false;
    }

    $safeSettings = pasto_validate_settings($settings);
    $json = json_encode($safeSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        $error = 'Unable to encode settings JSON.';
        return false;
    }
    $json .= "\n";

    $tempPath = $settingsPath . '.tmp';
    $bytes = @file_put_contents($tempPath, $json, LOCK_EX);
    if ($bytes === false) {
        $error = 'Unable to write temporary settings file.';
        return false;
    }

    if (is_file($settingsPath)) {
        @copy($settingsPath, $backupPath);
    }

    if (!@rename($tempPath, $settingsPath)) {
        @unlink($tempPath);
        $error = 'Unable to replace settings file.';
        return false;
    }

    @chmod($settingsPath, 0644);
    return true;
}
