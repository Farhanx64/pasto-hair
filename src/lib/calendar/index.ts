/**
 * Google Calendar integration — server-only module.
 * Never import this from client components or pages marked "use client".
 *
 * Credentials are read from env vars:
 *   GOOGLE_CALENDAR_CLIENT_EMAIL
 *   GOOGLE_CALENDAR_PRIVATE_KEY
 *   GOOGLE_CALENDAR_ID
 *
 * When any credential is missing, getBusyBlocks returns [] and
 * findEventBySubmissionId returns null. createCalendarEvent throws
 * "Google Calendar is not configured" so the caller can decide whether
 * to treat that as fatal or non-fatal.
 */

import "server-only";

import { google } from "googleapis";
import type { BusyBlock } from "../booking/types";

const TIMEZONE = "America/New_York";

function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_EMAIL &&
      process.env.GOOGLE_CALENDAR_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID,
  );
}

export function getCalendarClient() {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL ?? "";
  const privateKey = (process.env.GOOGLE_CALENDAR_PRIVATE_KEY ?? "").replace(
    /\\n/g,
    "\n",
  );

  if (!clientEmail) {
    throw new Error(
      "Google Calendar is not configured: GOOGLE_CALENDAR_CLIENT_EMAIL is empty",
    );
  }
  if (!privateKey) {
    throw new Error(
      "Google Calendar is not configured: GOOGLE_CALENDAR_PRIVATE_KEY is empty",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

/**
 * Convert a NY local date + time string to a UTC ISO 8601 string.
 *
 * Strategy: treat the local date+time as UTC temporarily to probe, then
 * compare what NY thinks that UTC moment is vs what we want, and shift
 * by the difference. This correctly handles EST (-5) and EDT (-4) offsets.
 */
export function nyLocalToISO(localDate: string, localTime: string): string {
  // Probe: interpret the local date+time as if it were UTC
  const probeISO = `${localDate}T${localTime}:00.000Z`;
  const probe = new Date(probeISO);

  // Get what NY thinks this UTC moment is
  const nyRepr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(probe);

  // en-CA format: "YYYY-MM-DD, HH:mm:ss"
  const [, timePart] = nyRepr.split(", ");
  const [hStr, mStr] = timePart.split(":");
  const probeH = Number(hStr);
  const probeM = Number(mStr);

  const [targetH, targetM] = localTime.split(":").map(Number);

  // diffMinutes: how many minutes to add to probe to reach the target local time in NY
  const diffMinutes = (targetH * 60 + targetM) - (probeH * 60 + probeM);

  const result = new Date(probe.getTime() + diffMinutes * 60 * 1000);
  return result.toISOString();
}

/**
 * Build { startISO, endISO } UTC strings from NY local date + times.
 */
export function buildEventTimes(
  localDate: string,
  localStartTime: string,
  localEndTime: string,
): { startISO: string; endISO: string } {
  return {
    startISO: nyLocalToISO(localDate, localStartTime),
    endISO: nyLocalToISO(localDate, localEndTime),
  };
}

/**
 * Convert an ISO timestamp string to "HH:MM" in America/New_York local time.
 */
function isoToNYTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Get all busy blocks for a given calendar on a given date.
 * Returns an array of { start, end } in "HH:MM" America/New_York local time.
 * Returns [] if Google Calendar is not configured or on any error.
 */
export async function getBusyBlocks(
  calendarId: string,
  dateStr: string,
): Promise<BusyBlock[]> {
  if (!isConfigured()) {
    return [];
  }

  try {
    const calendar = getCalendarClient();

    // Build full-day window boundaries in NY local time, converted to UTC
    const timeMin = nyLocalToISO(dateStr, "00:00");
    const timeMax = nyLocalToISO(dateStr, "23:59");

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: TIMEZONE,
        items: [{ id: calendarId }],
      },
    });

    const busyIntervals =
      response.data.calendars?.[calendarId]?.busy ?? [];

    const blocks: BusyBlock[] = busyIntervals.map((interval) => ({
      start: isoToNYTime(interval.start ?? ""),
      end: isoToNYTime(interval.end ?? ""),
    }));

    return blocks;
  } catch (err) {
    console.error("[calendar] getBusyBlocks error (returning empty):", err);
    return [];
  }
}

export interface CreateEventInput {
  calendarId: string;
  title?: string;
  description?: string;
  startISO: string;
  endISO: string;
  guestEmail?: string;
  submissionId: string;
  service: string;
  phone: string;
  addons: string[];
}

/**
 * Create a Google Calendar event for a booking.
 * Throws "Google Calendar is not configured" if credentials are missing.
 * Returns the created event ID.
 */
export async function createCalendarEvent(
  input: CreateEventInput,
): Promise<string> {
  if (!isConfigured()) {
    throw new Error("Google Calendar is not configured");
  }

  const {
    calendarId,
    title,
    description,
    startISO,
    endISO,
    guestEmail,
    submissionId,
    service,
    phone,
    addons,
  } = input;

  const calendar = getCalendarClient();

  const attendees = guestEmail
    ? [{ email: guestEmail }]
    : undefined;

  const response = await calendar.events.insert({
    calendarId,
    sendUpdates: guestEmail ? "all" : "none",
    requestBody: {
      summary: title ?? `Booking — ${service}`,
      description: description ?? "",
      start: {
        dateTime: startISO,
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endISO,
        timeZone: TIMEZONE,
      },
      attendees,
      extendedProperties: {
        private: {
          submissionId,
          service,
          phone,
          addons: addons.join(","),
        },
      },
    },
  });

  const eventId = response.data.id;
  if (!eventId) {
    throw new Error("Calendar event created but no ID returned");
  }

  return eventId;
}

/**
 * Search for an existing calendar event that has the given submissionId
 * in its extendedProperties.private.submissionId tag.
 * Searches a ±24h window around the given date.
 * Returns the eventId string or null if not found.
 */
export async function findEventBySubmissionId(
  calendarId: string,
  submissionId: string,
  dateStr: string,
): Promise<string | null> {
  if (!isConfigured()) {
    return null;
  }

  try {
    const calendar = getCalendarClient();

    // Search ±24 hours around the date
    const centerDate = new Date(`${dateStr}T12:00:00Z`);
    const timeMin = new Date(centerDate.getTime() - 24 * 60 * 60 * 1000);
    const timeMax = new Date(centerDate.getTime() + 24 * 60 * 60 * 1000);

    const listResponse = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      privateExtendedProperty: [`submissionId=${submissionId}`],
      singleEvents: true,
    });

    const events = listResponse.data.items ?? [];
    if (events.length > 0 && events[0]?.id) {
      return events[0].id;
    }

    return null;
  } catch (err) {
    console.error("[calendar] findEventBySubmissionId error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Legacy interface kept for backward compatibility with app/api/bookings/route.ts
// ---------------------------------------------------------------------------

export interface CalendarEventInput {
  calendarId: string;
  dateStr: string;          // "YYYY-MM-DD"
  startTime: string;        // "HH:MM" NY local
  endTime: string;          // "HH:MM" NY local
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  addonNames: string[];
  totalPrice: number;
  submissionId: string;
  notes?: string;
}

/**
 * Convenience wrapper used by app/api/bookings/route.ts.
 * Converts legacy CalendarEventInput → CreateEventInput and delegates.
 */
export async function createCalendarEventFromLegacy(
  input: CalendarEventInput,
): Promise<string> {
  const {
    calendarId,
    dateStr,
    startTime,
    endTime,
    customerName,
    customerEmail,
    customerPhone,
    serviceName,
    addonNames,
    totalPrice,
    submissionId,
    notes,
  } = input;

  const { startISO, endISO } = buildEventTimes(dateStr, startTime, endTime);

  const addonText =
    addonNames.length > 0 ? `\nAdd-ons: ${addonNames.join(", ")}` : "";
  const notesText = notes ? `\nNotes: ${notes}` : "";

  const description = [
    `Service: ${serviceName}${addonText}`,
    `Total: $${totalPrice}`,
    `Phone: ${customerPhone}`,
    `Email: ${customerEmail}`,
    `Submission ID: ${submissionId}`,
    notesText,
  ]
    .filter(Boolean)
    .join("\n");

  return createCalendarEvent({
    calendarId,
    title: `Haircut — ${customerName}`,
    description,
    startISO,
    endISO,
    guestEmail: customerEmail,
    submissionId,
    service: serviceName,
    phone: customerPhone,
    addons: addonNames,
  });
}
