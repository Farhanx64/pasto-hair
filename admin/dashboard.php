<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/load-settings.php';
require_once __DIR__ . '/../includes/save-settings.php';

pasto_require_login();

$settings = pasto_load_settings();
$serviceCount = isset($settings['services']) && is_array($settings['services']) ? count($settings['services']) : 0;
$blockedCount = isset($settings['booking']['blocked_dates']) && is_array($settings['booking']['blocked_dates'])
    ? count($settings['booking']['blocked_dates'])
    : 0;

// Flash message handling
$flash = array('type' => '', 'message' => '');
if (isset($_SESSION['pasto_flash'])) {
    $flash = $_SESSION['pasto_flash'];
    unset($_SESSION['pasto_flash']);
}

function pasto_service_id_from_name(string $name): string
{
    $slug = strtolower(trim($name));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim((string)$slug, '-');
    return $slug !== '' ? $slug : 'service';
}

function pasto_is_valid_hhmm(string $time): bool
{
    if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
        return false;
    }

    $parts = explode(':', $time);
    $hour = (int)$parts[0];
    $minute = (int)$parts[1];

    return $hour >= 0 && $hour <= 23 && $minute >= 0 && $minute <= 59;
}

function pasto_time_to_minutes(string $time): int
{
    $parts = explode(':', $time);
    return ((int)$parts[0] * 60) + (int)$parts[1];
}

// Admin form actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pasto_action'])) {
    $action = $_POST['pasto_action'];

    if ($action === 'create_service') {
        $name = isset($_POST['name']) ? trim($_POST['name']) : '';
        $price = isset($_POST['price']) ? (float)$_POST['price'] : -1;
        $duration = isset($_POST['duration_minutes']) ? (int)$_POST['duration_minutes'] : 0;
        $active = isset($_POST['active']) && $_POST['active'] === '1';

        if (!isset($settings['services']) || !is_array($settings['services'])) {
            $settings['services'] = array();
        }

        if ($name === '') {
            $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => 'Service name is required.');
        } elseif ($price < 0) {
            $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => 'Price must be non-negative.');
        } elseif ($duration <= 0) {
            $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => 'Duration must be greater than zero.');
        } else {
            $newId = pasto_service_id_from_name($name);
            $existingIds = array();
            foreach ($settings['services'] as $service) {
                if (isset($service['id'])) {
                    $existingIds[] = (string)$service['id'];
                }
            }

            if (in_array($newId, $existingIds, true)) {
                $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => 'A service with this ID already exists. Please choose a different name.');
            } else {
                $maxSortOrder = 0;
                foreach ($settings['services'] as $service) {
                    $sortOrder = isset($service['sort_order']) ? (int)$service['sort_order'] : 0;
                    if ($sortOrder > $maxSortOrder) {
                        $maxSortOrder = $sortOrder;
                    }
                }

                $settings['services'][] = array(
                    'id' => $newId,
                    'name' => $name,
                    'price' => $price,
                    'duration_minutes' => $duration,
                    'active' => $active,
                    'sort_order' => $maxSortOrder + 10,
                );

                $error = null;
                if (pasto_save_settings($settings, $error)) {
                    $_SESSION['pasto_flash'] = array('type' => 'success', 'message' => "Service '{$name}' created successfully.");
                } else {
                    $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => $error ?: 'Failed to create service.');
                }
            }
        }

        $settings = pasto_load_settings();
        header('Location: /admin/dashboard.php');
        exit;
    }

    if ($action === 'update_weekly_hours') {
        $days = array('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
        $newWeeklyHours = array();

        foreach ($days as $day) {
            $enabled = isset($_POST['wh_enabled'][$day]);

            $shift1Start = isset($_POST['wh_shift1_start'][$day]) ? trim((string)$_POST['wh_shift1_start'][$day]) : '';
            $shift1End = isset($_POST['wh_shift1_end'][$day]) ? trim((string)$_POST['wh_shift1_end'][$day]) : '';
            $shift2Start = isset($_POST['wh_shift2_start'][$day]) ? trim((string)$_POST['wh_shift2_start'][$day]) : '';
            $shift2End = isset($_POST['wh_shift2_end'][$day]) ? trim((string)$_POST['wh_shift2_end'][$day]) : '';

            $shifts = array();
            $shiftInputs = array(
                array($shift1Start, $shift1End),
                array($shift2Start, $shift2End),
            );

            foreach ($shiftInputs as $index => $shiftInput) {
                $start = $shiftInput[0];
                $end = $shiftInput[1];
                $shiftLabel = $index + 1;

                if ($start === '' && $end === '') {
                    continue;
                }

                if ($start === '' || $end === '') {
                    $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => ucfirst($day) . " shift {$shiftLabel} requires both start and end.");
                    header('Location: /admin/dashboard.php');
                    exit;
                }

                if (!pasto_is_valid_hhmm($start) || !pasto_is_valid_hhmm($end)) {
                    $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => ucfirst($day) . " shift {$shiftLabel} time must be HH:MM.");
                    header('Location: /admin/dashboard.php');
                    exit;
                }

                if (pasto_time_to_minutes($end) <= pasto_time_to_minutes($start)) {
                    $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => ucfirst($day) . " shift {$shiftLabel} end must be after start.");
                    header('Location: /admin/dashboard.php');
                    exit;
                }

                $shifts[] = array('start' => $start, 'end' => $end);
            }

            $newWeeklyHours[$day] = array(
                'enabled' => $enabled,
                'shifts' => $shifts,
            );
        }

        if (!isset($settings['booking']) || !is_array($settings['booking'])) {
            $settings['booking'] = array();
        }
        $settings['booking']['weekly_hours'] = $newWeeklyHours;

        $error = null;
        if (pasto_save_settings($settings, $error)) {
            $_SESSION['pasto_flash'] = array('type' => 'success', 'message' => 'Weekly availability updated successfully.');
        } else {
            $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => $error ?: 'Failed to update weekly availability.');
        }

        $settings = pasto_load_settings();
        header('Location: /admin/dashboard.php');
        exit;
    }

    $serviceId = isset($_POST['service_id']) ? trim($_POST['service_id']) : '';

    // Find the service to edit
    $serviceIndex = -1;
    if ($serviceId && isset($settings['services']) && is_array($settings['services'])) {
        foreach ($settings['services'] as $idx => $service) {
            if ($service['id'] === $serviceId) {
                $serviceIndex = $idx;
                break;
            }
        }
    }

    if ($serviceIndex >= 0) {
        if ($action === 'edit') {
            // Edit service details
            $name = isset($_POST['name']) ? trim($_POST['name']) : '';
            $price = isset($_POST['price']) ? (float)$_POST['price'] : 0;
            $duration = isset($_POST['duration_minutes']) ? (int)$_POST['duration_minutes'] : 0;
            
            if (!$name) {
                $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => 'Service name is required.');
            } elseif ($price < 0 || $duration <= 0) {
                $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => 'Price must be non-negative and duration must be greater than zero.');
            } else {
                $settings['services'][$serviceIndex]['name'] = $name;
                $settings['services'][$serviceIndex]['price'] = $price;
                $settings['services'][$serviceIndex]['duration_minutes'] = $duration;
                
                $error = null;
                if (pasto_save_settings($settings, $error)) {
                    $_SESSION['pasto_flash'] = array('type' => 'success', 'message' => "Service '{$name}' updated successfully.");
                } else {
                    $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => $error ?: 'Failed to save service.');
                }
            }
        } elseif ($action === 'toggle') {
            // Toggle active status
            $settings['services'][$serviceIndex]['active'] = !$settings['services'][$serviceIndex]['active'];
            
            $error = null;
            if (pasto_save_settings($settings, $error)) {
                $newStatus = $settings['services'][$serviceIndex]['active'] ? 'active' : 'inactive';
                $_SESSION['pasto_flash'] = array('type' => 'success', 'message' => "Service is now {$newStatus}.");
            } else {
                $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => $error ?: 'Failed to update service.');
            }
        }
    } else {
        $_SESSION['pasto_flash'] = array('type' => 'error', 'message' => 'Service not found.');
    }
    
    // Reload settings after modification
    $settings = pasto_load_settings();
    header('Location: /admin/dashboard.php');
    exit;
}

// Determine if edit form should be shown
$editingServiceId = isset($_GET['edit']) ? trim($_GET['edit']) : '';
$editingService = null;
if ($editingServiceId && isset($settings['services']) && is_array($settings['services'])) {
    foreach ($settings['services'] as $service) {
        if ($service['id'] === $editingServiceId) {
            $editingService = $service;
            break;
        }
    }
}

$weeklyHours = (isset($settings['booking']['weekly_hours']) && is_array($settings['booking']['weekly_hours']))
    ? $settings['booking']['weekly_hours']
    : array();
$daysOfWeek = array(
    'sunday' => 'Sunday',
    'monday' => 'Monday',
    'tuesday' => 'Tuesday',
    'wednesday' => 'Wednesday',
    'thursday' => 'Thursday',
    'friday' => 'Friday',
    'saturday' => 'Saturday',
);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pasto Admin Dashboard</title>
    <link rel="preload" as="style" href="/g/fonts.css?family=Oswald:400,700%7CMontserrat:400&display=swap">
    <link rel="stylesheet" media="print" onload="this.media='all'" href="/g/fonts.css?family=Oswald:400,700%7CMontserrat:400&display=swap">
    <link rel="stylesheet" href="/admin/admin.css">
</head>
<body>
<div class="admin-wrap">
    <div class="topbar">
        <div>
            <h1 class="admin-title" style="margin: 0;">Dashboard</h1>
            <p class="admin-subtitle" style="margin: 2px 0 0;">Welcome, <?php echo htmlspecialchars(pasto_current_admin_name(), ENT_QUOTES, 'UTF-8'); ?></p>
        </div>
        <a class="button-link" href="/admin/logout.php">Log Out</a>
    </div>

    <?php if ($flash['type']): ?>
    <div class="flash flash-<?php echo htmlspecialchars($flash['type'], ENT_QUOTES, 'UTF-8'); ?>">
        <?php echo htmlspecialchars($flash['message'], ENT_QUOTES, 'UTF-8'); ?>
    </div>
    <?php endif; ?>

    <!-- Services Manager -->
    <div class="admin-card">
        <h2 style="margin-top: 0;">Services Manager</h2>

        <!-- Add Service Form -->
        <div class="edit-form-container" style="margin-bottom: 18px;">
            <form method="POST" class="service-edit-form">
                <input type="hidden" name="pasto_action" value="create_service">

                <h3 style="margin-top: 0; margin-bottom: 14px;">Add New Service</h3>

                <div class="form-row">
                    <div class="form-col">
                        <label for="new-name">Service Name</label>
                        <input type="text" id="new-name" name="name" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-col">
                        <label for="new-price">Price ($)</label>
                        <input type="number" id="new-price" name="price" min="0" step="0.01" required>
                    </div>
                    <div class="form-col">
                        <label for="new-duration">Duration (minutes)</label>
                        <input type="number" id="new-duration" name="duration_minutes" min="1" required>
                    </div>
                    <div class="form-col">
                        <label for="new-active">Active</label>
                        <select id="new-active" name="active">
                            <option value="1" selected>Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="button-primary">Add Service</button>
                </div>
            </form>
        </div>
        
        <?php if ($editingService): ?>
        <!-- Edit Service Form -->
        <div class="edit-form-container">
            <form method="POST" class="service-edit-form">
                <input type="hidden" name="pasto_action" value="edit">
                <input type="hidden" name="service_id" value="<?php echo htmlspecialchars($editingService['id'], ENT_QUOTES, 'UTF-8'); ?>">
                
                <h3 style="margin-top: 0; margin-bottom: 14px;">Edit: <?php echo htmlspecialchars($editingService['name'], ENT_QUOTES, 'UTF-8'); ?></h3>
                
                <div class="form-row">
                    <div class="form-col">
                        <label for="name">Service Name</label>
                        <input type="text" id="name" name="name" value="<?php echo htmlspecialchars($editingService['name'], ENT_QUOTES, 'UTF-8'); ?>" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <label for="price">Price ($)</label>
                        <input type="number" id="price" name="price" value="<?php echo htmlspecialchars((string)$editingService['price'], ENT_QUOTES, 'UTF-8'); ?>" min="0" step="0.01" required>
                    </div>
                    <div class="form-col">
                        <label for="duration_minutes">Duration (minutes)</label>
                        <input type="number" id="duration_minutes" name="duration_minutes" value="<?php echo (int)$editingService['duration_minutes']; ?>" min="1" required>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="button-primary">Save Changes</button>
                    <a href="/admin/dashboard.php" class="button-secondary">Cancel</a>
                </div>
            </form>
        </div>
        <?php endif; ?>

        <!-- Services Table -->
        <div class="services-table-wrapper">
            <table class="services-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    if (isset($settings['services']) && is_array($settings['services'])) {
                        usort($settings['services'], function($a, $b) {
                            return ($a['sort_order'] ?? 0) - ($b['sort_order'] ?? 0);
                        });
                        
                        foreach ($settings['services'] as $service): 
                    ?>
                    <tr>
                        <td><?php echo htmlspecialchars($service['name'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td>$<?php echo htmlspecialchars(rtrim(rtrim(number_format((float)$service['price'], 2, '.', ''), '0'), '.'), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td><?php echo (int)$service['duration_minutes']; ?> min</td>
                        <td>
                            <form method="POST" class="toggle-form" data-service-id="<?php echo htmlspecialchars($service['id'], ENT_QUOTES, 'UTF-8'); ?>">
                                <input type="hidden" name="pasto_action" value="toggle">
                                <input type="hidden" name="service_id" value="<?php echo htmlspecialchars($service['id'], ENT_QUOTES, 'UTF-8'); ?>">
                                <label class="checkbox-label">
                                    <input type="checkbox" class="toggle-checkbox" <?php echo $service['active'] ? 'checked' : ''; ?>>
                                    <span class="checkbox-mark"></span>
                                </label>
                            </form>
                        </td>
                        <td>
                            <a href="?edit=<?php echo urlencode($service['id']); ?>" class="button-edit">Edit</a>
                        </td>
                    </tr>
                    <?php 
                        endforeach;
                    } else {
                        echo '<tr><td colspan="5" style="text-align: center; padding: 20px;">No services found.</td></tr>';
                    }
                    ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Weekly Availability Editor -->
    <div class="admin-card" style="margin-top: 20px;">
        <h2 style="margin-top: 0;">Weekly Availability</h2>
        <p class="admin-subtitle" style="margin-top: 0;">Enable each day and set up to two shifts. Leave shift fields blank to disable that shift.</p>

        <form method="POST" class="service-edit-form">
            <input type="hidden" name="pasto_action" value="update_weekly_hours">

            <div class="services-table-wrapper">
                <table class="services-table">
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Enabled</th>
                            <th>Shift 1 Start</th>
                            <th>Shift 1 End</th>
                            <th>Shift 2 Start</th>
                            <th>Shift 2 End</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($daysOfWeek as $dayKey => $dayLabel): ?>
                        <?php
                        $dayData = isset($weeklyHours[$dayKey]) && is_array($weeklyHours[$dayKey])
                            ? $weeklyHours[$dayKey]
                            : array('enabled' => false, 'shifts' => array());
                        $dayEnabled = !empty($dayData['enabled']);
                        $dayShifts = isset($dayData['shifts']) && is_array($dayData['shifts']) ? $dayData['shifts'] : array();

                        $shift1Start = isset($dayShifts[0]['start']) ? (string)$dayShifts[0]['start'] : '';
                        $shift1End = isset($dayShifts[0]['end']) ? (string)$dayShifts[0]['end'] : '';
                        $shift2Start = isset($dayShifts[1]['start']) ? (string)$dayShifts[1]['start'] : '';
                        $shift2End = isset($dayShifts[1]['end']) ? (string)$dayShifts[1]['end'] : '';
                        ?>
                        <tr>
                            <td><?php echo htmlspecialchars($dayLabel, ENT_QUOTES, 'UTF-8'); ?></td>
                            <td>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="wh_enabled[<?php echo htmlspecialchars($dayKey, ENT_QUOTES, 'UTF-8'); ?>]" <?php echo $dayEnabled ? 'checked' : ''; ?>>
                                    <span class="checkbox-mark"></span>
                                </label>
                            </td>
                            <td>
                                <input type="time" name="wh_shift1_start[<?php echo htmlspecialchars($dayKey, ENT_QUOTES, 'UTF-8'); ?>]" value="<?php echo htmlspecialchars($shift1Start, ENT_QUOTES, 'UTF-8'); ?>">
                            </td>
                            <td>
                                <input type="time" name="wh_shift1_end[<?php echo htmlspecialchars($dayKey, ENT_QUOTES, 'UTF-8'); ?>]" value="<?php echo htmlspecialchars($shift1End, ENT_QUOTES, 'UTF-8'); ?>">
                            </td>
                            <td>
                                <input type="time" name="wh_shift2_start[<?php echo htmlspecialchars($dayKey, ENT_QUOTES, 'UTF-8'); ?>]" value="<?php echo htmlspecialchars($shift2Start, ENT_QUOTES, 'UTF-8'); ?>">
                            </td>
                            <td>
                                <input type="time" name="wh_shift2_end[<?php echo htmlspecialchars($dayKey, ENT_QUOTES, 'UTF-8'); ?>]" value="<?php echo htmlspecialchars($shift2End, ENT_QUOTES, 'UTF-8'); ?>">
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <div class="form-actions" style="margin-top: 16px;">
                <button type="submit" class="button-primary">Save Weekly Availability</button>
            </div>
        </form>
    </div>

    <!-- Settings Status -->
    <div class="admin-card" style="margin-top: 20px;">
        <p class="admin-subtitle">Phase 1-3 Status</p>
        <div class="admin-grid">
            <section class="panel">
                <h2>Settings Source</h2>
                <p>Central JSON file is initialized and readable.</p>
                <p style="margin-top: 8px;">Services loaded: <?php echo (int)$serviceCount; ?></p>
                <p>Blocked dates loaded: <?php echo (int)$blockedCount; ?></p>
            </section>
            <section class="panel">
                <h2>Admin Features Live</h2>
                <p>Services manager, service creation, and weekly availability editor are now live.</p>
            </section>
        </div>
    </div>
</div>

<script>
document.querySelectorAll('.toggle-checkbox').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
        this.closest('.toggle-form').submit();
    });
});
</script>
</body>
</html>
