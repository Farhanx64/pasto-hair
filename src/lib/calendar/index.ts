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
 * createCalendarEvent throws "Google Calendar is not configured".
 */

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
 * Returns [] if Google Calendar is not configured.
 */
export async function getBusyBlocks(
  calendarId: string,
  dateStr: string,
): Promise<BusyBlock[]> {
  if (!isConfigured()) {
    return [];
  }

  const calendar = getCalendarClient();

  // Build full-day window in America/New_York
  // Use noon as reference to get the correct local date, then set to midnight
  // Build UTC timestamps representing the boundaries of the NY local day.
  // toLocaleString gives us the wall-clock time in NY; wrapping in Date()
  // gives the equivalent UTC instant.
  const startInNY = new Date(
    new Date(`${dateStr}T00:00:00`).toLocaleString("en-US", { timeZone: TIMEZONE }),
  );
  const endInNY = new Date(
    new Date(`${dateStr}T23:59:59`).toLocaleString("en-US", { timeZone: TIMEZONE }),
  );

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startInNY.toISOString(),
      timeMax: endInNY.toISOString(),
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
}

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
 * Create a Google Calendar event for a booking.
 * Throws "Google Calendar is not configured" if credentials are missing.
 * Returns the created event ID.
 */
export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<string> {
  if (!isConfigured()) {
    throw new Error("Google Calendar is not configured");
  }

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

  const calendar = getCalendarClient();

  const startDateTime = `${dateStr}T${startTime}:00`;
  const endDateTime = `${dateStr}T${endTime}:00`;

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

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Haircut — ${customerName}`,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTime,
        timeZone: TIMEZONE,
      },
      attendees: [{ email: customerEmail, displayName: customerName }],
      extendedProperties: {
        private: {
          submissionId,
          service: serviceName,
          phone: customerPhone,
          addons: addonNames.join(","),
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

  const calendar = getCalendarClient();

  // Search ±24 hours around the date
  const centerDate = new Date(`${dateStr}T12:00:00`);
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
}
