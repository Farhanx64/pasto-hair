<?php

/**
 * Google Calendar configuration for availability checking.
 *
 * SETUP INSTRUCTIONS:
 * 1. In Google Calendar: Settings → your calendar → "Calendar ID" — copy the value below.
 * 2. In Google Cloud Console (console.cloud.google.com):
 *    - Enable the Google Calendar API
 *    - Create an API key restricted to "Google Calendar API"
 *    - Paste the key below
 * 3. In your Google Apps Script (booking-webapp.gs), also set calendarId to the same value.
 * 4. On your Google Calendar, ensure "Make available to public → See only free/busy" is checked.
 *
 * SECURITY: This file is server-side only. Never expose these values to the browser.
 */

define('PASTO_CALENDAR_ID', 'oppasto6@gmail.com');
define('PASTO_CALENDAR_API_KEY', 'AIzaSyAzwEMnvRxsvCk8UBW8v1M2xhOeKw7bkig');
