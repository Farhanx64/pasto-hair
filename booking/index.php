<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/load-settings.php';

$settings = pasto_load_settings();

// Extract active services
$services = array();
if (isset($settings['services']) && is_array($settings['services'])) {
    foreach ($settings['services'] as $service) {
        if (isset($service['active']) && $service['active']) {
            $services[] = $service;
        }
    }
}

// Sort by sort_order
usort($services, function($a, $b) {
    return ($a['sort_order'] ?? 0) - ($b['sort_order'] ?? 0);
});

// Extract addons
$addons = array();
if (isset($settings['booking']['addons']) && is_array($settings['booking']['addons'])) {
    foreach ($settings['booking']['addons'] as $addon) {
        if (isset($addon['active']) && $addon['active']) {
            $addons[] = $addon;
        }
    }
}

// Extract weekly hours and blocked dates for client-side use
$weeklyHours = isset($settings['booking']['weekly_hours']) ? $settings['booking']['weekly_hours'] : array();
$blockedDates = isset($settings['booking']['blocked_dates']) ? $settings['booking']['blocked_dates'] : array();

// JSON encode for embedding in JavaScript
$weeklyHoursJson = json_encode($weeklyHours, JSON_UNESCAPED_SLASHES);
$blockedDatesJson = json_encode($blockedDates, JSON_UNESCAPED_SLASHES);
$servicesJson = json_encode($services, JSON_UNESCAPED_SLASHES);
$addonsJson = json_encode($addons, JSON_UNESCAPED_SLASHES);
?>
<!DOCTYPE html><html lang="en"><head><title>Booking - Pasto Hair</title><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><meta name="icbm" content="40.7128,-74.0060" /><meta name="geo.position" content="40.7128;-74.0060" /><meta name="geo.placename" content="New York" /><meta property="og:title" content="Booking - Pasto Hair" /><meta property="og:type" content="website" /><meta property="og:locale" content="en" /><meta property="og:url" content="https://pasto.hair/booking" /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="icon" href="data:," /><link rel="preconnect" href="" /><link rel="stylesheet" type="text/css" media="screen" href="/webcard/static/app.min.1773313769.css"/><link rel="stylesheet" type="text/css" media="screen" href="/css/custom.260314211752.css" id="customcss"/><link rel="canonical" href="https://pasto.hair/booking"/><script>if (!webcard) var webcard={};webcard.id=2922351;webcard.moduleId=27164439;webcard.culture="en";webcard.type=2;webcard.isEdit=false;webcard.isPreview=false;webcard.isMobile=/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);webcard.isTouch='ontouchstart' in window || navigator.msMaxTouchPoints > 0;webcard.googleMapsEmbedApiKey='AIzaSyDoOLq_ts27g3vEog9sGYB0GJSyWBDK9gs';webcard.googleMapsApiKey='';webcard.apiHost=location.host + '/api.php';var extraPath='';</script><link rel="preload" as="style" href="/g/fonts.css?family=Oswald:400,700%7CMontserrat:400&amp;display=swap" /><link rel="stylesheet" media="print" onload="this.media='all'" href="/g/fonts.css?family=Oswald:400,700%7CMontserrat:400&amp;display=swap" /><style>figure{margin:0}#ed-2184796959 { flex-basis: auto; } #ed-2184796965 { margin: auto 1rem auto auto; } @media screen and (max-width: 975px) {  #ed-2184796965 { margin: auto 1rem auto 0rem; }} #ed-2184796962 { flex-grow: 1; flex-basis: auto; } #ed-2184796962 > .inner { place-content: center flex-end; align-items: center; } @media screen and (max-width: 975px) {  #ed-2184796962 > .inner { justify-content: flex-end; }} #ed-2184796971 { flex-basis: auto; flex-grow: 1; } #ed-2185333227 > .inner { align-items: center; justify-content: space-between; } #ed-2185390581 img { width: auto; } #ed-2184795477 > .inner { justify-content: center; } #ed-2184795525 svg > * { stroke-width: 0px; } #ed-2184795525 svg { padding: 0px; } #ed-2184795528 { flex-grow: 1; } #ed-2184795531 svg > * { stroke-width: 0px; } #ed-2184795531 svg { padding: 0px; } #ed-2184795534 { flex-grow: 1; } #ed-2184795537 svg > * { stroke-width: 0px; } #ed-2184795537 svg { padding: 0px; } #ed-2184795540 { flex-grow: 1; } #ed-2184795516 > .inner { justify-content: center; } #ed-2185333224 > .inner { align-items: flex-start; justify-content: space-between; } @media screen and (max-width: 975px) {  #ed-2185333224 > .inner { justify-content: flex-start; }}</style></head><body class="page-27164439 pagelayout-1 slogan culture-en"><a href="#main-content" class="wv-link-content button">Skip to main content</a>
<div class="ed-element ed-reference ed-reference-container wv-boxed menu-wrapper wv-overflow_visible preset-menu-v2-home-7" id="ed-2185333227" data-reference="2184796956"><div class="inner"><div class="ed-element ed-logo" id="ed-2184796959"><a href="/"><h1><img src="/images/0/24031449/71aed167-246c-4eb6-aa99-5d067d1a0d37_removalai_preview-_z_Uo9Ocz3gRJjhMHoWVJQ.png" style="max-width:240px;max-height:80px;" alt="Pasto Hair"></h1></a></div><div class="ed-element ed-container mobile-cont wv-overflow_visible" id="ed-2184796962"><div class="inner"><figure class="ed-element ed-icon" id="ed-2184796965"><a href="tel:" title="Call"><svg xmlns="http://www.w3.org/2000/svg" viewBox="170 -787 659 875" data-icon="ico-phone" preserveAspectRatio="xMidYMid"><path d="M390.7 -496.7C270.4 -427.2 453.9 -83.1 585.6 -159.1L707.7 52.3C652.1 84.4 605.2 104.6 540.8 67.8 362 -34.4 165.2 -375.1 170.8 -578.3c1.9 -70.6 43.6 -98.3 97.9 -129.7 23.3 40.4 98.6 170.8 122 211.3zm50.4 -5.7c-13 7.5 -29.7 3.1 -37.3 -10l-115 -199.3c-7.5 -13 -3.1 -29.7 10 -37.3l60.5 -34.9c13 -7.5 29.7 -3.1 37.3 10L511.7 -574.6c7.5 13 3.1 29.7 -10 37.2l-60.6 35zM755.5 42.1c-13 7.5 -29.7 3.1 -37.3 -10l-115 -199.3c-7.5 -13 -3.1 -29.7 10 -37.3l60.5 -34.9c13 -7.5 29.7 -3.1 37.3 10L826.1 -30.1c7.5 13 3.1 29.7 -10 37.3l-60.6 34.9z"></path></svg></a></figure><div class="ed-element ed-html menu-trigger" id="ed-2184796968"><div class="menu-trigger-box"><button class="menu-trigger-inner">Menu</button></div></div></div></div><nav class="ed-element ed-menu wv-custom" id="ed-2184796971"><ul class="menu-level-0"><li class="wv-page-27164578-en first"><a href="/pricing" class="wv-page-27164578-en first">Pricing</a></li><li class="wv-page-27164581-en"><a href="/new-page" class="wv-page-27164581-en">Gallery</a></li><li class="wv-page-27164439-en active"><a href="/booking" class="wv-page-27164439-en active">Book Now</a></li><li class="end"><a href="#footer-2" class="last">Socials</a></li></ul></nav></div></div><div class="ed-element ed-container wv-boxed wv-spacer" id="ed-2185333230"><div class="inner"><div class="ed-element ed-html" id="ed-2190644574"><section class="booking-wrap">
  <div class="booking-card">
    <h2>Reserve Your Appointment</h2>
    <p>Select your service, choose a time, and receive a calendar invite by email.</p>
    <p id="booking-total" style="display:none;font-weight:600;font-size:1.1em;"></p>

    <form id="booking-form">
      <input type="text" name="name" placeholder="Full Name" required="">
      <input type="email" name="email" placeholder="Email Address" required="">
      <input type="tel" name="phone" placeholder="Phone Number" required="">

      <select name="service" id="service" required="">
        <option value="">Select a service</option>
        <?php 
        foreach ($services as $service):
            $price = number_format($service['price'], 2, '.', '');
            $price = rtrim(rtrim($price, '0'), '.');
            echo '<option value="' . htmlspecialchars($service['name'], ENT_QUOTES, 'UTF-8') . '" data-duration="' . (int)$service['duration_minutes'] . '">' 
                . htmlspecialchars($service['name'], ENT_QUOTES, 'UTF-8') 
                . ' - $' . htmlspecialchars($price, ENT_QUOTES, 'UTF-8') 
                . '</option>';
        endforeach;
        ?>
      </select>

      <div class="addon-group">
        <?php
        foreach ($addons as $addon):
            $price = number_format($addon['price'], 2, '.', '');
            $price = rtrim(rtrim($price, '0'), '.');
            $checkboxId = 'addon-' . htmlspecialchars($addon['id'], ENT_QUOTES, 'UTF-8');
        ?>
        <label class="addon-tile">
            <input type="checkbox" name="addon_<?php echo htmlspecialchars($addon['id'], ENT_QUOTES, 'UTF-8'); ?>" id="<?php echo $checkboxId; ?>" data-duration="<?php echo (int)$addon['duration_minutes']; ?>" data-addon-name="<?php echo htmlspecialchars($addon['name'], ENT_QUOTES, 'UTF-8'); ?>">
            <span>Add <?php echo htmlspecialchars($addon['name'], ENT_QUOTES, 'UTF-8'); ?> (+$<?php echo htmlspecialchars($price, ENT_QUOTES, 'UTF-8'); ?>)</span>
        </label>
        <?php endforeach; ?>
      </div>

      <input type="date" id="booking-date" name="date" required="">

      <select id="booking-time" name="time" required="">
        <option value="">Select a time</option>
      </select>

      <textarea name="notes" placeholder="Anything we should know?"></textarea>

      <button type="submit">Reserve Appointment</button>
      <p id="booking-message"></p>
    </form>
  </div>
</section>

<!-- Embed settings as JSON for client-side access -->
<script>
if (typeof pastoBookingData === 'undefined') {
    var pastoBookingData = {
        services: <?php echo $servicesJson; ?>,
        addons: <?php echo $addonsJson; ?>,
        weeklyHours: <?php echo $weeklyHoursJson; ?>,
        blockedDates: <?php echo $blockedDatesJson; ?>
    };
}
</script>

<script>
window.PASTO_DYNAMIC_BOOKING = true;
</script>

<!-- Booking Logic Override: Uses pastoBookingData instead of hardcoded values -->
<script>
(function() {
    'use strict';

    var SUBMIT_ENDPOINT = '/booking/submit.php';
    var BOOKING_TIME_ZONE = 'America/New_York';
    var EVENING_SHIFT_START = 20 * 60; // 20:00 in minutes since midnight
    var EVENING_SURCHARGE = 10;
    var isSubmitting = false;
    var lastSubmissionId = null;

    function generateSubmissionId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // Prevent custom.260314202111.js from interfering
    // We'll override its booking calculation with our settings-based logic

    /**
     * Get service duration from pastoBookingData by service name
     * @param {string} serviceName - Service name from form
     * @returns {number} Duration in minutes
     */
    function getServiceDuration(serviceName) {
        if (!pastoBookingData || !pastoBookingData.services) return 45; // fallback
        var service = pastoBookingData.services.find(function(s) { return s.name === serviceName; });
        return service ? service.duration_minutes : 45;
    }

    /**
     * Get selected add-on durations
     * @returns {number} Total add-on duration in minutes
     */
    function getAddonDuration() {
        var total = 0;
        if (!pastoBookingData || !pastoBookingData.addons) return total;
        
        var checkboxes = document.querySelectorAll('input[type="checkbox"][name^="addon_"]:checked');
        checkboxes.forEach(function(checkbox) {
            if (checkbox.dataset.duration) {
                total += parseInt(checkbox.dataset.duration, 10);
            }
        });
        return total;
    }

    /**
     * Get service base price from pastoBookingData by service name
     * @param {string} serviceName
     * @returns {number} Price in dollars
     */
    function getServicePrice(serviceName) {
        if (!pastoBookingData || !pastoBookingData.services) return 0;
        var service = pastoBookingData.services.find(function(s) { return s.name === serviceName; });
        return service ? (service.price || 0) : 0;
    }

    /**
     * Sum prices of all currently checked add-ons
     * @returns {number} Total addon price in dollars
     */
    function getAddonPrice() {
        var total = 0;
        if (!pastoBookingData || !pastoBookingData.addons) return total;
        var checkboxes = document.querySelectorAll('input[type="checkbox"][name^="addon_"]:checked');
        checkboxes.forEach(function(checkbox) {
            var addonId = checkbox.name.replace('addon_', '');
            var addon = pastoBookingData.addons.find(function(a) { return String(a.id) === addonId; });
            if (addon && addon.price) {
                total += addon.price;
            }
        });
        return total;
    }

    /**
     * Calculate the total price including evening surcharge if applicable
     * @param {string} serviceName
     * @param {string} timeValue - HH:MM or empty string
     * @returns {{total: number, hasEveningSurcharge: boolean}}
     */
    function calculateTotal(serviceName, timeValue) {
        var base = getServicePrice(serviceName) + getAddonPrice();
        var hasEveningSurcharge = timeValue ? (timeToMinutes(timeValue) >= EVENING_SHIFT_START) : false;
        return {
            total: base + (hasEveningSurcharge ? EVENING_SURCHARGE : 0),
            hasEveningSurcharge: hasEveningSurcharge
        };
    }

    /**
     * Update the total price display in the booking header
     */
    function updateTotalDisplay() {
        var totalEl = document.getElementById('booking-total');
        if (!totalEl) return;

        var serviceSelect = document.getElementById('service');
        var timeSelect = document.getElementById('booking-time');
        var service = serviceSelect ? serviceSelect.value : '';
        var time = timeSelect ? timeSelect.value : '';

        if (!service) {
            totalEl.style.display = 'none';
            return;
        }

        var result = calculateTotal(service, time);
        var text = 'Total: $' + result.total;
        if (result.hasEveningSurcharge) {
            text += ' (includes $' + EVENING_SURCHARGE + ' evening rate)';
        }
        totalEl.textContent = text;
        totalEl.style.display = '';
    }

    /**
     * Get selected add-on names from checked addon_* inputs
     * @returns {array} Add-on names
     */
    function getSelectedAddonNames() {
        var selected = [];
        if (!pastoBookingData || !pastoBookingData.addons) return selected;

        var checkboxes = document.querySelectorAll('input[type="checkbox"][name^="addon_"]:checked');
        checkboxes.forEach(function(checkbox) {
            if (checkbox.dataset.addonName) {
                selected.push(checkbox.dataset.addonName);
                return;
            }

            var addonId = checkbox.name.replace('addon_', '');
            var addon = pastoBookingData.addons.find(function(a) { return String(a.id) === addonId; });
            if (addon && addon.name) {
                selected.push(addon.name);
            }
        });

        return selected;
    }

    /**
     * Get available time slots for a given date
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @param {number} serviceDuration - Total duration needed (minutes)
     * @returns {array} Array of available time strings (HH:MM)
     */
    function getAvailableSlots(dateStr, serviceDuration) {
        if (!pastoBookingData || !pastoBookingData.weeklyHours) return [];

        // Check if date is blocked
        if (pastoBookingData.blockedDates && pastoBookingData.blockedDates.indexOf(dateStr) !== -1) {
            return [];
        }

        var date = new Date(dateStr + 'T00:00:00');
        var dayOfWeek = date.getDay();
        var dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        var dayName = dayNames[dayOfWeek];

        var dayHours = pastoBookingData.weeklyHours[dayName];
        if (!dayHours || !dayHours.enabled) return [];

        var slots = [];
        var shifts = dayHours.shifts || [];

        shifts.forEach(function(shift) {
            if (!shift.start || !shift.end) return;

            var start = timeToMinutes(shift.start);
            var end = timeToMinutes(shift.end);

            // Generate 15-minute intervals
            for (var time = start; time + serviceDuration <= end; time += 15) {
                slots.push(minutesToTime(time));
            }
        });

        return slots;
    }

    /**
     * Convert time string (HH:MM) to minutes since midnight
     * @param {string} timeStr - Time string
     * @returns {number} Minutes
     */
    function timeToMinutes(timeStr) {
        var parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    /**
     * Convert minutes since midnight to time string (HH:MM)
     * @param {number} minutes - Minutes
     * @returns {string} Time string
     */
    function minutesToTime(minutes) {
        var hours = Math.floor(minutes / 60);
        var mins = minutes % 60;
        return (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins;
    }

    /**
     * Format 24-hour time (HH:MM) to 12-hour display
     */
    function formatTime(time24) {
        var parts = time24.split(':');
        var h = parseInt(parts[0], 10);
        var m = parts[1];
        var suffix = h >= 12 ? 'PM' : 'AM';
        var hour12 = ((h + 11) % 12) + 1;
        return hour12 + ':' + m + ' ' + suffix;
    }

    /**
     * Format a Date instance as HH:MM using local browser time
     */
    function formatTimeValue(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
    }

    /**
     * Parse a booking service response and surface clearer errors
     */
    async function parseBookingResponse(response) {
        var raw = await response.text();

        if (!raw) {
            throw new Error('Booking service returned an empty response.');
        }

        try {
            return JSON.parse(raw);
        } catch (parseError) {
            if (!response.ok) {
                throw new Error('Booking service returned HTTP ' + response.status + '.');
            }

            throw new Error('Booking service returned an invalid response.');
        }
    }

    /**
     * Keep add-on tile visual state synced with checkbox state
     */
    function syncAddonTile(checkbox) {
        var tile = checkbox.closest('.addon-tile');
        if (!tile) return;
        tile.classList.toggle('is-selected', checkbox.checked);
    }

    /**
     * Fetch busy time blocks from the server-side Calendar Free/Busy proxy.
     * Returns an array of {start, end} objects in HH:MM New York local time.
     * On any error, returns [] so the page still works (fail-open).
     * @param {string} dateStr - YYYY-MM-DD
     * @returns {Promise<Array>}
     */
    async function fetchBusySlots(dateStr) {
        try {
            var res = await fetch('/booking/availability.php?date=' + encodeURIComponent(dateStr), {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) return [];
            var data = await res.json();
            return Array.isArray(data.busy) ? data.busy : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Check whether a slot [slotStartMinutes, slotStartMinutes + duration]
     * overlaps any busy block in the array.
     * Busy blocks are {start: "HH:MM", end: "HH:MM"} in the same timezone.
     * @param {number} slotStart - Slot start in minutes since midnight
     * @param {number} duration  - Duration in minutes
     * @param {Array}  busyBlocks
     * @returns {boolean}
     */
    function slotOverlapsBusy(slotStart, duration, busyBlocks) {
        var slotEnd = slotStart + duration;
        for (var i = 0; i < busyBlocks.length; i++) {
            var busyStart = timeToMinutes(busyBlocks[i].start);
            var busyEnd   = timeToMinutes(busyBlocks[i].end);
            // Standard overlap: slot starts before busy ends AND slot ends after busy starts
            if (slotStart < busyEnd && slotEnd > busyStart) {
                return true;
            }
        }
        return false;
    }

    /**
     * Update available time slots when date or service changes.
     * Fetches real-time busy blocks from Google Calendar and filters them out.
     */
    async function updateTimeSlots() {
        var dateInput = document.getElementById('booking-date');
        var serviceSelect = document.getElementById('service');
        var timeSelect = document.getElementById('booking-time');

        if (!dateInput || !serviceSelect || !timeSelect) return;

        var selectedDate = dateInput.value;
        var selectedService = serviceSelect.value;

        if (!selectedDate || !selectedService) {
            timeSelect.innerHTML = '<option value="">Select a time</option>';
            return;
        }

        var serviceDuration = getServiceDuration(selectedService);
        var addonDuration = getAddonDuration();
        var totalDuration = serviceDuration + addonDuration;

        // Show loading state while fetching availability
        timeSelect.innerHTML = '<option value="">Checking availability\u2026</option>';
        timeSelect.disabled = true;

        var allSlots = getAvailableSlots(selectedDate, totalDuration);
        var busyBlocks = await fetchBusySlots(selectedDate);

        // Filter out slots that overlap any busy block
        var availableSlots = allSlots.filter(function(slot) {
            return !slotOverlapsBusy(timeToMinutes(slot), totalDuration, busyBlocks);
        });

        timeSelect.disabled = false;
        timeSelect.innerHTML = '<option value="">Select a time</option>';
        availableSlots.forEach(function(slot) {
            var option = document.createElement('option');
            option.value = slot;
            option.textContent = formatTime(slot);
            timeSelect.appendChild(option);
        });

        if (availableSlots.length === 0 && allSlots.length > 0) {
            timeSelect.innerHTML = '<option value="">No times available — all slots booked</option>';
        }
    }

    /**
     * Handle booking submit using settings-driven duration/slot validation
     */
    async function handleBookingSubmit(e) {
        e.preventDefault();

        if (isSubmitting) return;

        var form = document.getElementById('booking-form');
        var message = document.getElementById('booking-message');
        var submitButton = form ? form.querySelector('button[type="submit"]') : null;

        if (!form || !message) return;

        var name = (document.querySelector('input[name="name"]') || {}).value || '';
        var email = (document.querySelector('input[name="email"]') || {}).value || '';
        var phone = (document.querySelector('input[name="phone"]') || {}).value || '';
        var service = (document.querySelector('select[name="service"]') || {}).value || '';
        var dateValue = (document.querySelector('input[name="date"]') || {}).value || '';
        var timeValue = (document.querySelector('select[name="time"]') || {}).value || '';
        var notes = (document.querySelector('textarea[name="notes"]') || {}).value || '';

        if (!name || !email || !phone || !service || !dateValue || !timeValue) {
            message.textContent = 'Please complete all required fields.';
            return;
        }

        var totalDuration = getServiceDuration(service) + getAddonDuration();
        var validSlots = getAvailableSlots(dateValue, totalDuration);
        if (validSlots.indexOf(timeValue) === -1) {
            message.textContent = 'That time is no longer available. Please choose another slot.';
            return;
        }

        var startMinutes = timeToMinutes(timeValue);
        var endMinutes = startMinutes + totalDuration;
        var localEndTime = minutesToTime(endMinutes);
        var addons = getSelectedAddonNames();
        var submissionId = generateSubmissionId();
        lastSubmissionId = submissionId;

        var priceResult = calculateTotal(service, timeValue);
        var payload = {
            name: name,
            email: email,
            phone: phone,
            service: service,
            addons: addons,
            notes: notes,
            timeZone: BOOKING_TIME_ZONE,
            localDate: dateValue,
            localStartTime: timeValue,
            localEndTime: localEndTime,
            totalPrice: priceResult.total,
            eveningSurcharge: priceResult.hasEveningSurcharge,
            submissionId: submissionId
        };

        isSubmitting = true;
        if (submitButton) submitButton.disabled = true;
        message.textContent = 'Submitting...';

        try {
            var res = await fetch(SUBMIT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            var result = await parseBookingResponse(res);
            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Booking request failed.');
            }

            lastSubmissionId = null;
            message.textContent = result.message || 'Done.';

            form.reset();
            var timeSelect = document.getElementById('booking-time');
            if (timeSelect) {
                timeSelect.innerHTML = '<option value="">Select a time</option>';
            }
            document.querySelectorAll('.addon-tile').forEach(function(tile) {
                tile.classList.remove('is-selected');
            });
        } catch (err) {
            var errMsg = err && err.message ? err.message : 'Something went wrong.';
            if (errMsg.indexOf('invalid response') !== -1 || errMsg.indexOf('empty response') !== -1) {
                message.textContent = 'Your booking may have been submitted. Please check your email for confirmation before trying again.';
            } else {
                message.textContent = errMsg;
            }
        } finally {
            isSubmitting = false;
            if (submitButton) submitButton.disabled = false;
        }
    }

    /**
     * Initialize booking form listeners
     */
    function initBooking() {
        var dateInput = document.getElementById('booking-date');
        var serviceSelect = document.getElementById('service');
        var checkboxes = document.querySelectorAll('input[type="checkbox"][name^="addon_"]');
        var form = document.getElementById('booking-form');

        // Update time slots when date changes
        if (dateInput) {
            dateInput.addEventListener('change', function() { updateTimeSlots(); });
        }

        // Update time slots and total when service changes
        if (serviceSelect) {
            serviceSelect.addEventListener('change', function() {
                updateTimeSlots();
                updateTotalDisplay();
            });
        }

        // Update time slots and total when add-ons change
        checkboxes.forEach(function(checkbox) {
            syncAddonTile(checkbox);
            checkbox.addEventListener('change', function() {
                syncAddonTile(checkbox);
                updateTimeSlots();
                updateTotalDisplay();
            });
        });

        // Update total when time changes (evening surcharge may apply)
        var timeSelect = document.getElementById('booking-time');
        if (timeSelect) {
            timeSelect.addEventListener('change', updateTotalDisplay);
        }

        if (form) {
            form.addEventListener('submit', handleBookingSubmit);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBooking);
    } else {
        initBooking();
    }
})();
</script>
</div></div></div><div class="ed-element ed-reference ed-reference-container wv-boxed wv-spacer footer-saga-content footer preset-footer-saga-v3-default" id="ed-2185333224" data-reference="2184795474"><footer class="inner" id="footer-2"><div class="ed-element ed-container footer-saga-box wv-overflow_visible" id="ed-2184795477"><div class="inner"><figure class="ed-element ed-image" id="ed-2185390581"><img src="data:image/svg+xml,%3Csvg%20width='600'%20viewBox='0%200%20600%20327'%20xmlns='http://www.w3.org/2000/svg'%3E%3Crect%20width='600'%20height='327'%20style='fill:%20%23F7F7F7'%20/%3E%3C/svg%3E" alt="" data-src="/images/600/24030183/9d08b3e8-793f-4d9b-ae86-035d8255b726_removalai_preview-vTTnUuxSusQWKZn5VRH1bA.png" class="ed-lazyload" style="object-fit: cover;"></figure><div class="ed-element ed-text custom-theme description" id="ed-2184795486"><ul data-start="6068" data-end="6175"><li data-section-id="1il1kmn" data-start="6127" data-end="6175"><p data-start="6129" data-end="6175"><strong data-start="6129" data-end="6175">Built for sharp cuts </strong></p></li><li data-section-id="1il1kmn" data-start="6127" data-end="6175"><p data-start="6129" data-end="6175"><strong data-start="6129" data-end="6175">and sharper presence.</strong></p></li></ul><p data-start="6177" data-end="6209"></p></div></div></div><div class="ed-element ed-container footer-saga-box" id="ed-2184795516"><div class="inner"><div class="ed-element ed-headline custom-theme" id="ed-2184795519"><h3>Social media</h3></div><div class="ed-element ed-spacer" id="ed-2184795522"><div style="height: 16px;" class="space"></div></div><figure class="ed-element ed-icon" id="ed-2184795525"><a href="#!next" class="wv-link-elm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -416 448 448" data-icon="fa-brands-facebook-square" preserveAspectRatio="xMidYMid" style="overflow: hidden;"><path d="M448 -368V-16C448 10.5 426.5 32 400 32H314.7V-145.2H375.3L384 -212.8H314.7V-256C314.7 -275.6 320.1 -288.9 348.2 -288.9H384V-349.3C377.8 -350.1 356.6 -352 331.8 -352C280.2 -352 244.8 -320.5 244.8 -262.6V-212.7H184V-145.1H244.9V32H48C21.5 32 0 10.5 0 -16V-368C0 -394.5 21.5 -416 48 -416H400C426.5 -416 448 -394.5 448 -368z"></path></svg></a></figure><div class="ed-element ed-text custom-theme" id="ed-2184795528"><p><a href="https://www.facebook.com/" rel="noopener noreferrer" target="_blank" title="">Facebook</a></p></div><figure class="ed-element ed-icon" id="ed-2184795531"><a href="#!next" class="wv-link-elm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-icon="fa-brands-x-twitter" preserveAspectRatio="xMidYMid" style="overflow: hidden;"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path></svg></a></figure><div class="ed-element ed-text custom-theme" id="ed-2184795534"><p>X</p></div><figure class="ed-element ed-icon" id="ed-2184795537"><a href="#!next" class="wv-link-elm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -384 384 384" data-icon="ion-social-instagram" preserveAspectRatio="xMidYMid" style="overflow: hidden;"><path d="M112 -192c0 -53 27 -80 80 -80s80 27 80 80s-27 80 -80 80s-80 -27 -80 -80zM113 -271c-14 14 -23 29 -28 47h-85v-112c0 -13 4 -25 14 -34s22 -14 35 -14h288c13 -0 24 5 33 14s14 21 14 34v112h-84c-5 -18 -14 -33 -28 -47c-22 -22 -49 -33 -80 -33s-57 11 -79 33zM352 -300v-39c0 -4 -2 -7 -4 -9s-5 -4 -9 -4h-38c-4 -0 -7 2 -9 4s-4 5 -4 9v39c0 4 2 7 4 9s5 3 9 3h38c4 -0 7 -1 9 -3s4 -5 4 -9zM272 -113c22 -22 32 -48 32 -79h80v144c0 13 -5 24 -14 34s-20 14 -33 14h-288c-13 -0 -24 -4 -34 -14s-15 -21 -15 -34v-144h81c0 31 10 57 32 79s48 33 79 33s58 -11 80 -33z"></path></svg></a></figure><div class="ed-element ed-text custom-theme" id="ed-2184795540"><p><a href="https://www.instagram.com/" rel="noopener noreferrer" target="_blank" title="">Instagram</a></p></div></div></div></footer></div><script src="/webcard/static/app.bundle.1773313786.js"></script><script src="/js/custom.260314202111.js"></script></body>
</html>
