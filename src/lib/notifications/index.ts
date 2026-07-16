/**
 * Email notification module — server-only.
 * Uses the Resend SDK to send booking confirmation emails.
 *
 * When RESEND_API_KEY or EMAIL_FROM is not set, logs to console instead of
 * throwing, so the booking flow still completes in dev.
 *
 * ---------------------------------------------------------------------------
 * Email HTML is not web HTML. Constraints these templates work within:
 *   - Tables for layout. Outlook renders through Word; flex/grid do not exist.
 *   - Inline styles. Several clients strip <style> blocks entirely.
 *   - Solid hex only. rgba()/opacity is unreliable in Outlook, so the brand's
 *     translucent surfaces are composited to flat equivalents below.
 *   - Web fonts load in Apple Mail and a few others; Gmail strips the <link>.
 *     The stacks below degrade to Arial Narrow / Helvetica deliberately —
 *     Arial Narrow is the closest widely-installed match for Oswald.
 *   - Every user-supplied value goes through esc(). This is a public form.
 * ---------------------------------------------------------------------------
 */

import "server-only";

import { Resend } from "resend";

export interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

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
  business?: BusinessInfo;
}

// ---------------------------------------------------------------------------
// Brand tokens — mirrors design-system/pasto-hair/MASTER.md
// ---------------------------------------------------------------------------

const C = {
  bgDeep: "#050506",   // outer canvas
  bg: "#0a0a0c",       // card
  elevated: "#0f0f12", // inset panel
  border: "#1e1e21",   // flat equivalent of rgba(255,255,255,0.08) over #0a0a0c
  fg: "#ededed",
  muted: "#8a8f98",
  accent: "#bb86fc",
  champagne: "#e8dcc4",
};

const FONT_HEAD = "'Oswald','Arial Narrow',Helvetica,Arial,sans-serif";
const FONT_BODY = "'Montserrat','Helvetica Neue',Helvetica,Arial,sans-serif";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pasto.hair";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a user-supplied value for interpolation into email HTML.
 * customerName / notes / phone reach these templates straight from the public
 * booking request, so they must never be trusted as markup.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

/** "Thursday, July 16" — no year; a booking is never far enough out to need it. */
function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
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

function durationLabel(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

/**
 * Wrap body rows in the full email document.
 * `preheader` is the grey preview line clients show next to the subject —
 * without it they scrape the first visible text, which reads like debris.
 */
function layout(opts: { title: string; preheader: string; body: string }): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${esc(opts.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <!--[if mso]>
  <style>* { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <style>
    body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    @media screen and (max-width:600px) {
      .px { padding-left:24px !important; padding-right:24px !important; }
      .hero { font-size:30px !important; line-height:36px !important; }
      .stack { display:block !important; width:100% !important; text-align:left !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bgDeep};">
  <div style="display:none;font-size:1px;color:${C.bgDeep};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(opts.preheader)}</div>
  <!-- preheader spacer: stops clients pulling body copy into the preview line -->
  <div style="display:none;font-size:1px;color:${C.bgDeep};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.bgDeep}" style="background-color:${C.bgDeep};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${C.bg};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
${opts.body}
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td align="center" style="padding:24px 24px 8px;font-family:${FONT_BODY};font-size:11px;line-height:18px;color:${C.muted};letter-spacing:0.04em;">
              PASTO HAIR &nbsp;·&nbsp; NEW YORK
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 24px;font-family:${FONT_BODY};font-size:11px;line-height:18px;color:#5a5f68;">
              Automated message — please don&rsquo;t reply to this address.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Logo lockup row. */
function headerRow(): string {
  return `          <tr>
            <td align="center" class="px" style="padding:36px 40px 0;">
              <img src="${SITE}/logo.png" alt="Pasto Hair" width="132" style="width:132px;max-width:132px;height:auto;display:block;border:0;" />
            </td>
          </tr>`;
}

/** Hairline rule. A 1px table row is the only divider every client renders. */
function rule(): string {
  return `              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td height="1" bgcolor="${C.border}" style="height:1px;line-height:1px;font-size:0;background-color:${C.border};">&nbsp;</td></tr>
              </table>`;
}

/** A label/value line inside the detail panel. */
function detailRow(label: string, value: string, opts?: { accent?: boolean }): string {
  const color = opts?.accent ? C.champagne : C.fg;
  const weight = opts?.accent ? "600" : "500";
  return `                <tr>
                  <td class="stack" width="38%" style="padding:9px 0;font-family:${FONT_BODY};font-size:12px;line-height:18px;color:${C.muted};letter-spacing:0.06em;text-transform:uppercase;vertical-align:top;">${label}</td>
                  <td class="stack" style="padding:9px 0;font-family:${FONT_BODY};font-size:15px;line-height:22px;color:${color};font-weight:${weight};vertical-align:top;">${value}</td>
                </tr>`;
}

/** Address / phone block, rendered only when BusinessSettings supplies them. */
function businessRows(b?: BusinessInfo): string {
  if (!b || (!b.address && !b.phone)) return "";

  const mapHref = b.address
    ? `https://maps.google.com/?q=${encodeURIComponent(b.address)}`
    : "";

  const addr = b.address
    ? `              <div style="font-family:${FONT_BODY};font-size:15px;line-height:23px;color:${C.fg};font-weight:500;">${esc(b.address)}</div>
              <div style="padding-top:8px;"><a href="${mapHref}" style="font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${C.accent};font-weight:600;letter-spacing:0.03em;">Get directions &rsaquo;</a></div>`
    : "";

  const tel = b.phone
    ? `              <div style="padding-top:${b.address ? "14" : "0"}px;font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${C.muted};">
                Questions? <a href="tel:${encodeURI(b.phone)}" style="color:${C.fg};font-weight:600;">${esc(b.phone)}</a>
              </div>`
    : "";

  return `          <tr>
            <td class="px" style="padding:28px 40px 0;">
              <div style="font-family:${FONT_BODY};font-size:11px;line-height:16px;color:${C.muted};letter-spacing:0.1em;text-transform:uppercase;padding-bottom:10px;">Where</div>
${addr}
${tel}
            </td>
          </tr>`;
}

// ---------------------------------------------------------------------------
// Customer confirmation
// ---------------------------------------------------------------------------

export function buildCustomerHtml(data: BookingConfirmationData): string {
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
    business,
  } = data;

  const firstName = customerName.trim().split(/\s+/)[0] || customerName;

  const serviceLine = addons.length > 0
    ? `${esc(service)} <span style="color:${C.muted};">+</span> ${esc(addons.join(", "))}`
    : esc(service);

  const surchargeNote = hasEveningSurcharge
    ? `                <tr>
                  <td colspan="2" style="padding:4px 0 0;font-family:${FONT_BODY};font-size:12px;line-height:18px;color:${C.muted};">
                    Includes a $${eveningSurchargeAmount} evening surcharge (8:00 PM or later).
                  </td>
                </tr>`
    : "";

  const body = `${headerRow()}

          <tr>
            <td align="center" class="px" style="padding:30px 40px 0;">
              <div style="font-family:${FONT_HEAD};font-size:12px;line-height:16px;color:${C.accent};letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">Appointment Confirmed</div>
            </td>
          </tr>

          <tr>
            <td align="center" class="px" style="padding:14px 40px 0;">
              <div class="hero" style="font-family:${FONT_HEAD};font-size:38px;line-height:44px;color:${C.champagne};font-weight:600;letter-spacing:0.02em;mso-line-height-rule:exactly;">${esc(formatDateShort(localDate))}</div>
              <div style="padding-top:8px;font-family:${FONT_BODY};font-size:19px;line-height:26px;color:${C.fg};font-weight:600;letter-spacing:0.02em;">${esc(formatTimeRange(localStartTime, localEndTime))}</div>
              <div style="padding-top:6px;font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${C.muted};">${esc(durationLabel(localStartTime, localEndTime))} &nbsp;·&nbsp; See you then, ${esc(firstName)}.</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:30px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.elevated}" style="background-color:${C.elevated};border:1px solid ${C.border};border-radius:10px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${detailRow("Service", serviceLine)}
${detailRow("Total", `$${totalPrice}`, { accent: true })}
${surchargeNote}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

${businessRows(business)}

          <tr>
            <td class="px" style="padding:30px 40px 0;">
${rule()}
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:22px 40px 36px;">
              <div style="font-family:${FONT_BODY};font-size:13px;line-height:21px;color:${C.muted};">
                Need to reschedule or cancel? Just reach out &mdash; we&rsquo;ll sort it.
              </div>
            </td>
          </tr>`;

  return layout({
    title: "Appointment Confirmed — Pasto Hair",
    preheader: `${formatDateShort(localDate)} at ${formatTime(localStartTime)} — ${service}. See you then.`,
    body,
  });
}

export function buildCustomerText(data: BookingConfirmationData): string {
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
    business,
  } = data;

  const lines = [
    "APPOINTMENT CONFIRMED — PASTO HAIR",
    "",
    `${formatDate(localDate)}`,
    `${formatTimeRange(localStartTime, localEndTime)}  (${durationLabel(localStartTime, localEndTime)})`,
    "",
    `Hi ${customerName}, you're booked in.`,
    "",
    `Service: ${service}${addons.length > 0 ? ` + ${addons.join(", ")}` : ""}`,
    `Total:   $${totalPrice}`,
  ];

  if (hasEveningSurcharge) {
    lines.push(`         (includes $${eveningSurchargeAmount} evening surcharge, 8:00 PM or later)`);
  }

  if (business?.address) {
    lines.push("", "WHERE", business.address);
  }
  if (business?.phone) {
    lines.push(`Questions? ${business.phone}`);
  }

  lines.push(
    "",
    "Need to reschedule or cancel? Just reach out — we'll sort it.",
    "",
    "Pasto Hair · New York",
    "Automated message — please don't reply to this address.",
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Owner notification — optimised for scanning on a phone, not for beauty
// ---------------------------------------------------------------------------

export function buildOwnerHtml(data: BookingConfirmationData): string {
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
  } = data;

  const serviceLine = addons.length > 0
    ? `${esc(service)} <span style="color:${C.muted};">+</span> ${esc(addons.join(", "))}`
    : esc(service);

  const notesBlock = notes
    ? `          <tr>
            <td class="px" style="padding:22px 40px 0;">
              <div style="font-family:${FONT_BODY};font-size:11px;line-height:16px;color:${C.muted};letter-spacing:0.1em;text-transform:uppercase;padding-bottom:8px;">Notes from customer</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.elevated}" style="background-color:${C.elevated};border-left:2px solid ${C.accent};border-radius:4px;">
                <tr><td style="padding:14px 16px;font-family:${FONT_BODY};font-size:14px;line-height:22px;color:${C.fg};">${esc(notes)}</td></tr>
              </table>
            </td>
          </tr>`
    : "";

  const body = `          <tr>
            <td class="px" style="padding:34px 40px 0;">
              <div style="font-family:${FONT_HEAD};font-size:12px;line-height:16px;color:${C.accent};letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">New Booking</div>
              <div class="hero" style="padding-top:10px;font-family:${FONT_HEAD};font-size:32px;line-height:38px;color:${C.champagne};font-weight:600;letter-spacing:0.02em;mso-line-height-rule:exactly;">${esc(customerName)}</div>
              <div style="padding-top:8px;font-family:${FONT_BODY};font-size:16px;line-height:24px;color:${C.fg};font-weight:600;">${esc(formatDateShort(localDate))} &nbsp;·&nbsp; ${esc(formatTimeRange(localStartTime, localEndTime))}</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:26px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.elevated}" style="background-color:${C.elevated};border:1px solid ${C.border};border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${detailRow("Service", serviceLine)}
${detailRow("Duration", esc(durationLabel(localStartTime, localEndTime)))}
${detailRow("Total", `$${totalPrice}${hasEveningSurcharge ? ` <span style="font-size:12px;font-weight:400;color:${C.muted};">incl. $${eveningSurchargeAmount} evening</span>` : ""}`, { accent: true })}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:22px 40px 0;">
              <div style="font-family:${FONT_BODY};font-size:11px;line-height:16px;color:${C.muted};letter-spacing:0.1em;text-transform:uppercase;padding-bottom:10px;">Contact</div>
              <div style="font-family:${FONT_BODY};font-size:15px;line-height:24px;">
                <a href="tel:${encodeURI(customerPhone)}" style="color:${C.fg};font-weight:600;">${esc(customerPhone)}</a>
                <span style="color:${C.border};">&nbsp;|&nbsp;</span>
                <a href="mailto:${encodeURI(customerEmail)}" style="color:${C.accent};font-weight:600;">${esc(customerEmail)}</a>
              </div>
            </td>
          </tr>

${notesBlock}

          <tr><td style="padding:0 0 34px;">&nbsp;</td></tr>`;

  return layout({
    title: "New Booking — Pasto Hair",
    preheader: `${customerName} — ${service}, ${formatDateShort(localDate)} at ${formatTime(localStartTime)}. $${totalPrice}.`,
    body,
  });
}

export function buildOwnerText(data: BookingConfirmationData): string {
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

  const lines = [
    "NEW BOOKING — PASTO HAIR",
    "",
    `${customerName}`,
    `${formatDate(localDate)} · ${formatTimeRange(localStartTime, localEndTime)} (${durationLabel(localStartTime, localEndTime)})`,
    "",
    `Service: ${service}${addons.length > 0 ? ` + ${addons.join(", ")}` : ""}`,
    `Total:   $${totalPrice}${hasEveningSurcharge ? ` (incl. $${eveningSurchargeAmount} evening surcharge)` : ""}`,
    "",
    "CONTACT",
    `Phone: ${customerPhone}`,
    `Email: ${customerEmail}`,
  ];

  if (notes) {
    lines.push("", "NOTES FROM CUSTOMER", notes);
  }
  if (calendarEventId) {
    lines.push("", `Calendar event: ${calendarEventId}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendConfirmationEmail(
  booking: BookingConfirmationData,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    // Dev mode stub — log instead of throwing
    console.log(
      "[notifications] RESEND_API_KEY or EMAIL_FROM not configured. Would have sent confirmation email to:",
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

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: booking.customerEmail,
    subject: `You're booked in — ${formatDateShort(booking.localDate)} at ${formatTime(booking.localStartTime)}`,
    html: buildCustomerHtml(booking),
    text: buildCustomerText(booking),
  });
}

export async function sendOwnerNotification(
  booking: BookingConfirmationData,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  // Alerts must reach an inbox a human actually reads. EMAIL_FROM has to sit on
  // the Resend-verified sending domain, which in practice is a no-reply address
  // — so it is the wrong destination. OWNER_EMAIL can be any mailbox (gmail is
  // fine: it is a recipient, never a sender). Falls back to EMAIL_FROM so an
  // unset OWNER_EMAIL keeps the old behaviour rather than dropping the alert.
  const ownerEmail = process.env.OWNER_EMAIL ?? from;

  if (!apiKey || !from || !ownerEmail) {
    console.log(
      "[notifications] RESEND_API_KEY or EMAIL_FROM not configured. Would have sent owner notification for:",
      `${booking.customerName} — ${booking.service} on ${booking.localDate}`,
    );
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: ownerEmail,
    replyTo: booking.customerEmail,
    subject: `New booking: ${booking.customerName} — ${formatDateShort(booking.localDate)} ${formatTime(booking.localStartTime)}`,
    html: buildOwnerHtml(booking),
    text: buildOwnerText(booking),
  });
}
