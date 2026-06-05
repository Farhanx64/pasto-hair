<?php

declare(strict_types=1);

require_once __DIR__ . '/settings-schema.php';

function pasto_settings_file_path(): string
{
    return dirname(__DIR__) . '/data/settings.json';
}

function pasto_settings_backup_path(): string
{
    return dirname(__DIR__) . '/data/settings.json.bak';
}

function pasto_decode_settings(string $raw): ?array
{
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return null;
    }

    return pasto_validate_settings($decoded);
}

function pasto_load_settings(): array
{
    $settingsPath = pasto_settings_file_path();
    if (!is_file($settingsPath)) {
        return pasto_default_settings();
    }

    $handle = @fopen($settingsPath, 'rb');
    if ($handle === false) {
        return pasto_default_settings();
    }

    $raw = '';
    if (flock($handle, LOCK_SH)) {
        $raw = stream_get_contents($handle) ?: '';
        flock($handle, LOCK_UN);
    }
    fclose($handle);

    $safe = pasto_decode_settings($raw);
    if ($safe !== null) {
        return $safe;
    }

    $backupPath = pasto_settings_backup_path();
    if (is_file($backupPath)) {
        $backupRaw = (string)@file_get_contents($backupPath);
        $backupSafe = pasto_decode_settings($backupRaw);
        if ($backupSafe !== null) {
            return $backupSafe;
        }
    }

    return pasto_default_settings();
}
