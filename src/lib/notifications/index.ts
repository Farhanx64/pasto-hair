/**
 * Email notification module — server-only.
 * Uses the Resend SDK to send booking confirmation emails.
 *
 * When RESEND_API_KEY is not set, logs to console instead of throwing.
 * This allows the booking flow to succeed in dev environments without email configured.
 */

import "server-only";

import { Resend } from "resend";

export interface BookingConfirmationData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  addons: string[];
  localDate: string;                // "YYYY-MM-DD"
  localStartTime: string;           // "HH:MM" 24h
  localEndTime: string;             // "HH:MM" 24h
  timeZone: string;                 // e.g. "America/New_York"
  totalPrice: number;
  hasEveningSurcharge: boolean;
  eveningSurchargeAmount: number;
  notes?: string;
  calendarEventId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  // Parse as local date to avoid UTC offset issues
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format "HH:MM" (24h) to "3:30 PM" */
function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)} ET`;
}

// ---------------------------------------------------------------------------
// HTML + text builders for customer confirmation
// ---------------------------------------------------------------------------

function buildCustomerHtml(data: BookingConfirmationData): string {
  const {
    customerName,
    service,
    addons,
    localDate,
    localStartTime,
    localEndTime,
    totalPrice,
    hasEveningSurcharge,
    eveningSurchargeAmount,
  } = data;

  const formattedDate = formatDate(localDate);
  const timeRange = formatTimeRange(localStartTime, localEndTime);

  const addonsRow =
    addons.length > 0
      ? `<tr>
        <td style="padding:8px 0;color:#555;">Add-ons</td>
        <td style="padding:8px 0;">${addons.join(", ")}</td>
      </tr>`
      : "";

  const surchargeNote = hasEveningSurcharge
    ? `<p style="color:#888;font-size:13px;">* Includes $${eveningSurchargeAmount} evening surcharge (appointments starting at or after 8:00 PM).</p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Appointment Confirmed — Pasto Hair</title>
</head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:24px;margin-bottom:8px;">Appointment Confirmed</h1>
  <p>Hi ${customerName}, your appointment at <strong>Pasto Hair</strong> is confirmed.</p>

  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tbody>
      <tr>
        <td style="padding:8px 0;color:#555;width:40%;">Service</td>
        <td style="padding:8px 0;font-weight:bold;">${service}</td>
      </tr>
      ${addonsRow}
      <tr>
        <td style="padding:8px 0;color:#555;">Date</td>
        <td style="padding:8px 0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Time</td>
        <td style="padding:8px 0;">${timeRange}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Total</td>
        <td style="padding:8px 0;font-weight:bold;">$${totalPrice}</td>
      </tr>
    </tbody>
  </table>

  ${surchargeNote}

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="color:#555;">
    Need to reschedule or have questions? Contact us and we&rsquo;ll take care of you.
  </p>
  <p style="color:#888;font-size:12px;">
    This is an automated confirmation from Pasto Hair. Please do not reply to this email.
  </p>
</body>
</html>
`.trim();
}

function buildCustomerText(data: BookingConfirmationData): string {
  const {
    customerName,
    service,
    addons,
    localDate,
    localStartTime,
    localEndTime,
    totalPrice,
    hasEveningSurcharge,
    eveningSurchargeAmount,
  } = data;

  const formattedDate = formatDate(localDate);
  const timeRange = formatTimeRange(localStartTime, localEndTime);
  const addonLine = addons.length > 0 ? `Add-ons: ${addons.join(", ")}\n` : "";
  const surchargeLine = hasEveningSurcharge
    ? `* Includes $${eveningSurchargeAmount} evening surcharge.\n`
    : "";

  return [
    `Appointment Confirmed — Pasto Hair`,
    ``,
    `Hi ${customerName}, your appointment is confirmed.`,
    ``,
    `Service: ${service}`,
    addonLine.trimEnd(),
    `Date: ${formattedDate}`,
    `Time: ${timeRange}`,
    `Total: $${totalPrice}`,
    surchargeLine.trimEnd(),
    ``,
    `Need to reschedule? Contact us and we'll take care of you.`,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// HTML + text builders for owner notification
// ---------------------------------------------------------------------------

function buildOwnerHtml(data: BookingConfirmationData): string {
  const {
    customerName,
    customerEmail,
    customerPhone,
    service,
    addons,
    localDate,
    localStartTime,
    localEndTime,
    totalPrice,
    hasEveningSurcharge,
    eveningSurchargeAmount,
    notes,
    calendarEventId,
  } = data;

  const formattedDate = formatDate(localDate);
  const timeRange = formatTimeRange(localStartTime, localEndTime);

  const addonsRow =
    addons.length > 0
      ? `<tr>
        <td style="padding:8px 0;color:#555;">Add-ons</td>
        <td style="padding:8px 0;">${addons.join(", ")}</td>
      </tr>`
      : "";

  const surchargeRow = hasEveningSurcharge
    ? `<tr>
        <td style="padding:8px 0;color:#555;">Surcharge</td>
        <td style="padding:8px 0;">$${eveningSurchargeAmount} (evening)</td>
      </tr>`
    : "";

  const notesRow = notes
    ? `<tr>
        <td style="padding:8px 0;color:#555;">Notes</td>
        <td style="padding:8px 0;">${notes}</td>
      </tr>`
    : "";

  const calendarRow = calendarEventId
    ? `<tr>
        <td style="padding:8px 0;color:#555;">Calendar Event</td>
        <td style="padding:8px 0;font-size:12px;word-break:break-all;">${calendarEventId}</td>
      </tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>New Booking — Pasto Hair</title>
</head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:24px;margin-bottom:8px;">New Booking</h1>
  <p>A new appointment has been booked at <strong>Pasto Hair</strong>.</p>

  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tbody>
      <tr>
        <td style="padding:8px 0;color:#555;width:40%;">Customer</td>
        <td style="padding:8px 0;font-weight:bold;">${customerName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Email</td>
        <td style="padding:8px 0;"><a href="mailto:${customerEmail}">${customerEmail}</a></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Phone</td>
        <td style="padding:8px 0;"><a href="tel:${customerPhone}">${customerPhone}</a></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Service</td>
        <td style="padding:8px 0;">${service}</td>
      </tr>
      ${addonsRow}
      <tr>
        <td style="padding:8px 0;color:#555;">Date</td>
        <td style="padding:8px 0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Time</td>
        <td style="padding:8px 0;">${timeRange}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Total</td>
        <td style="padding:8px 0;font-weight:bold;">$${totalPrice}</td>
      </tr>
      ${surchargeRow}
      ${notesRow}
      ${calendarRow}
    </tbody>
  </table>

  <p style="color:#888;font-size:12px;">
    This is an automated notification from Pasto Hair.
  </p>
</body>
</html>
`.trim();
}

function buildOwnerText(data: BookingConfirmationData): string {
  const {
    customerName,
    customerEmail,
    customerPhone,
    service,
    addons,
    localDate,
    localStartTime,
    localEndTime,
    totalPrice,
    hasEveningSurcharge,
    eveningSurchargeAmount,
    notes,
    calendarEventId,
  } = data;

  const formattedDate = formatDate(localDate);
  const timeRange = formatTimeRange(localStartTime, localEndTime);
  const addonLine = addons.length > 0 ? `Add-ons: ${addons.join(", ")}\n` : "";
  const surchargeLine = hasEveningSurcharge
    ? `Surcharge: $${eveningSurchargeAmount} (evening)\n`
    : "";
  const notesLine = notes ? `Notes: ${notes}\n` : "";
  const calendarLine = calendarEventId
    ? `Calendar Event ID: ${calendarEventId}\n`
    : "";

  return [
    `New Booking — Pasto Hair`,
    ``,
    `Customer: ${customerName}`,
    `Email: ${customerEmail}`,
    `Phone: ${customerPhone}`,
    ``,
    `Service: ${service}`,
    addonLine.trimEnd(),
    `Date: ${formattedDate}`,
    `Time: ${timeRange}`,
    `Total: $${totalPrice}`,
    surchargeLine.trimEnd(),
    notesLine.trimEnd(),
    calendarLine.trimEnd(),
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendConfirmationEmail(
  booking: BookingConfirmationData,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev mode stub — log instead of throwing
    console.log(
      "[notifications] RESEND_API_KEY not configured. Would have sent confirmation email to:",
      booking.customerEmail,
    );
    console.log("[notifications] Booking details:", {
      service: booking.service,
      date: booking.localDate,
      time: `${booking.localStartTime}–${booking.localEndTime}`,
      total: booking.totalPrice,
    });
    return;
  }

  const from = process.env.EMAIL_FROM ?? "Pasto Hair <noreply@pastohair.com>";
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: booking.customerEmail,
    subject: `Appointment Confirmed — ${booking.service} on ${formatDate(booking.localDate)}`,
    html: buildCustomerHtml(booking),
    text: buildCustomerText(booking),
  });
}

export async function sendOwnerNotification(
  booking: BookingConfirmationData,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.EMAIL_FROM;

  if (!apiKey || !ownerEmail) {
    console.log(
      "[notifications] RESEND_API_KEY or EMAIL_FROM not configured. Would have sent owner notification for:",
      `${booking.customerName} — ${booking.service} on ${booking.localDate}`,
    );
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: ownerEmail,
    to: ownerEmail,
    subject: `New booking: ${booking.customerName} — ${booking.service} on ${formatDate(booking.localDate)}`,
    html: buildOwnerHtml(booking),
    text: buildOwnerText(booking),
  });
}
