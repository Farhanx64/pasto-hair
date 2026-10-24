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
  /** "HH:MM" start of the evening tier that applied. Omitted → no time shown. */
  eveningSurchargeStart?: string;
  /** Promo code that applied. Omitted → no promo line shown. */
  promoCode?: string;
  promoDiscountAmount?: number;
  notes?: string;
  calendarEventId?: string;
  business?: BusinessInfo;
  /** Random token behind the customer's cancel link. Omitted → no link shown. */
  cancelToken?: string;
  /** Service + addon ids (not names) for the "Book again" deep link. Omitted → no link shown. */
  serviceId?: string;
  addonIds?: string[];
}

export interface CancellationNoticeData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  localDate: string;
  localStartTime: string;
  localEndTime: string;
  totalPrice: number;
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
  destructive: "#f87171", // --color-destructive
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

/**
 * Deep link back into the booking form with service/addons/contact info
 * prefilled, so a repeat customer only has to pick a new date and time.
 * Same trust boundary as the rest of this email: it's the customer's own
 * PII sent back to their own inbox, and it only prefills a form — nothing
 * is written until they submit, matching the site's own POST-only-mutates rule.
 */
function buildRebookUrl(data: BookingConfirmationData): string | undefined {
  if (!data.serviceId) return undefined;
  const params = new URLSearchParams({
    service: data.serviceId,
    name: data.customerName,
    email: data.customerEmail,
    phone: data.customerPhone,
  });
  if (data.addonIds && data.addonIds.length > 0) {
    params.set("addons", data.addonIds.join(","));
  }
  return `${SITE}/booking?${params.toString()}`;
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
// Gmail's iPhone app ignores color-scheme and, in dark mode, flips the
// lightness of every color (hue kept), so this dark email turned bright.
// Fix, checked on a phone with a color-swatch test email (2026-10-24):
// - Gmail never touches background *images*, so every background is painted
//   with a one-color gradient as well (grad()).
// - White/gray text is wrapped in gmailBlend(): two blend layers (screen,
//   then difference) that flip it back (hteumeuleu.com, "Fixing Gmail's dark
//   mode issues with CSS Blend Modes"). They'd turn colored text into its
//   opposite hue (purple -> green), so colored text is NOT wrapped and uses
//   mid-lightness shades (GM) that look about the same flipped or not.
// - Images aren't wrapped (the layers would invert them).
// The \`u + .body\` selector only matches inside Gmail; other apps ignore it.
// Opt-in per email (gmailDarkFix) — the body must build itself that way.
const GMAIL_DARK_CSS = `
    u + .body .gmail-blend-screen { background:#000; mix-blend-mode:screen; }
    u + .body .gmail-blend-difference { background:#000; mix-blend-mode:difference; }`;

function layout(opts: {
  title: string;
  preheader: string;
  body: string;
  footerNote?: string;
  gmailDarkFix?: boolean;
}): string {
  const fix = opts.gmailDarkFix === true;
  const canvasBg = fix
    ? `background-color:${C.bgDeep};background-image:linear-gradient(${C.bgDeep},${C.bgDeep});`
    : `background-color:${C.bgDeep};`;
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
    }${fix ? GMAIL_DARK_CSS : ""}
  </style>
</head>
<body class="body" style="margin:0;padding:0;${canvasBg}">
  <div style="display:none;font-size:1px;color:${C.bgDeep};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(opts.preheader)}</div>
  <!-- preheader spacer: stops clients pulling body copy into the preview line -->
  <div style="display:none;font-size:1px;color:${C.bgDeep};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.bgDeep}" style="${canvasBg}">
    <tr>
      <td align="center" style="padding:32px 12px;${fix ? canvasBg : ""}">
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="margin:0 auto;width:600px;max-width:600px;${fix ? grad(C.bg) : `background-color:${C.bg};`}border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
${opts.body}
        </table>

        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="margin:0 auto;width:600px;max-width:600px;">
          <tr>
            <td align="center" style="padding:24px 24px 8px;font-family:${FONT_BODY};font-size:11px;line-height:18px;color:${C.muted};letter-spacing:0.04em;">
              ${blendIf(fix, "Made w Joy &nbsp;·&nbsp; pasto.hair &nbsp;·&nbsp; by Farhan")}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 24px;font-family:${FONT_BODY};font-size:11px;line-height:18px;color:#5a5f68;">
              ${blendIf(fix, opts.footerNote ?? "Automated message — please don&rsquo;t reply to this address.")}
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
const grad = (c: string) => `background-color:${c};background-image:linear-gradient(${c},${c});`;

/** Wraps one block in the Gmail flip-back layers (no-op outside Gmail). */
function gmailBlend(html: string): string {
  return `<div class="gmail-blend-screen"><div class="gmail-blend-difference">${html}</div></div>`;
}

const blendIf = (on: boolean, html: string) => (on ? gmailBlend(html) : html);

// Colored text for gmailDarkFix emails: mid-lightness, so Gmail's flip barely
// changes them (picked from a swatch test on a phone).
const GM = { accent: "#9d6bf7", champagne: "#b89a66" };

function headerRow(): string {
  return `          <tr>
            <td align="center" class="px" style="padding:36px 40px 0;">
              <img src="${SITE}/logo.png" alt="Pasto Hair" width="132" style="width:132px;max-width:132px;height:auto;display:block;border:0;" />
            </td>
          </tr>`;
}

/** Hairline rule. A 1px table row is the only divider every client renders. */
function rule(gmailDarkFix = false): string {
  const bg = gmailDarkFix ? grad(C.border) : `background-color:${C.border};`;
  return `              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td height="1" bgcolor="${C.border}" style="height:1px;line-height:1px;font-size:0;${bg}">&nbsp;</td></tr>
              </table>`;
}

/** A label/value line inside the detail panel. */
function detailRow(label: string, value: string, opts?: { accent?: boolean }): string {
  const color = opts?.accent ? C.champagne : C.fg;
  const weight = opts?.accent ? "600" : "500";
  return `                <tr>
                  <td class="stack" width="38%" style="padding:9px 0;font-family:${FONT_BODY};font-size:12px;line-height:18px;color:${C.muted};letter-spacing:0.06em;text-transform:uppercase;vertical-align:top;">${label}</td>
                  <td class="stack" style="padding:9px 0;font-family:${FONT_BODY};font-size:15px;line-height:22px;color:${color};font-weight:${weight};vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">${value}</td>
                </tr>`;
}

/** "$10" / "$10.50" — whole dollars stay unadorned, cents always show two digits. */
function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/** "SAVE10 (−$5)". Plain text — esc() it before putting it in HTML. */
function promoLabel(code?: string, amount?: number): string {
  return code ? `${code} (−${money(amount ?? 0)})` : "";
}

/** Address / phone block, rendered only when BusinessSettings supplies them. */
function businessRows(b?: BusinessInfo, gmailDarkFix = false): string {
  const w = (html: string) => blendIf(gmailDarkFix, html);
  const linkColor = gmailDarkFix ? GM.accent : C.accent;
  if (!b || (!b.address && !b.phone)) return "";

  const mapHref = b.address
    ? `https://maps.google.com/?q=${encodeURIComponent(b.address)}`
    : "";

  const addr = b.address
    ? `              ${w(`<div style="font-family:${FONT_BODY};font-size:15px;line-height:23px;color:${C.fg};font-weight:500;">${esc(b.address)}</div>`)}
              <div style="padding-top:8px;"><a href="${mapHref}" style="font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${linkColor};font-weight:600;letter-spacing:0.03em;">Get directions &rsaquo;</a></div>`
    : "";

  const tel = b.phone
    ? `              <div style="padding-top:${b.address ? "14" : "0"}px;">${w(`<div style="font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${C.muted};">
                Questions? <a href="tel:${encodeURI(b.phone)}" style="color:${C.fg};font-weight:600;">${esc(b.phone)}</a>
              </div>`)}</div>`
    : "";

  return `          <tr>
            <td class="px" style="padding:28px 40px 0;">
              <div style="padding-bottom:10px;">${w(`<div style="font-family:${FONT_BODY};font-size:11px;line-height:16px;color:${C.muted};letter-spacing:0.1em;text-transform:uppercase;">Where</div>`)}</div>
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
    eveningSurchargeStart,
    promoCode,
    promoDiscountAmount,
    business,
    cancelToken,
  } = data;

  const serviceLine = addons.length > 0
    ? `${esc(service)} <span style="color:${C.muted};">+</span> ${esc(addons.join(", "))}`
    : esc(service);

  // Plain text link, not a button: cancelling should feel like a quiet exit,
  // not a call to action competing with the confirmation itself.
  const cancelBlock = cancelToken
    ? `          <tr>
            <td class="px" style="padding:10px 40px 36px;">
              <a href="${SITE}/cancel/${encodeURIComponent(cancelToken)}" style="font-family:${FONT_BODY};font-size:12px;line-height:19px;color:${C.destructive};font-weight:600;">Cancel this appointment</a>
            </td>
          </tr>`
    : "";

  const rebookUrl = buildRebookUrl(data);
  const rebookBlock = rebookUrl
    ? `          <tr>
            <td class="px" style="padding:10px 40px 0;">
              <a href="${rebookUrl}" style="font-family:${FONT_BODY};font-size:12px;line-height:19px;color:${C.accent};font-weight:600;">Book this again next time &rsaquo;</a>
            </td>
          </tr>`
    : "";

  const surchargeNote = hasEveningSurcharge
    ? `                <tr>
                  <td colspan="2" style="padding:4px 0 0;font-family:${FONT_BODY};font-size:12px;line-height:18px;color:${C.muted};">
                    Includes a ${money(eveningSurchargeAmount)} evening surcharge${eveningSurchargeStart ? ` (${formatTime(eveningSurchargeStart)} or later)` : ""}.
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
              <div style="padding-top:6px;font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${C.muted};">${esc(durationLabel(localStartTime, localEndTime))}</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:30px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.elevated}" style="background-color:${C.elevated};border:1px solid ${C.border};border-radius:10px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${detailRow("Service", serviceLine)}
${promoCode ? detailRow("Promo", esc(promoLabel(promoCode, promoDiscountAmount))) : ""}
${detailRow("Total", `${money(totalPrice)}`, { accent: true })}
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
            <td class="px" style="padding:22px 40px 0;">
              <div style="font-family:${FONT_BODY};font-size:14px;line-height:22px;color:${C.fg};">
                See you then,
              </div>
              <div style="padding-top:4px;font-family:${FONT_HEAD};font-size:17px;line-height:24px;color:${C.champagne};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                Pasto
              </div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:24px 40px ${cancelToken ? "0" : "36px"};">
              <div style="font-family:${FONT_BODY};font-size:12px;line-height:19px;color:${C.muted};">
                Need to reschedule? Just reach out &mdash; we&rsquo;ll sort it.
              </div>
            </td>
          </tr>
${rebookBlock}
${cancelBlock}`;

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
    eveningSurchargeStart,
    promoCode,
    promoDiscountAmount,
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
    ...(promoCode ? [`Promo:   ${promoLabel(promoCode, promoDiscountAmount)}`] : []),
    `Total:   ${money(totalPrice)}`,
  ];

  if (hasEveningSurcharge) {
    lines.push(`         (includes ${money(eveningSurchargeAmount)} evening surcharge${eveningSurchargeStart ? `, ${formatTime(eveningSurchargeStart)} or later` : ""})`);
  }

  if (business?.address) {
    lines.push("", "WHERE", business.address);
  }
  if (business?.phone) {
    lines.push(`Questions? ${business.phone}`);
  }

  lines.push(
    "",
    "See you then,",
    "Pasto",
    "",
    "Need to reschedule? Just reach out — we'll sort it.",
  );

  const rebookUrl = buildRebookUrl(data);
  if (rebookUrl) {
    lines.push("", `Book this again next time: ${rebookUrl}`);
  }

  if (data.cancelToken) {
    lines.push(
      "",
      `Cancel this appointment: ${SITE}/cancel/${encodeURIComponent(data.cancelToken)}`,
    );
  }

  lines.push(
    "",
    "Made w Joy · pasto.hair · by Farhan",
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
    promoCode,
    promoDiscountAmount,
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
${promoCode ? detailRow("Promo", esc(promoLabel(promoCode, promoDiscountAmount))) : ""}
${detailRow("Total", `${money(totalPrice)}${hasEveningSurcharge ? ` <span style="font-size:12px;font-weight:400;color:${C.muted};">incl. ${money(eveningSurchargeAmount)} evening</span>` : ""}`, { accent: true })}
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
    preheader: `${customerName} — ${service}, ${formatDateShort(localDate)} at ${formatTime(localStartTime)}. ${money(totalPrice)}.`,
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
    promoCode,
    promoDiscountAmount,
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
    ...(promoCode ? [`Promo:   ${promoLabel(promoCode, promoDiscountAmount)}`] : []),
    `Total:   ${money(totalPrice)}${hasEveningSurcharge ? ` (incl. ${money(eveningSurchargeAmount)} evening surcharge)` : ""}`,
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
// Cancellation notice (owner)
// ---------------------------------------------------------------------------

export function buildCancellationHtml(data: CancellationNoticeData): string {
  const { customerName, customerEmail, customerPhone, service, localDate, localStartTime, localEndTime } = data;

  const body = `          <tr>
            <td class="px" style="padding:34px 40px 0;">
              <div style="font-family:${FONT_HEAD};font-size:12px;line-height:16px;color:${C.destructive};letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">Booking Cancelled</div>
              <div class="hero" style="padding-top:10px;font-family:${FONT_HEAD};font-size:32px;line-height:38px;color:${C.fg};font-weight:600;letter-spacing:0.02em;mso-line-height-rule:exactly;text-decoration:line-through;text-decoration-color:${C.destructive};">${esc(formatDateShort(localDate))}</div>
              <div style="padding-top:8px;font-family:${FONT_BODY};font-size:16px;line-height:24px;color:${C.muted};font-weight:500;">${esc(formatTimeRange(localStartTime, localEndTime))} &mdash; this slot is open again.</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:26px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.elevated}" style="background-color:${C.elevated};border:1px solid ${C.border};border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${detailRow("Customer", esc(customerName))}
${detailRow("Service", esc(service))}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:22px 40px 0;">
              <div style="font-family:${FONT_BODY};font-size:15px;line-height:24px;">
                <a href="tel:${encodeURI(customerPhone)}" style="color:${C.fg};font-weight:600;">${esc(customerPhone)}</a>
                <span style="color:${C.border};">&nbsp;|&nbsp;</span>
                <a href="mailto:${encodeURI(customerEmail)}" style="color:${C.accent};font-weight:600;">${esc(customerEmail)}</a>
              </div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:22px 40px 36px;">
              <div style="font-family:${FONT_BODY};font-size:12px;line-height:19px;color:${C.muted};">
                Cancelled by the customer via the link in their confirmation. The calendar event has been removed.
              </div>
            </td>
          </tr>`;

  return layout({
    title: "Booking Cancelled — Pasto Hair",
    preheader: `${customerName} cancelled — ${formatDateShort(localDate)} at ${formatTime(localStartTime)} is open again.`,
    body,
  });
}

function buildCancellationText(data: CancellationNoticeData): string {
  const { customerName, customerEmail, customerPhone, service, localDate, localStartTime, localEndTime } = data;
  return [
    "BOOKING CANCELLED — PASTO HAIR",
    "",
    `${formatDate(localDate)} · ${formatTimeRange(localStartTime, localEndTime)}`,
    "This slot is open again.",
    "",
    `Customer: ${customerName}`,
    `Service:  ${service}`,
    `Phone:    ${customerPhone}`,
    `Email:    ${customerEmail}`,
    "",
    "Cancelled by the customer via the link in their confirmation.",
    "The calendar event has been removed.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Account sign-in link (customer)
// ---------------------------------------------------------------------------

/**
 * The token rides in the URL fragment, not the query string: fragments are
 * never sent to the server, so the token stays out of access logs and out of
 * any Referer header. The landing page reads it client-side and only spends it
 * on an explicit click (see app/(frontend)/account/verify).
 */
export function buildSignInUrl(token: string): string {
  return `${SITE}/account/verify#token=${encodeURIComponent(token)}`;
}

export function buildSignInHtml(url: string): string {
  const body = `${headerRow()}

          <tr>
            <td align="center" class="px" style="padding:30px 40px 0;">
              <div style="font-family:${FONT_HEAD};font-size:12px;line-height:16px;color:${C.accent};letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">Your Account</div>
            </td>
          </tr>

          <tr>
            <td align="center" class="px" style="padding:14px 40px 0;">
              <div class="hero" style="font-family:${FONT_HEAD};font-size:34px;line-height:40px;color:${C.champagne};font-weight:600;letter-spacing:0.02em;mso-line-height-rule:exactly;">Sign in to Pasto Hair</div>
              <div style="padding-top:12px;font-family:${FONT_BODY};font-size:14px;line-height:22px;color:${C.muted};">
                Tap the button below to sign in. The link works once and expires in 15 minutes.
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" class="px" style="padding:28px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${C.accent}" style="background-color:${C.accent};border-radius:999px;">
                    <a href="${esc(url)}" style="display:inline-block;padding:14px 34px;font-family:${FONT_BODY};font-size:14px;line-height:20px;color:${C.bg};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Sign in</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:30px 40px 0;">
${rule()}
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:20px 40px 36px;">
              <div style="font-family:${FONT_BODY};font-size:12px;line-height:19px;color:${C.muted};">
                Didn&rsquo;t ask for this? You can ignore it &mdash; nobody can sign in without this email.
              </div>
            </td>
          </tr>`;

  return layout({
    title: "Sign in — Pasto Hair",
    preheader: "Your sign-in link for Pasto Hair. It works once and expires in 15 minutes.",
    body,
  });
}

export function buildSignInText(url: string): string {
  return [
    "SIGN IN TO PASTO HAIR",
    "",
    "Open this link to sign in. It works once and expires in 15 minutes:",
    url,
    "",
    "Didn't ask for this? You can ignore it — nobody can sign in without this email.",
    "",
    "Made w Joy · pasto.hair · by Farhan",
    "Automated message — please don't reply to this address.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Promo announcement (sent by scripts/send-promo-email.ts, not by the site)
// ---------------------------------------------------------------------------

export interface PromoAnnouncementCode {
  code: string;
  label: string; // "10% off" / "$5 off"
  limit?: string; // "First 10 bookings only" — shown under the label
}

// Promotional, not transactional: the footer says why they got it and how to
// opt out — the recipient's own signed link, or a reply (replies reach the owner).
function promoFooter(unsubscribeUrl?: string): string {
  const optOut = unsubscribeUrl
    ? `<a href="${esc(unsubscribeUrl)}" style="color:#8a8f98;text-decoration:underline;">Unsubscribe</a> or reply &ldquo;unsubscribe&rdquo;.`
    : "Reply &ldquo;unsubscribe&rdquo; and we&rsquo;ll take you off the list.";
  return `You&rsquo;re getting this because you&rsquo;ve booked with Pasto Hair. Don&rsquo;t want offers like this? ${optOut}`;
}

export interface PromoRecipient {
  firstName?: string | null; // "Hi Pasto!" — falls back to "Hi there!"
  unsubscribeUrl?: string;
}

/** "Hi Pasto!" / "Hi there!" */
export function promoGreeting(firstName?: string | null): string {
  return `Hi ${firstName?.trim() || "there"}!`;
}

export function buildPromoAnnouncementHtml(
  codes: PromoAnnouncementCode[],
  business?: BusinessInfo,
  recipient: PromoRecipient = {},
): string {
  const { unsubscribeUrl } = recipient;
  // Built for gmailDarkFix: gradient backgrounds, white/gray text in
  // gmailBlend(), colored text unwrapped in GM shades (see layout()).
  const w = gmailBlend;
  const codeRows = codes
    .map(
      (c) => `                <tr>
                  <td style="padding:14px 18px;border-top:1px solid ${C.border};font-family:${FONT_HEAD};font-size:18px;line-height:24px;color:${GM.champagne};font-weight:600;letter-spacing:0.06em;word-break:break-all;overflow-wrap:anywhere;">${esc(c.code)}</td>
                  <td align="right" style="padding:14px 18px;border-top:1px solid ${C.border};vertical-align:middle;">
                    <div style="font-family:${FONT_BODY};font-size:14px;line-height:22px;color:${GM.accent};font-weight:700;white-space:nowrap;">${esc(c.label)}</div>${c.limit ? `
                    ${w(`<div style="font-family:${FONT_BODY};font-size:11px;line-height:15px;color:${C.muted};white-space:nowrap;">${esc(c.limit)}</div>`)}` : ""}
                  </td>
                </tr>`,
    )
    .join("\n");

  const body = `${headerRow()}

          <tr>
            <td align="center" class="px" style="padding:30px 40px 0;">
              <div style="font-family:${FONT_HEAD};font-size:12px;line-height:16px;color:${GM.accent};letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">Limited chairs</div>
            </td>
          </tr>

          <tr>
            <td align="center" class="px" style="padding:14px 40px 0;">
              <div class="hero" style="font-family:${FONT_HEAD};font-size:34px;line-height:40px;color:${GM.champagne};font-weight:600;letter-spacing:0.02em;mso-line-height-rule:exactly;">Slots are filling up</div>
              <div style="padding-top:16px;">${w(`<div style="font-family:${FONT_BODY};font-size:16px;line-height:24px;color:${C.fg};font-weight:600;">${esc(promoGreeting(recipient.firstName))}</div>`)}</div>
              <div style="padding-top:6px;">${w(`<div style="font-family:${FONT_BODY};font-size:14px;line-height:22px;color:${C.muted};">
                The calendar is getting packed. Lock in your next cut before the good times are gone &mdash; and take one of these codes with you.
              </div>`)}</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:26px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.elevated}" style="${grad(C.elevated)}border:1px solid ${C.border};border-radius:10px;border-collapse:separate !important;">
                <tr>
                  <td colspan="2" style="padding:14px 18px 10px;">${w(`<div style="font-family:${FONT_BODY};font-size:11px;line-height:16px;color:${C.muted};letter-spacing:0.1em;text-transform:uppercase;">Your promo codes</div>`)}</td>
                </tr>
${codeRows}
              </table>
              <div style="padding-top:10px;">${w(`<div style="font-family:${FONT_BODY};font-size:12px;line-height:19px;color:${C.muted};">
                Enter a code on the last step of booking. One code per booking; it comes off your services, not the evening rate.
              </div>`)}</div>
            </td>
          </tr>

          <tr>
            <td align="center" class="px" style="padding:28px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${C.accent}" style="${grad(C.accent)}border-radius:999px;">
                    <a href="${SITE}/booking" style="display:inline-block;padding:14px 34px;font-family:${FONT_BODY};font-size:14px;line-height:20px;color:${C.bg};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Book your slot</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:30px 40px 0;">
${rule(true)}
            </td>
          </tr>
${businessRows(business, true)}
          <tr><td style="height:36px;line-height:36px;font-size:0;">&nbsp;</td></tr>`;

  return layout({
    title: "Slots are filling up — Pasto Hair",
    preheader: `${promoGreeting(recipient.firstName)} Book before the calendar fills — ${codes.map((c) => `${c.code} for ${c.label}`).join(", ")}.`,
    body,
    footerNote: promoFooter(unsubscribeUrl),
    gmailDarkFix: true,
  });
}

export function buildPromoAnnouncementText(
  codes: PromoAnnouncementCode[],
  business?: BusinessInfo,
  recipient: PromoRecipient = {},
): string {
  const { unsubscribeUrl } = recipient;
  return [
    "SLOTS ARE FILLING UP — PASTO HAIR",
    "",
    promoGreeting(recipient.firstName),
    "",
    "The calendar is getting packed. Lock in your next cut before the good times are gone, and take one of these codes with you:",
    "",
    ...codes.map((c) => `  ${c.code} — ${c.label}${c.limit ? ` (${c.limit.toLowerCase()})` : ""}`),
    "",
    "Enter a code on the last step of booking. One code per booking; it comes off your services, not the evening rate.",
    "",
    `Book: ${SITE}/booking`,
    ...(business?.address ? ["", business.address] : []),
    ...(business?.phone ? [business.phone] : []),
    "",
    "You're getting this because you've booked with Pasto Hair. Don't want offers like this? Reply \"unsubscribe\" and we'll take you off the list.",
    ...(unsubscribeUrl ? [`Or unsubscribe here: ${unsubscribeUrl}`] : []),
    "",
    "Made w Joy · pasto.hair · by Farhan",
  ].join("\n");
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

/** Tells the owner a slot just freed up. Owner-only — the customer already knows. */
export async function sendCancellationNotice(
  data: CancellationNoticeData,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const ownerEmail = process.env.OWNER_EMAIL ?? from;

  if (!apiKey || !from || !ownerEmail) {
    console.log(
      "[notifications] RESEND_API_KEY or EMAIL_FROM not configured. Would have sent cancellation notice for:",
      `${data.customerName} — ${data.service} on ${data.localDate}`,
    );
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: ownerEmail,
    replyTo: data.customerEmail,
    subject: `Cancelled: ${data.customerName} — ${formatDateShort(data.localDate)} ${formatTime(data.localStartTime)}`,
    html: buildCancellationHtml(data),
    text: buildCancellationText(data),
  });
}

/** Emails a customer their single-use sign-in link. */
export async function sendSignInLinkEmail(to: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const url = buildSignInUrl(token);

  if (!apiKey || !from) {
    // The link is a credential: only ever print it in local dev, so a
    // misconfigured production server can't leak sign-ins into its logs.
    if (process.env.NODE_ENV !== "production") {
      console.log("[notifications] Email not configured. Dev sign-in link for", to, "→", url);
    } else {
      console.log("[notifications] RESEND_API_KEY or EMAIL_FROM not configured. Sign-in link not sent.");
    }
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: "Your Pasto Hair sign-in link",
    html: buildSignInHtml(url),
    text: buildSignInText(url),
  });
}
