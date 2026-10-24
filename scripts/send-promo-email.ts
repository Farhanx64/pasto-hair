/**
 * One-off promo announcement to past clients ("slots are filling up" + codes).
 *
 * Run on the server through the wrapper, which loads .env and the node venv:
 *
 *   scripts/promo-email.sh count     CODE1 CODE2   # who would get it — sends nothing
 *   scripts/promo-email.sh test  you@example.com CODE1 CODE2   # one copy, to you
 *   scripts/promo-email.sh send-all  CODE1 CODE2   # every past client
 *
 * Sends from MARKETING_EMAIL_FROM — a separate subdomain (e.g. news.pasto.hair)
 * verified in Resend — so spam complaints on promos can't drag down the
 * booking emails' domain reputation. Only `test` may fall back to EMAIL_FROM.
 *
 * Recipients are the distinct emails on bookings plus signed-up customers,
 * minus everyone on the "Unsubscribed emails" list in the admin. Each email
 * carries that person's own unsubscribe link (and List-Unsubscribe headers,
 * so mail apps show their one-click unsubscribe button).
 * Each person gets their own email (never a shared To/CC list). Codes are read
 * from the admin and must be valid right now, so the email can't advertise a
 * code that won't work at checkout.
 */

import { getPayload } from "payload";
import { Resend } from "resend";

import config from "../payload.config";
import { firstNameOf } from "../src/lib/marketing/names";
import { unsubscribeOneClickUrl, unsubscribePageUrl } from "../src/lib/marketing/unsubscribe";
import { checkPromoCode, describePromo, normalizePromoCode } from "../src/lib/booking/promo";
import {
  buildGmailSwatchHtml,
  buildPromoAnnouncementHtml,
  buildPromoAnnouncementText,
  type PromoAnnouncementCode,
} from "../src/lib/notifications";

const SUBJECT = "Slots are filling up — book your chair";
// Resend's default limit is 2 requests/second; stay under it.
const SEND_GAP_MS = 600;

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const [mode, ...rest] = process.argv.slice(2);

// Temporary: `swatch you@example.com` sends the Gmail dark-mode color test.
if (mode === "swatch") {
  const to = rest[0];
  if (!to?.includes("@")) fail("swatch needs an email address.");
  const from = process.env.MARKETING_EMAIL_FROM || process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) fail("RESEND_API_KEY / MARKETING_EMAIL_FROM missing from .env.");
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from,
    to,
    subject: "[TEST] Gmail dark mode colors",
    html: buildGmailSwatchHtml(),
  });
  if (error) fail(`Swatch failed: ${error.message}`);
  console.log(`\nSwatch sent to ${to}.\n`);
  process.exit(0);
}
if (mode !== "count" && mode !== "test" && mode !== "send-all") {
  fail("Usage: promo-email.sh count|send-all CODE... | test you@example.com CODE...");
}
const testTo = mode === "test" ? rest.shift() : undefined;
if (mode === "test" && !testTo?.includes("@")) fail("test needs an email address first.");
const codeArgs = rest.map(normalizePromoCode).filter(Boolean);
if (codeArgs.length === 0) fail("Name at least one promo code.");

const payload = await getPayload({ config });

// --- codes: must exist and be usable today --------------------------------
const codes: PromoAnnouncementCode[] = [];
for (const code of codeArgs) {
  const found = await payload.find({
    collection: "promo-codes",
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
  });
  const check = checkPromoCode(found.docs[0], new Date());
  if (!check.valid) fail(`${code}: ${check.message} Fix it in the admin first.`);
  const maxUses = found.docs[0]?.maxUses;
  codes.push({
    code: check.promo.code,
    label: describePromo(check.promo),
    // Uses the cap from the admin, so the email always matches what checkout enforces.
    limit: maxUses ? `First ${maxUses} booking${maxUses === 1 ? "" : "s"} only` : undefined,
  });
}

// --- recipients -------------------------------------------------------------
// Also remembers a first name per email for "Hi Pasto!": the account name wins,
// else the name on their most recent booking.
const emails = new Set<string>();
const names = new Map<string, string>();
const bookings = await payload.find({ collection: "bookings", limit: 0, pagination: false, depth: 0, sort: "createdAt" });
for (const b of bookings.docs) {
  if (!b.customerEmail) continue;
  const email = b.customerEmail.trim().toLowerCase();
  emails.add(email);
  const name = firstNameOf(b.customerName);
  if (name) names.set(email, name); // ascending, so the latest booking wins
}
const customers = await payload.find({ collection: "customers", limit: 0, pagination: false, depth: 0 });
for (const c of customers.docs) {
  if (!c.email) continue;
  const email = c.email.trim().toLowerCase();
  emails.add(email);
  const name = firstNameOf(c.name);
  if (name) names.set(email, name);
}
const optOuts = await payload.find({ collection: "email-opt-outs", limit: 0, pagination: false, depth: 0 });
const unsubscribed = new Set(optOuts.docs.map((o) => o.email.trim().toLowerCase()));
const valid = [...emails].filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
const recipients = valid.filter((e) => !unsubscribed.has(e)).sort();

console.log(`\nCodes: ${codes.map((c) => `${c.code} (${c.label})`).join(", ")}`);
console.log(`Past clients: ${recipients.length} (${recipients.filter((e) => names.has(e)).length} greeted by name)`);
if (valid.length > recipients.length) console.log(`Skipped ${valid.length - recipients.length} unsubscribed.`);

if (mode === "count") {
  console.log("\nNothing sent (count mode).\n");
  process.exit(0);
}

// --- send -------------------------------------------------------------------
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) fail("RESEND_API_KEY missing from .env.");
const marketingFrom = process.env.MARKETING_EMAIL_FROM;
if (!marketingFrom && mode !== "test") {
  fail("MARKETING_EMAIL_FROM missing from .env — promos must not go out from the booking address.");
}
const from = marketingFrom || process.env.EMAIL_FROM;
if (!from) fail("MARKETING_EMAIL_FROM (or EMAIL_FROM for a test) missing from .env.");
if (!marketingFrom) console.log("Note: MARKETING_EMAIL_FROM not set — this test goes out from the booking address.");
console.log(`From: ${from}`);
const replyTo = process.env.OWNER_EMAIL || undefined; // "reply unsubscribe" reaches the owner

const settings = await payload.findGlobal({ slug: "business-settings" });
const business = {
  name: settings.businessName ?? undefined,
  address: settings.address ?? undefined,
  phone: settings.phone ?? undefined,
  email: settings.email ?? undefined,
};
const resend = new Resend(apiKey);

const targets = mode === "test" ? [testTo!] : recipients;
let sent = 0;
const failed: string[] = [];
for (const to of targets) {
  // A test goes to the owner, greeted with the first client's name so the
  // personal line can be checked.
  const firstName = mode === "test" ? (names.get(to) ?? names.get(recipients[0]) ?? null) : (names.get(to) ?? null);
  const recipient = { firstName, unsubscribeUrl: unsubscribePageUrl(to) };
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo,
    subject: mode === "test" ? `[TEST] ${SUBJECT}` : SUBJECT,
    html: buildPromoAnnouncementHtml(codes, business, recipient),
    text: buildPromoAnnouncementText(codes, business, recipient),
    headers: {
      "List-Unsubscribe": `<${unsubscribeOneClickUrl(to)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (error) {
    failed.push(to);
    console.error(`  failed: ${to} — ${error.message}`);
  } else {
    sent += 1;
  }
  await new Promise((r) => setTimeout(r, SEND_GAP_MS));
}

console.log(`\nSent ${sent} of ${targets.length}.${failed.length ? ` Failed: ${failed.join(", ")}` : ""}\n`);
process.exit(failed.length ? 1 : 0);
