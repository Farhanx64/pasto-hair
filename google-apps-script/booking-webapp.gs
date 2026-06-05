const CONFIG = {
  /**
   * Calendar ID to be used for accessing Google Calendar events.
   * 
   * To find your Calendar ID:
   * 1. Go to Google Calendar (https://calendar.google.com)
   * 2. On the left sidebar, find the calendar you want to use
   * 3. Hover over it and click the three-dot menu
   * 4. Select "Settings"
   * 5. Scroll down to the "Integrate calendar" section
   * 6. Copy the Calendar ID (usually in format: abc123def456@group.calendar.google.com)
   * 7. Replace 'REPLACE_WITH_YOUR_CALENDAR_ID' with your actual Calendar ID
   * 
   * @type {string}
   */
  calendarId: 'oppasto6@gmail.com',
  businessName: 'Pasto Hair',
  timeZone: 'America/New_York',
  allowGuestInvites: true,
  sendConfirmationEmail: true
};

function doGet() {
  return jsonResponse_({
    success: true,
    message: 'Booking script is live.'
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    if (CONFIG.calendarId === 'REPLACE_WITH_YOUR_CALENDAR_ID') {
      throw new Error('Set CONFIG.calendarId before deploying the script.');
    }

    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);
    if (!calendar) {
      throw new Error('Calendar not found. Check CONFIG.calendarId.');
    }

    const start = resolveDate_(payload.start, payload.localDate, payload.localStartTime);
    const end = resolveDate_(payload.end, payload.localDate, payload.localEndTime);

    if (end <= start) {
      throw new Error('End time must be after start time.');
    }

    // Check idempotency: if this submissionId was already processed, return success
    if (payload.submissionId) {
      const existingEvent = findEventBySubmissionId_(calendar, start, end, payload.submissionId);
      if (existingEvent) {
        return jsonResponse_({
          success: true,
          message: 'Appointment booked successfully. Check your email for confirmation.',
          eventId: existingEvent.getId()
        });
      }
    }

    if (hasConflict_(calendar, start, end)) {
      return jsonResponse_({
        success: false,
        message: 'That time is no longer available. Please choose another slot.'
      });
    }

    const serviceLabel = buildServiceLabel_(payload.service, payload.addons);
    const title = serviceLabel + ' - ' + payload.name;
    const description = buildDescription_(payload, start, end);
    const options = {
      description: description
    };

    if (CONFIG.allowGuestInvites && payload.email) {
      options.guests = payload.email;
      options.sendInvites = true;
    }

    const event = calendar.createEvent(title, start, end, options);
    event.setTag('source', 'website-booking-form');
    event.setTag('service', payload.service);
    event.setTag('time_zone', payload.timeZone || CONFIG.timeZone);

    if (payload.phone) {
      event.setTag('phone', payload.phone);
    }

    if (payload.addons.length) {
      event.setTag('addons', payload.addons.join(', '));
    }

    if (payload.submissionId) {
      event.setTag('submissionId', payload.submissionId);
    }

    if (CONFIG.sendConfirmationEmail && payload.email) {
      sendConfirmationEmail_(payload, start, end, serviceLabel);
    }

    return jsonResponse_({
      success: true,
      message: 'Appointment booked successfully. Check your email for confirmation.',
      eventId: event.getId()
    });
  } catch (error) {
    return jsonResponse_({
      success: false,
      message: error && error.message ? error.message : 'Something went wrong while creating the booking.'
    });
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.');
  }

  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('Request body must be valid JSON.');
  }

  return {
    name: cleanString_(data.name),
    email: cleanString_(data.email),
    phone: cleanString_(data.phone),
    service: cleanString_(data.service),
    addons: Array.isArray(data.addons) ? data.addons.map(cleanString_).filter(Boolean) : [],
    notes: cleanString_(data.notes),
    timeZone: cleanString_(data.timeZone) || CONFIG.timeZone,
    localDate: cleanString_(data.localDate),
    localStartTime: cleanString_(data.localStartTime),
    localEndTime: cleanString_(data.localEndTime),
    start: cleanString_(data.start),
    end: cleanString_(data.end),
    submissionId: cleanString_(data.submissionId),
    totalPrice: (typeof data.totalPrice === 'number') ? data.totalPrice : null,
    eveningSurcharge: (data.eveningSurcharge === true)
  };
}

function validatePayload_(payload) {
  if (!payload.name) throw new Error('Name is required.');
  if (!payload.email) throw new Error('Email is required.');
  if (!payload.phone) throw new Error('Phone is required.');
  if (!payload.service) throw new Error('Service is required.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.email)) {
    throw new Error('Email address is invalid.');
  }
}

function resolveDate_(isoValue, localDate, localTime) {
  // Prefer local date/time interpreted in the business timezone.
  // This avoids errors when the browser's UTC conversion used the wrong local timezone.
  if (localDate && localTime) {
    try {
      const localStr = localDate + ' ' + localTime;
      const parsed = Utilities.parseDate(localStr, CONFIG.timeZone, 'yyyy-MM-dd HH:mm');
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (e) {
      // fall through to ISO fallback
    }
  }

  // Fallback: use the ISO timestamp sent by the client
  if (isoValue) {
    const isoDate = new Date(isoValue);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  throw new Error('Invalid booking date/time.');
}

function findEventBySubmissionId_(calendar, start, end, submissionId) {
  // Search a 24-hour window around the booking to find duplicate submissions
  const searchStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const searchEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  const events = calendar.getEvents(searchStart, searchEnd);
  for (let i = 0; i < events.length; i += 1) {
    if (events[i].getTag('submissionId') === submissionId) {
      return events[i];
    }
  }
  return null;
}

function hasConflict_(calendar, start, end) {
  const events = calendar.getEvents(start, end);
  for (let i = 0; i < events.length; i += 1) {
    if (!events[i].isAllDayEvent()) {
      return true;
    }
  }
  return false;
}

function buildServiceLabel_(service, addons) {
  if (!addons || !addons.length) {
    return service;
  }

  return service + ' + ' + addons.join(' + ');
}

function buildDescription_(payload, start, end) {
  return [
    'Booking created from website form',
    '',
    'Name: ' + payload.name,
    'Email: ' + payload.email,
    'Phone: ' + payload.phone,
    'Service: ' + payload.service,
    'Add-ons: ' + (payload.addons.length ? payload.addons.join(', ') : 'None'),
    'Local Date: ' + (payload.localDate || 'Not provided'),
    'Local Start: ' + (payload.localStartTime || 'Not provided'),
    'Local End: ' + (payload.localEndTime || 'Not provided'),
    'Time Zone: ' + (payload.timeZone || CONFIG.timeZone),
    'Calendar Start: ' + formatDate_(start),
    'Calendar End: ' + formatDate_(end),
    'Notes: ' + (payload.notes || 'None'),
    payload.totalPrice !== null ? 'Total: $' + payload.totalPrice + (payload.eveningSurcharge ? ' (includes $10 evening rate)' : '') : ''
  ].filter(Boolean).join('\n');
}

function sendConfirmationEmail_(payload, start, end, serviceLabel) {
  const subject = CONFIG.businessName + ' booking confirmed';
  const body = [
    'Hi ' + payload.name + ',',
    '',
    'Your appointment has been booked.',
    '',
    'Service: ' + serviceLabel,
    'Date: ' + (payload.localDate || formatDateOnly_(start)),
    'Start: ' + (payload.localStartTime || formatTimeOnly_(start)),
    'End: ' + (payload.localEndTime || formatTimeOnly_(end)),
    'Time Zone: ' + (payload.timeZone || CONFIG.timeZone),
    payload.totalPrice !== null ? 'Total: $' + payload.totalPrice + (payload.eveningSurcharge ? ' (includes $10 evening rate)' : '') : '',
    '',
    'If you need to make changes, please contact us.',
    '',
    CONFIG.businessName
  ].join('\n');

  MailApp.sendEmail({
    to: payload.email,
    subject: subject,
    body: body
  });
}

function formatDate_(date) {
  return Utilities.formatDate(date, CONFIG.timeZone, 'yyyy-MM-dd HH:mm');
}

function formatDateOnly_(date) {
  return Utilities.formatDate(date, CONFIG.timeZone, 'yyyy-MM-dd');
}

function formatTimeOnly_(date) {
  return Utilities.formatDate(date, CONFIG.timeZone, 'HH:mm');
}

function cleanString_(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
