/**
 * Email notification module — server-only.
 * Uses the Resend SDK to send booking confirmation emails.
 *
 * When RESEND_API_KEY is not set, logs to console instead of throwing.
 * This allows the booking flow to succeed in dev environments without email configured.
 */

import { Resend } from "resend";

export interface BookingConfirmationData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  addonNames: string[];
  localDate: string;       // "YYYY-MM-DD"
  localStartTime: string;  // "HH:MM"
  localEndTime: string;    // "HH:MM"
  timeZone: string;        // e.g. "America/New_York"
  totalPrice: number;
  hasEveningSurcharge: boolean;
  eveningSurchargeAmount?: number;
  notes?: string;
}

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

function buildEmailHtml(data: BookingConfirmationData): string {
  const {
    customerName,
    serviceName,
    addonNames,
    localDate,
    localStartTime,
    localEndTime,
    timeZone,
    totalPrice,
    hasEveningSurcharge,
    eveningSurchargeAmount,
  } = data;

  const formattedDate = formatDate(localDate);
  const addonList =
    addonNames.length > 0
      ? `<li><strong>Add-ons:</strong> ${addonNames.join(", ")}</li>`
      : "";
  const surchargeNote = hasEveningSurcharge
    ? `<p style="color:#888;font-size:13px;">* Includes $${eveningSurchargeAmount ?? 10} evening surcharge (appointments starting at or after 8:00 PM).</p>`
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
        <td style="padding:8px 0;font-weight:bold;">${serviceName}</td>
      </tr>
      ${
        addonNames.length > 0
          ? `<tr>
        <td style="padding:8px 0;color:#555;">Add-ons</td>
        <td style="padding:8px 0;">${addonNames.join(", ")}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding:8px 0;color:#555;">Date</td>
        <td style="padding:8px 0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Time</td>
        <td style="padding:8px 0;">${localStartTime} – ${localEndTime} (${timeZone})</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Total</td>
        <td style="padding:8px 0;font-weight:bold;">$${totalPrice}</td>
      </tr>
    </tbody>
  </table>

  ${surchargeNote}
  ${addonList ? `<ul>${addonList}</ul>` : ""}

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="color:#555;">
    Need to reschedule or have questions? Contact us and we'll take care of you.
  </p>
  <p style="color:#888;font-size:12px;">
    This is an automated confirmation from Pasto Hair. Please do not reply to this email.
  </p>
</body>
</html>
`.trim();
}

function buildEmailText(data: BookingConfirmationData): string {
  const {
    customerName,
    serviceName,
    addonNames,
    localDate,
    localStartTime,
    localEndTime,
    timeZone,
    totalPrice,
    hasEveningSurcharge,
    eveningSurchargeAmount,
  } = data;

  const formattedDate = formatDate(localDate);
  const addonLine =
    addonNames.length > 0 ? `Add-ons: ${addonNames.join(", ")}\n` : "";
  const surchargeLine = hasEveningSurcharge
    ? `* Includes $${eveningSurchargeAmount ?? 10} evening surcharge.\n`
    : "";

  return [
    `Appointment Confirmed — Pasto Hair`,
    ``,
    `Hi ${customerName}, your appointment is confirmed.`,
    ``,
    `Service: ${serviceName}`,
    addonLine.trimEnd(),
    `Date: ${formattedDate}`,
    `Time: ${localStartTime} – ${localEndTime} (${timeZone})`,
    `Total: $${totalPrice}`,
    surchargeLine.trimEnd(),
    ``,
    `Need to reschedule? Contact us and we'll take care of you.`,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();
}

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
      service: booking.serviceName,
      date: booking.localDate,
      time: `${booking.localStartTime}–${booking.localEndTime}`,
      total: booking.totalPrice,
    });
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Pasto Hair <noreply@pastohair.com>",
    to: booking.customerEmail,
    subject: `Appointment Confirmed — ${booking.serviceName} on ${formatDate(booking.localDate)}`,
    html: buildEmailHtml(booking),
    text: buildEmailText(booking),
  });
}
